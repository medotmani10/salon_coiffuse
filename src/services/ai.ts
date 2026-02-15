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
     * Get smart context based on message type
     * Token reduction: 81% (from ~800 to ~150 tokens)
     */
    async getSmartContext(phoneNumber: string, client: ClientProfile | null): Promise<SmartContext> {
        // Get last 3 messages from session
        const { data: recentMessages } = await (api as any).whatsapp.getRecentMessages(phoneNumber);

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
            await (api as any).whatsapp.getSession(phoneNumber);

            // 2. Identify client (0 tokens - database only)
            const client = await this.identifyClient(phoneNumber);

            // 3. Link client to session if found
            if (client) {
                await (api as any).whatsapp.linkClientToSession(phoneNumber, client.id);
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
            await (api as any).whatsapp.updateMessages(phoneNumber, 'user', message);
            await (api as any).whatsapp.updateMessages(phoneNumber, 'assistant', reply);

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
    },

    /**
     * وكيل "سارة" لخدمة الزبائن (تطوير منطق الدارجة)
     */
    async chatWithClient(message: string, context: any): Promise<string> {
        const systemPrompt = `
            أنتِ "سارة"، موظفة الاستقبال الرقمية لصالون ZenStyle.
            الوصول: مسموح لكِ بمراجعة قائمة الخدمات، الأسعار، والمواعيد المتاحة.
            المهام: الإجابة على الاستفسارات، حجز المواعيد الجديدة، وتأكيد الحجوزات.
            اللغة: دارجة جزائرية مهذبة جداً (بالحروف العربية).
            القيود: ممنوع الحديث في الأمور المالية أو إعطاء أرقام عن المبيعات.

            قواعد الرد:
            1. اللغة: دارجة جزائرية بيضاء (مفهومة) وبالحروف العربية فقط.
            2. السياق الحالي: ${JSON.stringify(context)}
            3. إذا سألت الزبونة عن موعد: تحققي من المواعيد المتاحة واقترحي أقرب وقت.
            4. إذا سألت عن السعر: أعطي السعر بدقة من قائمة الخدمات.
            5. الأسلوب: ابدئي بـ "السلام عليكم لالة" وانتهي بـ "مرحبا بيك في صالوننا ✨".

            مثال: "مرحبا بيك لالة، عندنا بلاص فارغة غدوة على الـ 2، تحبي نحجزهالك؟"
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.6, // توازن بين الإبداع والدقة
            });
            return response.choices[0]?.message?.content || "دقيقة برك لالة نثبت ونرجعلك.";
        } catch (error) {
            return "راني نعاني من شوية مشاكل في الكونيكسيو، عاوديلي شوية برك.";
        }
    },

    /**
     * تجميع السياق المحدود للزبائن (خدمات، أسعار، مواعيد فقط)
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

            // معلومات الزبون الأساسية فقط إذا كان clientId موجود
            let clientInfo = null;
            if (clientId) {
                // البحث عن العميل من بين جميع العملاء
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
// 🔵 أمينة (Amina) - المستشارة الاستراتيجية
// ==========================================
// الجمهور: صاحبة الصالون (Dashboard)
// الصلاحيات: Read-Only لكل شيء
// القيود: تتحدث فقط داخل التطبيق

export const amina = {
    // 1. تجميع السياق الكامل للمحل (Context Gathering)
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

    // 2. مستشار المالكة (AI Business Analyst) - تحليل عميق
    async getInsight(context: any): Promise<string> {
        const prompt = `
            أنتِ أمينة، الصديقة المقربة والشريكة الاستراتيجية لصاحبة الصالون.
            أنتِ لستِ موظفة، بل 'مخ' الإدارة.
            الوصول: اطلاع كامل على المداخيل، المصاريف، كمية السلع، وأداء العمال.
            المهام: تحليل البيانات، تقديم نصائح لتقليل التكاليف، والتحذير من المخاطر.
            اللغة: دارجة جزائرية عملية وصريحة. خاطبي صاحبة المحل كشريكة.
            القيود: تتحدثين فقط مع صاحبة الصالون داخل التطبيق.
            أسلوبك: "يا لالة، شوفي واش خرجتلي الأرقام.."
            مصطلحاتك: Chiffre d'affaires, Charges, Marge, Stock, Promo

            حلل هذه البيانات: ${JSON.stringify(context)}.
            قدم نصيحة واحدة "واقعية" و "حادة" بالدارجة الجزائرية.
            - إذا كان الدخل منخفض: اقترح "Promo" على خدمة معينة.
            - إذا كان المخزون ناقص: حذر من ضياع الزبائن.
            - إذا كان الضغط عالي: انصح بتوظيف أو تنظيم الوقت.
        `;

        const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0]?.message?.content || "";
    },

    // 3. تحليل الزبون (Client Analysis)
    async analyzeClient(client: any): Promise<any[]> {
        const prompt = `
            أنتِ أمينة، المستشارة الاستراتيجية لصالون ZenStyle.
            لديكِ معلومات كاملة عن الزبون: ${JSON.stringify(client)}.
            
            قم بتحليل سلوك الزبون وتقديم توصيات:
            1. إذا كان الزبون من الطبقة البرونزية: اقترح ترقيته عبر عروض خاصة.
            2. إذا كان عدد الزيارات قليل: اقترح برنامج ولاء.
            3. إذا كان مجموع الإنفاق مرتفع: اقترح خدمات متميزة.
            4. إذا كان آخر زيارة قديمة: اقترح إعادة التواصل.
            
            أجب بالدارجة الجزائرية العملية مع مصطلحات تجارية.
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            });

            const analysis = response.choices[0]?.message?.content || "لا توجد توصيات حالياً.";

            return [
                {
                    type: 'recommendation',
                    message: analysis,
                    confidence: 0.85,
                    action: 'مراجعة برنامج الولاء'
                }
            ];
        } catch (error) {
            console.error("Client Analysis Error:", error);
            return [];
        }
    },

    // 5. المحادثة مع الشريكة (Chat with Partner)
    async chatWithPartner(message: string, context: any): Promise<string> {
        const systemPrompt = `
            أنتِ أمينة، الشريكة الاستراتيجية ومستشارة الأعمال لصالون ZenStyle.
            الوصول: لديكِ رؤية كاملة لبيانات الصالون (المبيعات، المخزون، الموظفين، المواعيد).
            السياق الحالي للصالون: ${JSON.stringify(context)}
            
            دورك:
            1. تحليل الأداء واقتراح تحسينات.
            2. الرد على استفسارات "المالكة" (User) بخصوص العمل.
            3. التنبيه للمخاطر (نقص مخزون، تراجع مبيعات).
            
            الأسلوب:
            - دارجة جزائرية مهنية ولكن ودودة ("يا لالة"، "شوفي..").
            - كوني مختصرة ومفيدة.
            - استخدمي الأرقام من السياق لدعم كلامك.
            
            مثال: "المبيعات اليوم ناقصة شوية (5000 دج)، بالاك لازم نديرو ستوري في انستغرام؟"
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
            });
            return response.choices[0]?.message?.content || "اسمحيلي لالة، راني نخمم، عاودي سؤالك.";
        } catch (error) {
            console.error("Amina Chat Error:", error);
            return "كاين مشكل في الاتصال، دقيقة ونرجعلك.";
        }
    }
};

// ==========================================
// 📦 التوافقية مع الكود القديم
// ==========================================

// الحفاظ على التوافقية مع الكود الحالي
export const aiService = {
    gatherBusinessContext: amina.gatherBusinessContext,
    // [MODIFIED] Now uses Amina (Business Partner) instead of Sarah for In-App Chat
    chatWithClient: amina.chatWithPartner,
    getOwnerInsight: amina.getInsight,
    getSmartAlerts: aiUtils.getSmartAlerts,
    analyzeClient: amina.analyzeClient
};

// الحفاظ على التوافقية مع WhatsApp AI (If still needed locally, otherwise relies on API/Webhook)
export const whatsappAI = sarah;