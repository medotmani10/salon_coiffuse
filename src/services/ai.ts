import OpenAI from 'openai';
import type { Alert } from '@/types';
import { api } from './api';

// Support both Vite (import.meta.env) and Node.js (process.env)
const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

// الإعدادات - تم توجيهها لـ OpenRouter مع دعم GPT-4o-mini
const apiKey = getEnv('VITE_OPENROUTER_API_KEY') || '';
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
        "HTTP-Referer": "https://smart-salon-dz.com", // اختياري لـ OpenRouter
        "X-Title": "Smart Salon Manager"
    }
});

// ==========================================
// 🔧 أدوات مشتركة
// ==========================================
export const aiUtils = {
    // التنبيهات الذكية (Smart Alerts)
    async getSmartAlerts(): Promise<Alert[]> {
        const alerts: Alert[] = [];
        const { data: products } = await api.products.getAll();

        // تنبيه المخزون (Stock Alert)
        products?.filter((p: any) => p.stock <= p.minStock).forEach((p: any) => {
            alerts.push({
                id: `ai-stock-${p.id}`,
                type: 'stock',
                titleAr: 'قريب يخلص السلعة!',
                titleFr: 'Alerte Stock',
                messageAr: `المنتج "${p.nameFr}" بقاولك منه ${p.stock} حبات بس، لازم تشري!`,
                messageFr: `Il ne reste que ${p.stock} unités de "${p.nameFr}".`,
                severity: 'warning',
                isRead: false,
                createdAt: new Date()
            });
        });

        return alerts;
    }
};

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
    conversationStage?: 'greeting' | 'inquiry' | 'booking' | 'confirmation' | 'closing';
    topicsDiscussed?: string[];
    bookingContext?: BookingContext;
}

