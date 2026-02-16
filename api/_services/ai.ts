import OpenAI from 'openai';
import { whatsapp } from './whatsapp.js';

// Support both Vite (import.meta.env) and Node.js (process.env)
const getEnv = (key: string) => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

// الإعدادات - تم توجيهها لـ OpenRouter مع دعم GPT-4o-mini
const apiKey = getEnv('VITE_OPENROUTER_API_KEY') || process.env.VITE_OPENROUTER_API_KEY || '';
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
        "HTTP-Referer": "https://smart-salon-dz.com",
        "X-Title": "Smart Salon Manager"
    }
});

// ==========================================
// 🟢 سارة (Sarah) - موظفة الاستقبال الرقمية للواتساب
// ==========================================
// الجمهور: الزبائن عبر WhatsApp فقط
// الصلاحيات: Read خدمات + أسعار + مواعيد
// القيود: ❌ أرباح، ❌ تكاليف، ❌ رواتب، ❌ لا تتكلم داخل التطبيق

interface ClientProfile {
    id: string;
    name: string;
    tier: string;
    lastVisit?: string;
    visitCount: number;
}

interface BookingContext {
    stage: 'greeting' | 'collecting_service' | 'collecting_date' | 'collecting_time' | 'collecting_name' | 'confirming' | 'completed' | 'cancelled';
    service?: string;
    serviceId?: string;
    date?: string;
    time?: string;
    staffPreference?: string;
    clientName?: string;
    lastQuestion?: string;
    missingInfo?: string[];
    availableSlots?: string[];
    services?: any[];
}

interface SmartContext {
    clientName?: string;
    tier?: string;
    lastVisit?: string;
    visitCount?: number;
    recentMessages?: Array<{ role: string; content: string }>;
    conversationStage?: string;
    topicsDiscussed?: string[];
    bookingContext: BookingContext;
}

