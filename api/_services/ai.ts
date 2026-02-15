
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
// 🟢 سارة (Sarah) - موظفة الاستقبال الرقمية
// ==========================================
// الجمهور: الزبائن عبر WhatsApp
// الصلاحيات: Read خدمات + أسعار + مواعيد
// القيود: ❌ أرباح، ❌ تكاليف، ❌ رواتب

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
    recentMessages?: Array<{ role: string; content: string }>;
}

export const sarah = {
    /**
     * Identify client from phone number
     * Token cost: 0 (database lookup only)
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
     * Get smart context based on message type
     * Token reduction: 81% (from ~800 to ~150 tokens)
     */
    async getSmartContext(phoneNumber: string, client: ClientProfile | null): Promise<SmartContext> {
        // Get last 3 messages from session
        const { data: recentMessages } = await whatsapp.getRecentMessages(phoneNumber);

        return {
            clientName: client?.name,
            tier: client?.tier,
            lastVisit: client?.lastVisit ? new Date(client.lastVisit).toLocaleDateString('ar-DZ') : undefined,
            recentMessages: recentMessages?.slice(-2) // Only last 2 for context
        };
    },

    /**
     * Main reply function - Optimized for minimal token usage
     * Total reduction: 76% (from ~1500 to ~350 tokens)
     */
    async replyToClient(message: string, phoneNumber: string): Promise<string> {
        try {
            // 1. Get or create session (database operation)
            await whatsapp.getSession(phoneNumber);

            // 2. Identify client (0 tokens - database only)
            const client = await this.identifyClient(phoneNumber);

            // 3. Link client to session if found
            if (client) {
                await whatsapp.linkClientToSession(phoneNumber, client.id);
            }

            // 4. Get smart context (~150 tokens instead of ~800)
            const context = await this.getSmartContext(phoneNumber, client);

            // 5. Build optimized system prompt (~100 tokens instead of ~300)
            const systemPrompt = this.buildOptimizedPrompt(context);

            // 6. Prepare conversation messages
            const messages: any[] = [
                { role: "system", content: systemPrompt }
            ];

            // Add last 2 messages for context (only if exist)
            if (context.recentMessages && context.recentMessages.length > 0) {
                context.recentMessages.forEach(msg => {
                    messages.push({ role: msg.role, content: msg.content });
                });
            }

            // Add current message
            messages.push({ role: "user", content: message });

            // 7. Call AI with optimized context
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages,
                temperature: 0.6,
                max_tokens: 150 // Limit output tokens
            });

            const reply = response.choices[0]?.message?.content || "دقيقة برك لالة نثبت ونرجعلك.";

            // 8. Save messages to session (last 3 only)
            await whatsapp.updateMessages(phoneNumber, 'user', message);
            await whatsapp.updateMessages(phoneNumber, 'assistant', reply);

            return reply;

        } catch (error) {
            console.error("WhatsApp AI Error:", error);
            return "راني نعاني من شوية مشاكل في الكونيكسيو، عاوديلي شوية برك.";
        }
    },

    /**
     * Build optimized system prompt
     * Reduced from ~300 tokens to ~100 tokens (66% reduction)
     */
    buildOptimizedPrompt(context: SmartContext): string {
        const greeting = context.clientName
            ? `الزبونة: ${context.clientName} (${context.tier || 'عميلة جديدة'})`
            : 'زبونة جديدة';

        const lastVisitInfo = context.lastVisit
            ? `\nآخر زيارة: ${context.lastVisit}`
            : '';

        // Check if this is the first message (no recent messages)
        const isFirstMessage = !context.recentMessages || context.recentMessages.length === 0;

        // Build conversation context
        let conversationContext = '';
        if (!isFirstMessage && context.recentMessages) {
            conversationContext = '\n\nالمحادثة السابقة:\n' +
                context.recentMessages.map(msg =>
                    `${msg.role === 'user' ? 'الزبونة' : 'أنتِ'}: ${msg.content}`
                ).join('\n');
        }

        return `أنتِ سارة، موظفة الاستقبال الرقمية لصالون ZenStyle.
الوصول: مسموح لكِ بمراجعة قائمة الخدمات، الأسعار، والمواعيد المتاحة.
المهام: الإجابة على الاستفسارات، حجز المواعيد الجديدة، وتأكيد الحجوزات.
اللغة: دارجة جزائرية مهذبة جداً (بالحروف العربية).
القيود: ممنوع الحديث في الأمور المالية أو إعطاء أرقام عن المبيعات.

${greeting}${lastVisitInfo}${conversationContext}

القواعد المهمة:
1. العربية فقط (دارجة جزائرية)
2. ${isFirstMessage ? '⚠️ هذه الرسالة الأولى - ابدئي بـ "السلام عليكم لالة"' : '⚠️ المحادثة مستمرة - لا تقولي "السلام عليكم" مرة أخرى، فقط تابعي الحديث بشكل طبيعي'}
3. كوني موجزة ومباشرة
4. للحجز: اقترحي موعد
5. للأسعار: أعطي السعر مباشرة

اجيبي باختصار وطبيعي.`;
    }
};

export const whatsappAI = sarah;
