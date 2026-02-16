import OpenAI from 'openai';
import { whatsapp } from './whatsapp.js';

// Support both Vite (import.meta.env) and Node.js (process.env)
const getEnv = (key: string) => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

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
// 🟢 واجهات البيانات (Interfaces)
// ==========================================

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
    clientName?: string;
    availableSlots?: string[];
}

interface SmartContext {
    clientName?: string;
    tier?: string;
    visitCount?: number;
    recentMessages?: Array<{ role: string; content: string; timestamp?: string }>;
    bookingContext: BookingContext;
}

// ==========================================
// 🟢 سارة (Sarah) - النسخة المحدثة
// ==========================================

export const sarah = {
    /**
     * تحديد هوية الزبونة
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
     * جلب سياق الحجز وضمان عدم تصفيره
     */
    async getBookingContext(phoneNumber: string): Promise<BookingContext> {
        const { data: context } = await whatsapp.getBookingContext(phoneNumber);
        if (!context || Object.keys(context).length === 0) {
            const initialContext: BookingContext = { stage: 'greeting' };
            await whatsapp.updateBookingContext(phoneNumber, initialContext);
            return initialContext;
        }
        return context as BookingContext;
    },

    /**
     * اكتشاف "نية" الزبونة (Intent Detection)
     */
    detectIntent(message: string): 'greeting' | 'booking' | 'inquiry' | 'cancellation' | 'confirmation' | 'other' {
        const lowerMsg = message.toLowerCase();
        if (/سلام|مرحبا|صباح|مساء|هاي|واش راكي/i.test(lowerMsg)) return 'greeting';
        if (/حجز|موعد|رنديڤو|حاب نجي|نحجز|بلاص/i.test(lowerMsg)) return 'booking';
        if (/ألغي|cancel|حذف|بطلت/i.test(lowerMsg)) return 'cancellation';
        if (/أكد|تمام|صح|خلاص|أوكي|ok/i.test(lowerMsg)) return 'confirmation';
        if (/سعر|بزاف|شحال|قداه|بري/i.test(lowerMsg)) return 'inquiry';
        return 'other';
    },

    /**
     * استخراج المعلومات بالذكاء الاصطناعي (أكثر دقة)
     */
    async extractBookingInfo(message: string, currentContext: BookingContext, services: any[]): Promise<Partial<BookingContext>> {
        const servicesList = services.map(s => `${s.name_ar}`).join(', ');
        const prompt = `حلل الرسالة التالية من زبونة في صالون تجميل واستخرج البيانات المطلوبة بصيغة JSON فقط.
الرسالة: "${message}"
تاريخ اليوم: ${new Date().toLocaleDateString('ar-DZ')}
الخدمات المتوفرة: ${servicesList}

قواعد الاستخراج:
- 'غدوة' = تاريخ يوم غد.
- 'غير غدوة' = بعد غد.
- حول الوقت لصيغة HH:MM.
- استخرج اسم الشخص إذا ذكره.

JSON Output:
{
  "service": "اسم الخدمة من القائمة فقط أو null",
  "date": "YYYY-MM-DD أو null",
  "time": "HH:MM أو null",
  "clientName": "اسم الزبونة أو null"
}`;

        try {
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "system", content: prompt }],
                temperature: 0.1, // دقة عالية
            });
            const content = response.choices[0]?.message?.content || '{}';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (e) { return {}; }
    },

    /**
     * بناء البرومبت "الذكي" لمنع التكرار والنسيان
     */
    buildEnhancedPrompt(context: SmartContext, currentMessage: string): string {
        const { bookingContext, clientName, recentMessages } = context;
        const hasHistory = recentMessages && recentMessages.length > 0;

        // منع التكرار: إذا كان هناك اسم أو خدمة مخزنة، نذكر سارة بذلك
        return `أنتِ سارة، مساعدة صالون ZenStyle. تكلمي دارجة جزائرية خفيفة.
**ممنوعات:** 1. لا تعيدي "السلام عليكم" إذا كانت المحادثة مستمرة (راجعي تاريخ المحادثة).
2. لا تسألي عن معلومة تم تقديمها سابقاً.

**المعلومات الحالية (احفظيها جيداً):**
- الزبونة: ${bookingContext.clientName || clientName || 'جديدة'}
- الخدمة: ${bookingContext.service || 'لم تحدد'}
- التاريخ: ${bookingContext.date || 'لم يحدد'}
- الوقت: ${bookingContext.time || 'لم يحدد'}
- المرحلة: ${bookingContext.stage}

**الهدف الحالي:** ${this.getStageGoal(bookingContext.stage)}

ردي على: "${currentMessage}"`;
    },

    getStageGoal(stage: string): string {
        switch (stage) {
            case 'greeting': return "الترحيب لمرة واحدة ومعرفة سبب المراسلة.";
            case 'collecting_service': return "اقتراح الخدمات المتاحة واختيار واحدة.";
            case 'collecting_date': return "تحديد اليوم (غدا، السبت، إلخ).";
            case 'collecting_time': return "اقتراح الأوقات المتاحة للاختيار بينها.";
            case 'collecting_name': return "طلب اسم الزبونة لتسجيل الحجز.";
            case 'confirming': return "عرض التفاصيل النهائية للتأكيد.";
            case 'completed': return "إنهاء المحادثة بلطف (نستناك لالة).";
            default: return "المساعدة العامة.";
        }
    },

    /**
     * معالجة تدفق الحجز (Core Logic)
     */
    async processBookingFlow(message: string, phoneNumber: string, context: SmartContext): Promise<string> {
        const bCtx = context.bookingContext;
        const { data: services } = await whatsapp.getServices();

        // 1. استخراج المعلومات
        const extracted = await this.extractBookingInfo(message, bCtx, services || []);

        // 2. تحديث البيانات (فقط إذا كانت جديدة)
        if (extracted.service && !bCtx.service) bCtx.service = extracted.service;
        if (extracted.date && !bCtx.date) bCtx.date = extracted.date;
        if (extracted.time && !bCtx.time) bCtx.time = extracted.time;
        if (extracted.clientName && !bCtx.clientName) bCtx.clientName = extracted.clientName;

        // 3. تحديث المرحلة (State Controller)
        const intent = this.detectIntent(message);

        if (intent === 'cancellation') {
            bCtx.stage = 'cancelled';
            await whatsapp.clearBookingContext(phoneNumber);
            return "بطلنا لالة، ما يكون غير خاطرك. إذا حبيتي تحجزي مرة ثانية راني هنا 💕";
        }

        // منطق الانتقال بين المراحل
        if (bCtx.service && bCtx.date && bCtx.time && (bCtx.clientName || context.clientName)) {
            bCtx.stage = 'confirming';
        } else if (bCtx.service && bCtx.date && !bCtx.time) {
            bCtx.stage = 'collecting_time';
            const { data: slots } = await whatsapp.getAvailableSlots(bCtx.date);
            bCtx.availableSlots = slots || [];
        } else if (bCtx.service && !bCtx.date) {
            bCtx.stage = 'collecting_date';
        } else if (intent === 'booking' || (bCtx.stage === 'greeting' && extracted.service)) {
            bCtx.stage = bCtx.service ? 'collecting_date' : 'collecting_service';
        }

        if (intent === 'confirmation' && bCtx.stage === 'confirming') {
            bCtx.stage = 'completed';
        }

        // 4. حفظ التحديث
        await whatsapp.updateBookingContext(phoneNumber, bCtx);

        // 5. توليد الرد النهائي عبر الذكاء الاصطناعي
        const systemPrompt = this.buildEnhancedPrompt(context, message);
        const history = (context.recentMessages || []).slice(-10).map(m => ({
            role: m.role as any,
            content: m.content
        }));

        const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }],
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content || "دقيقة برك لالة نثبت ونرجعلك 💕";
    },

    /**
     * الدالة الرئيسية للرد
     */
    async replyToClient(message: string, phoneNumber: string): Promise<string> {
        try {
            await whatsapp.getSession(phoneNumber);
            const client = await this.identifyClient(phoneNumber);
            const bookingContext = await this.getBookingContext(phoneNumber);
            const { data: recentMessages } = await whatsapp.getRecentMessages(phoneNumber);

            const smartContext: SmartContext = {
                clientName: client?.name,
                visitCount: client?.visitCount,
                recentMessages: recentMessages || [],
                bookingContext
            };

            const reply = await this.processBookingFlow(message, phoneNumber, smartContext);

            await whatsapp.updateMessages(phoneNumber, 'user', message);
            await whatsapp.updateMessages(phoneNumber, 'assistant', reply);

            return reply;
        } catch (error) {
            console.error("Sarah Error:", error);
            return "راني نعاني من شوية مشاكل تقنية، عاوديلي شوية برك 🙏";
        }
    }
};

export const whatsappAI = sarah;