export const sarah = {
    /**
     * Identify client from phone number
     */
    async identifyClient(phoneNumber: string): Promise<ClientProfile | null> {
        const { data: client } = await whatsapp.findClientByPhone(phoneNumber);

        if (!client) return null;

        return {
            id: client.id,
            name: `${client.first_name} ${client.last_name}`,
            tier: client.tier || 'bronze',
            lastVisit: client.last_visit,
            visitCount: client.visit_count || 0
        };
    },

    /**
     * Get or initialize booking context
     */
    async getBookingContext(phoneNumber: string, client: ClientProfile | null): Promise<BookingContext> {
        const { data: context } = await whatsapp.getBookingContext(phoneNumber);
        
        // If no context exists or it's empty, initialize it
        if (!context || Object.keys(context).length === 0) {
            const initialContext: BookingContext = {
                stage: 'greeting',
                missingInfo: []
            };
            await whatsapp.updateBookingContext(phoneNumber, initialContext);
            return initialContext;
        }

        return context as BookingContext;
    },

    /**
     * Update booking context
     */
    async updateBookingContext(phoneNumber: string, context: BookingContext): Promise<void> {
        await whatsapp.updateBookingContext(phoneNumber, context);
    },

    /**
     * Detect intent from user message
     */
    detectIntent(message: string): 'greeting' | 'booking' | 'inquiry' | 'cancellation' | 'confirmation' | 'other' {
        const lowerMsg = message.toLowerCase();
        
        if (/سلام|مرحبا|صباح|مساء|هاي|hey|hello/i.test(lowerMsg)) {
            return 'greeting';
        }
        if (/حجز|موعد|رنديڤو|booking|appointment|réservation/i.test(lowerMsg)) {
            return 'booking';
        }
        if (/ألغي|cancel|حذف|supprimer/i.test(lowerMsg)) {
            return 'cancellation';
        }
        if (/أكد|تمام|صح| CONFIRM|oui|yes/i.test(lowerMsg)) {
            return 'confirmation';
        }
        if (/سعر|بزاف|شحال|prix|price|combien/i.test(lowerMsg)) {
            return 'inquiry';
        }
        return 'other';
    },

    /**
     * Extract booking info from message using AI
     */
    async extractBookingInfo(message: string, currentContext: BookingContext, services: any[]): Promise<Partial<BookingContext>> {
        const servicesList = services.map(s => `${s.name_ar} (${s.duration}دق, ${s.price}DA)`).join(', ');
        
        const prompt = `
أنتِ مساعد ذكي لصالون تجميل. حللي الرسالة التالية واستخرجي المعلومات المتعلقة بالحجز.

الرسالة: "${message}"

المرحلة الحالية: ${currentContext.stage}

الخدمات المتاحة: ${servicesList}

استخرجي JSON فقط بالهيكل التالي:
{
    "service": "اسم الخدمة المطلوبة أو null",
    "serviceId": "معرف الخدمة أو null", 
    "date": "YYYY-MM-DD أو null (حول 'غدا' أو 'بكرة' إلى التاريخ المناسب)",
    "time": "HH:MM أو null",
    "clientName": "اسم العميل أو null",
    "intent": "booking | inquiry | cancellation | confirmation | other"
}

قواعد:
- التاريخ اليوم: ${new Date().toISOString().split('T')[0]}
- 'غدا' أو 'بكرة' = غداً
- 'بعد غدا' = بعد غد
- حولي الأوقات إلى صيغة 24 ساعة
- اختاري أقرب خدمة مطابقة من القائمة
`;

        try {
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "system", content: prompt }],
                temperature: 0.3,
                max_tokens: 300
            });

            const content = response.choices[0]?.message?.content || '{}';
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[0]);
                
                // Find service ID if service name provided
                if (extracted.service && !extracted.serviceId) {
                    const matchedService = services.find(s => 
                        s.name_ar.includes(extracted.service) || 
                        extracted.service.includes(s.name_ar)
                    );
                    if (matchedService) {
                        extracted.serviceId = matchedService.id;
                        extracted.service = matchedService.name_ar;
                    }
                }
                
                return extracted;
            }
        } catch (error) {
            console.error("Error extracting booking info:", error);
        }
        
        return {};
    },

    /**
     * Get available slots and update context
     */
    async getAndUpdateAvailableSlots(phoneNumber: string, context: BookingContext): Promise<string[]> {
        if (!context.date) return [];
        
        const { data: slots } = await whatsapp.getAvailableSlots(context.date);
        context.availableSlots = slots || [];
        await this.updateBookingContext(phoneNumber, context);
        
        return slots || [];
    },

    /**
     * Build the system prompt based on context and booking state
     */
    buildEnhancedPrompt(context: SmartContext, currentMessage: string): string {
        const { bookingContext, clientName, recentMessages } = context;
        const isFirstMessage = !recentMessages || recentMessages.length === 0;
        const stage = bookingContext.stage;

        let prompt = `أنتِ سارة، موظفة استقبال ودودة ومحترفة في صالون ZenStyle للتجميل.

**شخصيتك:**
- بنت بلاد مهذبة، تتكلم دارجة جزائرية ناعمة وطبيعية 🇩🇿
- محترفة في خدمة العملاء وتحب تساعدي الزبائن
- صبورة وتوضحي كل خطوة في عملية الحجز
- ما تكثريش الكلام - جوابك مختصر وواضح

**مهمتك الرئيسية:**
مساعدة الزبائن في حجز المواعيد بخطوات واضحة:
1. معرفة الخدمة المطلوبة
2. تحديد التاريخ المناسب  
3. اختيار الوقت المتاح
4. طلب اسم الزبونة (لو ما عندكش)
5. تأكيد الحجز بالتفاصيل

`;

        // Add client info
        if (clientName) {
            prompt += `**الزبونة:** ${clientName} (زبونة ${context.visitCount && context.visitCount > 1 ? 'قديمة' : 'جديدة'})\n`;
        } else {
            prompt += `**الزبونة:** جديدة - يجب طلب اسمها\n`;
        }

        // Add booking context state
        prompt += `\n**حالة الحجز الحالية:** ${stage}\n`;
        
        if (bookingContext.service) {
            prompt += `**الخدمة المختارة:** ${bookingContext.service}\n`;
        }
        if (bookingContext.date) {
            prompt += `**التاريخ:** ${bookingContext.date}\n`;
        }
        if (bookingContext.time) {
            prompt += `**الوقت:** ${bookingContext.time}\n`;
        }

        // Stage-specific instructions
        prompt += `\n**تعليمات المرحلة الحالية (${stage}):**\n`;
        
        switch (stage) {
            case 'greeting':
                prompt += isFirstMessage 
                    ? `- رحبي بالزبونة بـ "وعليكم السلام" + اسمها لو تعرفيها\n- اطرحي سؤال مفتوح: "كيفاه نقدر نعاونك اليوم لالة؟"\n- لو طلبت حجز، انتقلي لجمع المعلومات\n`
                    : `- كملي المحادثة بشكل طبيعي\n- لو طلبت حجز، ابدئي بسؤال: "شنو هي الخدمة اللي تحبيها؟"\n`;
                break;
                
            case 'collecting_service':
                prompt += `- اعرضي الخدمات المتاحة باختصار (قص الشعر، صبغة، عناية بالبشرة، مانيكير...)\n- استني رد الزبونة وتأكدي من الخدمة المطلوبة\n- مثال: "عندنا قص الشعر ب 500DA، الصبغة من 1500DA... شنو تحبي؟"\n`;
                break;
                
            case 'collecting_date':
                prompt += `- اقترحي تواريخ محددة\n- مثال: "عندنا غدا (${this.getTomorrowDate()}) أو بعد غد (${this.getDayAfterTomorrowDate()})، واش يوم يناسبك؟"\n- استني تأكيد التاريخ\n`;
                break;
                
            case 'collecting_time':
                const slots = bookingContext.availableSlots || [];
                if (slots.length > 0) {
                    const suggestedSlots = slots.slice(0, 3).join('، ');
                    prompt += `- الأوقات المتاحة يوم ${bookingContext.date}: ${suggestedSlots}\n- اقترحي 2-3 أوقات من القائمة\n- مثال: "عندنا ${suggestedSlots}، شحال تحبي؟"\n`;
                } else {
                    prompt += `- لا يوجد أوقات متاحة هذا اليوم\n- اقترحي يوم آخر\n`;
                }
                break;
                
            case 'collecting_name':
                prompt += `- اطلبي اسم الزبونة بأدب\n- مثال: "عفواً لالة، واش تقدري تعطيني اسمك باش نسجل ليك الموعد؟"\n- استني الاسم الكامل\n`;
                break;
                
            case 'confirming':
                prompt += `- أكدي كل تفاصيل الحجز:\n`;
                if (bookingContext.service) prompt += `  • الخدمة: ${bookingContext.service}\n`;
                if (bookingContext.date) prompt += `  • اليوم: ${bookingContext.date}\n`;
                if (bookingContext.time) prompt += `  • الساعة: ${bookingContext.time}\n`;
                if (bookingContext.clientName) prompt += `  • الاسم: ${bookingContext.clientName}\n`;
                prompt += `- اسألي: "هل التفاصيل صحيحة؟" أو "نأكد ليك الموعد؟"\n- استني تأكيد الزبونة\n`;
                break;
                
            case 'completed':
                prompt += `- هني الزبونة وذكريها بالموعد\n- مثال: "تم تأكيد موعدك لالة ${bookingContext.clientName} يوم ${bookingContext.date} الساعة ${bookingContext.time} ✅"\n- أضيفي: "نستناك بفارغ الصبر! ✨"\n`;
                break;
        }

        // Important rules
        prompt += `\n**قواعد مهمة:**\n`;
        prompt += `- لا تستخدمي "السلام عليكم" إلا في أول رسالة\n`;
        prompt += `- تجنبي التكرار - كل رد يجب أن يكون مختلف\n`;
        prompt += `- كوني واضحة ولا تتركي مجال للالتباس\n`;
        prompt += `- لو الزبونة غيرت رأيها، عدلي السياق وابدئي من جديد\n`;
        prompt += `- لا تخميني - استفسري للتأكد\n`;

        // Current message
        prompt += `\n**رسالة الزبونة الآن:** "${currentMessage}"\n`;
        prompt += `\n**ردك الآن (بالدارجة الجزائرية):**`;

        return prompt;
    },

    /**
     * Helper to get tomorrow's date
     */
    getTomorrowDate(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    },

    /**
     * Helper to get day after tomorrow's date
     */
    getDayAfterTomorrowDate(): string {
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        return dayAfter.toISOString().split('T')[0];
    },

    /**
     * Process user message and update booking flow
     */
    async processBookingFlow(message: string, phoneNumber: string, context: SmartContext): Promise<{ reply: string; context: BookingContext }> {
        const bookingContext = context.bookingContext;
        const intent = this.detectIntent(message);
        
        // Get services list
        const { data: services } = await whatsapp.getServices();
        
        // Extract info from message
        const extractedInfo = await this.extractBookingInfo(message, bookingContext, services || []);
        
        // Update context with extracted info
        if (extractedInfo.service && !bookingContext.service) {
            bookingContext.service = extractedInfo.service;
            bookingContext.serviceId = extractedInfo.serviceId;
            if (bookingContext.stage === 'greeting' || bookingContext.stage === 'collecting_service') {
                bookingContext.stage = 'collecting_date';
            }
        }
        
        if (extractedInfo.date && !bookingContext.date) {
            bookingContext.date = extractedInfo.date;
            if (bookingContext.stage === 'collecting_date') {
                bookingContext.stage = 'collecting_time';
                // Get available slots for the date
                await this.getAndUpdateAvailableSlots(phoneNumber, bookingContext);
            }
        }
        
        if (extractedInfo.time && !bookingContext.time) {
            bookingContext.time = extractedInfo.time;
            if (bookingContext.stage === 'collecting_time') {
                // Check if we need client's name
                const { data: session } = await whatsapp.getSession(phoneNumber);
                if (!session?.client_id) {
                    bookingContext.stage = 'collecting_name';
                } else {
                    bookingContext.stage = 'confirming';
                }
            }
        }
        
        if (extractedInfo.clientName && !bookingContext.clientName) {
            bookingContext.clientName = extractedInfo.clientName;
            if (bookingContext.stage === 'collecting_name') {
                bookingContext.stage = 'confirming';
            }
        }
        
        // Handle confirmation
        if (intent === 'confirmation' && bookingContext.stage === 'confirming') {
            bookingContext.stage = 'completed';
            // Here you would actually create the appointment in database
        }
        
        // Handle cancellation
        if (intent === 'cancellation') {
            bookingContext.stage = 'cancelled';
            await whatsapp.clearBookingContext(phoneNumber);
            return { 
                reply: "تم إلغاء الحجز. لو تحبي تحجزي في وقت آخر، راني حاضرة 💕",
                context: bookingContext 
            };
        }
        
        // Save updated context
        await this.updateBookingContext(phoneNumber, bookingContext);
        
        // Build prompt and get AI response
        const systemPrompt = this.buildEnhancedPrompt(context, message);
        
        const messages: any[] = [{ role: "system", content: systemPrompt }];
        
        if (context.recentMessages && context.recentMessages.length > 0) {
            context.recentMessages.forEach(msg => {
                messages.push({ role: msg.role, content: msg.content });
            });
        }
        
        messages.push({ role: "user", content: message });
        
        const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages,
            temperature: 0.75,
            max_tokens: 250
        });
        
        const reply = response.choices[0]?.message?.content || "دقيقة برك لالة نثبت ونرجعلك 💕";
        
        return { reply, context: bookingContext };
    },

    /**
     * Main reply function for WhatsApp - Enhanced with booking flow
     */
    async replyToClient(message: string, phoneNumber: string): Promise<string> {
        try {
            // Ensure session exists
            await whatsapp.getSession(phoneNumber);
            
            // Identify client
            const client = await this.identifyClient(phoneNumber);
            if (client) {
                await whatsapp.linkClientToSession(phoneNumber, client.id);
            }
            
            // Get booking context
            const bookingContext = await this.getBookingContext(phoneNumber, client);
            
            // Get recent messages
            const { data: recentMessages } = await whatsapp.getRecentMessages(phoneNumber);
            
            // Build smart context
            const smartContext: SmartContext = {
                clientName: client?.name,
                tier: client?.tier,
                lastVisit: client?.lastVisit,
                visitCount: client?.visitCount,
                recentMessages: recentMessages || [],
                bookingContext
            };
            
            // Process booking flow and get reply
            const { reply } = await this.processBookingFlow(message, phoneNumber, smartContext);
            
            // Save messages to session
            await whatsapp.updateMessages(phoneNumber, 'user', message);
            await whatsapp.updateMessages(phoneNumber, 'assistant', reply);
            
            return reply;

        } catch (error) {
            console.error("WhatsApp AI Error:", error);
            return "راني نعاني من شوية مشاكل تقنية، عاوديلي شوية برك 🙏";
        }
    },

    /**
     * [DEPRECATED] This function is for in-app chat which now uses Amina
     */
    async chatWithClient(_message: string, _context: any): Promise<string> {
        return "الرجاء استخدام amina للمحادثة داخل التطبيق.";
    }
};

export const whatsappAI = sarah;
