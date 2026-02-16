
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
    // dangerouslyAllowBrowser: true, // Not needed in API folder
    defaultHeaders: {
        "HTTP-Referer": "https://smart-salon-dz.com", // اختياري لـ OpenRouter
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

interface SmartContext {
    clientName?: string;
    tier?: string;
    lastVisit?: string;
    visitCount?: number;
    recentMessages?: Array<{ role: string; content: string }>;
    conversationStage?: 'greeting' | 'inquiry' | 'booking' | 'confirmation' | 'closing';
    topicsDiscussed?: string[];
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
     * Get smart context with conversation state tracking
     */
    async getSmartContext(phoneNumber: string, client: ClientProfile | null): Promise<SmartContext> {
        const { data: recentMessages } = await whatsapp.getRecentMessages(phoneNumber);

        // Analyze conversation stage based on message history
        const messages = recentMessages || [];
        let stage: SmartContext['conversationStage'] = 'greeting';
        const topicsDiscussed: string[] = [];

        if (messages.length > 0) {
            const lastMessages = messages.slice(-5);
            const content = lastMessages.map((m: any) => m.content.toLowerCase()).join(' ');

            // Detect conversation stage
            if (content.includes('حجز') || content.includes('موعد') || content.includes('وقت')) {
                stage = content.includes('أكد') || content.includes('تمام') ? 'confirmation' : 'booking';
            } else if (content.includes('سعر') || content.includes('بزاف') || content.includes('شحال')) {
                stage = 'inquiry';
            } else if (messages.length > 2) {
                stage = 'closing';
            }

            // Track discussed topics to avoid repetition
            if (content.includes('سعر')) topicsDiscussed.push('pricing');
            if (content.includes('حجز') || content.includes('موعد')) topicsDiscussed.push('booking');
            if (content.includes('خدمة') || content.includes('شنو عندكم')) topicsDiscussed.push('services');
        }

        return {
            clientName: client?.name,
            tier: client?.tier,
            lastVisit: client?.lastVisit ? new Date(client.lastVisit).toLocaleDateString('ar-DZ') : undefined,
            visitCount: client?.visitCount,
            recentMessages: messages?.slice(-3),
            conversationStage: stage,
            topicsDiscussed
        };
    },

    /**
     * Main reply function for WhatsApp - Natural and non-repetitive
     */
    async replyToClient(message: string, phoneNumber: string): Promise<string> {
        try {
            await whatsapp.getSession(phoneNumber);
            const client = await this.identifyClient(phoneNumber);

            if (client) {
                await whatsapp.linkClientToSession(phoneNumber, client.id);
            }

            const context = await this.getSmartContext(phoneNumber, client);
            const systemPrompt = this.buildNaturalPrompt(context, message);

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
                max_tokens: 200
            });

            const reply = response.choices[0]?.message?.content || "دقيقة برك لالة نثبت ونرجعلك 💕";

            await whatsapp.updateMessages(phoneNumber, 'user', message);
            await whatsapp.updateMessages(phoneNumber, 'assistant', reply);

            return reply;

        } catch (error) {
            console.error("WhatsApp AI Error:", error);
            return "راني نعاني من شوية مشاكل في الكونيكسيو، عاوديلي شوية برك 🙏";
        }
    },

    /**
     * Build natural, non-repetitive prompt for WhatsApp
     */
    buildNaturalPrompt(context: SmartContext, currentMessage: string): string {
        const isFirstMessage = !context.recentMessages || context.recentMessages.length === 0;
        const stage = context.conversationStage || 'greeting';
        const isReturningClient = context.visitCount && context.visitCount > 1;

        let prompt = `أنتِ سارة، موظفة استقبال ودودة في صالون ZenStyle. تكلمي مع الزبائن في الواتساب فقط.

**شخصيتك:**
- بنت بلاد مهذبة، تتكلم دارجة جزائرية ناعمة وطبيعية
- تفهمي في خدمات الصالون وتعرفي تفاصيلها
- ما تحبيش تعاودي نفس الكلام - كل رد يكون مختلف حسب السياق
- تتكلمي كأنك بنت خالتهم، مريحة وعلى راحتهم

**صلاحياتك:**
- تعرفي الخدمات والأسعار والمواعيد المتاحة
- تحجزي المواعيد وتأكديها
- ❌ ممنوع: المبيعات، الأرباح، الرواتب، المخزون الداخلي

`;

        // Client context
        if (context.clientName) {
            prompt += `**الزبونة:** ${context.clientName}`;
            if (isReturningClient) {
                prompt += ` (زبونة قديمة وثقيلة، زارتنا ${context.visitCount} مرات)`;
            }
            prompt += '\n';
            if (context.lastVisit) {
                prompt += `**آخر زيارة:** من ${context.lastVisit}\n`;
            }
        } else {
            prompt += `**الزبونة:** جديدة، خليها تحس بالترحيب\n`;
        }

        // Conversation stage guidance
        prompt += `\n**مرحلة المحادثة:** ${stage}\n`;

        // Anti-repetition rules
        prompt += `\n**قواعد مهمة لتجنب التكرار:**\n`;
        if (isFirstMessage) {
            prompt += `- الرسالة الأولى: رحبي بالزبونة بـ "السلام عليكم" + اسمها لو تعرفيها\n`;
        } else {
            prompt += `- المحادثة مستمرة: لا تقولي "السلام عليكم" مرة أخرى! كملي الحديث طبيعي\n`;
        }

        if (context.topicsDiscussed?.includes('pricing')) {
            prompt += `- تم ذكر الأسعار مسبقاً - ما تحكيش على الأسعار إلا لو سألت صراحة\n`;
        }
        if (context.topicsDiscussed?.includes('services')) {
            prompt += `- تم عرض الخدمات مسبقاً - ركزي على التفاصيل الجديدة فقط\n`;
        }

        // Current message context
        prompt += `\n**رسالتها الحالية:** "${currentMessage}"\n`;

        // Response style based on stage
        prompt += `\n**أسلوب الرد:**\n`;
        if (stage === 'greeting') {
            prompt += `- رحبي وعرضي مساعدة بسيطة\n- مثال: "وعليكم السلام لالة [الاسم]! كيفاه نقدر نعاونك اليوم؟"\n`;
        } else if (stage === 'inquiry') {
            prompt += `- جاوبي مباشرة وباختصار\n- لو سألت على السعر: قولي السعر + وقت الخدمة\n- لو سألت على خدمة: وصفيها بكلمتين واقترحي الوقت المناسب\n`;
        } else if (stage === 'booking') {
            prompt += `- اقترحي موعدين محددين (مثلاً: "عندنا غدوة على 10 أو 3 العشية")\n- أكدي التفاصيل: اليوم + الساعة + الخدمة\n`;
        } else if (stage === 'confirmation') {
            prompt += `- أكدي الحجز برقم أو تفصيل واضح\n- ختمي بجملة طيبة عن الاستعداد لاستقبالها\n`;
        } else {
            prompt += `- كوني ودودة واختصارية\n- لو الحجز تم: "نستناك لالة ✨"\n- لو عندها سؤال تاني: جاوبي مباشرة\n`;
        }

        prompt += `\n**ردك الآن:**`;

        return prompt;
    },

    /**
     * [DEPRECATED] This function is for in-app chat which now uses Amina
     */
    async chatWithClient(message: string, context: any): Promise<string> {
        return "الرجاء استخدام amina للمحادثة داخل التطبيق.";
    }
};

export const whatsappAI = sarah;