export const sarah = {
    /**
     * Identify client from phone number
     */
    async identifyClient(phoneNumber: string): Promise<ClientProfile | null> {
        const { data: client } = await (api as any).whatsapp.findClientByPhone(phoneNumber);

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
        const { data: recentMessages } = await (api as any).whatsapp.getRecentMessages(phoneNumber);

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
            await (api as any).whatsapp.getSession(phoneNumber);
            const client = await this.identifyClient(phoneNumber);

            if (client) {
                await (api as any).whatsapp.linkClientToSession(phoneNumber, client.id);
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

            await (api as any).whatsapp.updateMessages(phoneNumber, 'user', message);
            await (api as any).whatsapp.updateMessages(phoneNumber, 'assistant', reply);

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
     * Kept for compatibility but redirects to WhatsApp-specific responses
     */
    async chatWithClient(_message: string, _context: any): Promise<string> {
        // This should not be called for in-app chat anymore
        // In-app chat now uses amina.chatWithPartner
        return "الرجاء استخدام amina للمحادثة داخل التطبيق.";
    },

    /**
     * Gather limited context for clients (services, prices, appointments only)
     */
    async gatherClientContext(clientId?: string) {
        try {
            const [
                { data: services },
                { data: upcoming }
            ] = await Promise.all([
                api.services.getAll(),
                api.appointments.getUpcoming()
            ]);

            let clientInfo = null;
            if (clientId) {
                const { data: clients } = await api.clients.getAll();
                const client = clients?.find(c => c.id === clientId);
                if (client) {
                    clientInfo = {
                        name: `${client.firstName} ${client.lastName}`,
                        tier: client.tier,
                        lastVisit: client.lastVisit,
                        loyaltyPoints: client.loyaltyPoints
                    };
                }
            }

            return {
                timestamp: new Date().toLocaleString('ar-DZ'),
                services: services?.map((s: any) => ({
                    name: s.nameFr,
                    price: s.price,
                    duration: s.duration
                })),
                upcomingAppointments: upcoming?.map((a: any) => ({
                    date: a.date,
                    time: a.start_time,
                    service: a.service_name
                })),
                client: clientInfo
            };
        } catch (error) {
            console.error("Client Context Error:", error);
            return null;
        }
    }
};

// ==========================================
// 🔵 أمينة (Amina) - الشريكة الاستراتيجية للتطبيق
// ==========================================
// الجمهور: صاحبة الصالون (داخل التطبيق فقط)
// الصلاحيات: Read-Only لكل شيء (مبيعات، مصاريف، مخزون، أداء)
// القيود: لا تتكلم مع الزبائن - فقط مع المالكة داخل التطبيق

export const amina = {
    /**
     * Gather complete business context
     */
    async gatherBusinessContext() {
        try {
            const [
                { data: stats },
                { data: products },
                { data: upcoming },
                { data: staff },
                { data: clients },
                { data: transactions },
                { data: expenses }
            ] = await Promise.all([
                api.appointments.getStats(),
                api.products.getAll(),
                api.appointments.getUpcoming(),
                api.staff.getAll(),
                api.clients.getAll(),
                api.transactions.getAll('month'),
                api.expenses.getAll()
            ]);

            return {
                timestamp: new Date().toLocaleString('ar-DZ'),
                revenue: stats?.totalRevenue || 0,
                activeStaff: staff?.filter(s => s.isActive).length,
                inventoryStatus: {
                    lowStock: products?.filter((p: any) => p.stock <= p.minStock).map((p: any) => p.nameFr),
                    critical: products?.filter((p: any) => p.stock === 0).length
                },
                vipList: clients?.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3),
                appointmentsCount: upcoming?.length || 0,
                financialSummary: {
                    totalTransactions: transactions?.length || 0,
                    totalExpenses: expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0,
                    netProfit: (stats?.totalRevenue || 0) - (expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0)
                },
                staffPerformance: staff?.map((s: any) => ({
                    name: s.name,
                    appointments: s.appointments_count || 0,
                    revenue: s.revenue_generated || 0
                }))
            };
        } catch (error) {
            console.error("Context Error:", error);
            return null;
        }
    },

    /**
     * Get business insight - Natural and actionable
     */
    async getInsight(context: any): Promise<string> {
        const prompt = `
أنتِ أمينة، الشريكة والصديقة المقربة لصاحبة صالون ZenStyle.
تكلمي معاها داخل التطبيق فقط، كأنك قاعدة معاها في الكافي تشربي قهوة وتنصحيها في عملها.

**شخصيتك:**
- فاهمة في البزنس وعندك عين تشوف بها المشاكل قبل ما تقع
- تتكلمي دارجة جزائرية عصرية وعقلانية
- ما تحبيش تعاودي نفس النصيحة - كل مرة تشوفي حاجة جديدة
- صريحة بس محترمة، تقولي الحقيقة بس بأسلوب بناتي

**البيانات اللي عندك:** ${JSON.stringify(context)}

**قواعد النصح:**
1. ما تعاوديش نفس النصيحة اللي قلتيها قبل - شوفي حاجة جديدة في الأرقام
2. لو المبيعات ناقصة: اقترحي promo أو حملة في ستوريات
3. لو المخزون قريب يخلص: نبهيها بوقت كافي
4. لو عاملة ماشية مليح: شجعيها
5. استخدمي أرقام حقيقية من البيانات

**ردك:** نصيحة واحدة واضحة، مباشرة، ومختصرة (3-4 سطور بس). لا تكرري "يا لالة" في كل جملة.
`;

        const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.75
        });
        return response.choices[0]?.message?.content || "";
    },

    /**
     * Analyze client - For business insights
     */
    async analyzeClient(client: any): Promise<any[]> {
        const prompt = `
أنتِ أمينة، الشريكة الاستراتيجية لصالون ZenStyle.
عندك معلومات كاملة على الزبون: ${JSON.stringify(client)}.

حللي سلوك الزبون وقدمي توصية واحدة فقط (مختصرة):
1. لو برونزي: كيفاه نرقيه؟
2. لو زياراته قليلة: شنو نعملو باش يرجع؟
3. لو ينفق بزاف: شنو نعرضلو من خدمات جديدة؟
4. لو آخر زيارة قديمة: كيفاه نعاودو التواصل؟

**قواعد:**
- رد واحد مختصر (سطرين بس)
- ما تعاوديش نفس التوصية اللي قلتيها في المرة اللي فاتت
- استخدمي لغة بناتية عملية
`;

        try {
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            });

            const analysis = response.choices[0]?.message?.content || "لا توجد توصيات حالياً.";

            return [{
                type: 'recommendation',
                message: analysis,
                confidence: 0.85,
                action: 'مراجعة استراتيجية الزبون'
            }];
        } catch (error) {
            console.error("Client Analysis Error:", error);
            return [];
        }
    },

    /**
     * Chat with Partner - Main in-app chat function
     */
    async chatWithPartner(message: string, context: any): Promise<string> {
        const systemPrompt = `
أنتِ أمينة، الشريكة الاستراتيجية والصديقة المقربة لصاحبة صالون ZenStyle.
تكلمي معاها داخل التطبيق فقط.

**شخصيتك:**
- صديقة مقربة وفاهمة في البزنس
- تتكلمي دارجة جزائرية عصرية، ودودة بس عقلانية
- عندك رؤية كاملة على الصالون (مبيعات، مخزون، موظفين، مواعيد)
- ما تحبيش تعاودي نفس الكلام - كل رد يكون مختلف حسب السياق

**السياق الحالي:** ${JSON.stringify(context)}

**قواعد المحادثة:**
1. لو سؤالها عن الأرقام: جاوبي بالأرقام الحقيقية من السياق
2. لو استفسار عن موظف: حللي الأداء بصراحة
3. لو مخاوف من شيء: نبهيها برقة
4. ما تقوليش "يا لالة" في كل جملة - استخدميها مرة أو مرتين بس
5. كوني مختصرة ومفيدة (4-5 سطور بس)
6. لو المحادثة مستمرة: ما ترحبيش من جديد، كملي طبيعي

**أسلوبك:**
- "شوفي، الأرقام تقول..."
- "من وجهة نظري..."
- "ننصحك بـ..."

ما تكرريش نفس الجمل الافتتاحية في كل رد.
`;

        try {
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.75,
                max_tokens: 250
            });
            return response.choices[0]?.message?.content || "اسمحيلي، راني نخمم في السؤال تاعك... 🤔";
        } catch (error) {
            console.error("Amina Chat Error:", error);
            return "كاين مشكل في الاتصال، دقيقة ونرجعلك 🙏";
        }
    }
};

// ==========================================
// 📦 التوافقية مع الكود القديم
// ==========================================

export const aiService = {
    gatherBusinessContext: amina.gatherBusinessContext,
    // [UPDATED] Now uses Amina for In-App Chat (Partner conversation)
    chatWithClient: amina.chatWithPartner,
    getOwnerInsight: amina.getInsight,
    getSmartAlerts: aiUtils.getSmartAlerts,
    analyzeClient: amina.analyzeClient
};

// WhatsApp AI uses Sarah (for customer conversations only)
export const whatsappAI = sarah;
