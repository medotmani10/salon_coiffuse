/**
 * Amina — Internal CRM AI Partner
 * مساعدة داخلية للموظفين داخل لوحة التحكم فقط.
 * (Sara / WhatsApp bot logic has been moved to n8n)
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const MODEL = 'google/gemini-flash-1.5-8b';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

import { supabase } from '@/lib/supabase';

// ─── Core Chat Function ───────────────────────────────────────────────────────

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        return 'مفتاح OpenRouter غير مضبوط. يرجى إضافة VITE_OPENROUTER_API_KEY في ملف .env';
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: 500,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter error: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'لا يوجد رد من الذكاء الاصطناعي.';
}

// ─── Business Context ─────────────────────────────────────────────────────────

async function gatherBusinessContext(): Promise<string> {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [appointmentsRes, clientsRes, revenueRes] = await Promise.all([
            supabase
                .from('appointments')
                .select('id, status')
                .eq('date', today),
            supabase
                .from('clients')
                .select('id', { count: 'exact', head: true }),
            supabase
                .from('appointments')
                .select('total_amount')
                .eq('date', today)
                .eq('status', 'completed'),
        ]);

        const totalToday = appointmentsRes.data?.length || 0;
        const completed = appointmentsRes.data?.filter((a) => a.status === 'completed').length || 0;
        const totalClients = clientsRes.count || 0;
        const revenue = revenueRes.data?.reduce((sum, a) => sum + (a.total_amount || 0), 0) || 0;

        return `
📊 بيانات اليوم (${today}):
- المواعيد الإجمالية: ${totalToday}
- المواعيد المكتملة: ${completed}
- إجمالي الزبائن: ${totalClients}
- الإيرادات اليومية: ${revenue} دج
    `.trim();
    } catch {
        return 'تعذّر جلب بيانات العمل.';
    }
}

// ─── Amina Methods ────────────────────────────────────────────────────────────

export const amina = {
    /**
     * دردشة داخلية مع الموظفين/المديرين داخل لوحة التحكم
     */
    async chatWithPartner(conversationHistory: { role: string; content: string }[], context: string): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: `أنت أمينة، مساعدة ذكية داخلية لصالون ZenStyle. تساعدين الفريق في فهم أداء الصالون وتقديم التوصيات.
        
${context}

أجيبي بإيجاز وبشكل مفيد. استخدمي العربية أو الفرنسية حسب لغة السؤال.`,
            },
            ...conversationHistory
        ];
        return callAI(messages);
    },

    /**
     * جلب insight سريع للوحة التحكم
     */
    async getInsight(context: string): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: 'أنت أمينة، مساعدة صالون ZenStyle. قدّمي ملاحظة واحدة مفيدة وقصيرة (جملة أو جملتان) بناءً على بيانات اليوم.',
            },
            {
                role: 'user',
                content: `بيانات اليوم:\n${context}\n\nما هي ملاحظتك؟`,
            },
        ];
        return callAI(messages);
    },

    /**
     * تحليل سريع لبيانات زبونة
     */
    async analyzeClient(client: {
        first_name?: string;
        last_name?: string;
        total_visits?: number;
        total_spent?: number;
        last_visit?: string;
    }): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: 'أنت أمينة. حلّلي بيانات الزبونة وقدّمي توصية قصيرة لتحسين تجربتها.',
            },
            {
                role: 'user',
                content: `الزبونة: ${client.first_name || ''} ${client.last_name || ''}
الزيارات: ${client.total_visits || 0}
الإنفاق الإجمالي: ${client.total_spent || 0} دج
آخر زيارة: ${client.last_visit || 'غير معروف'}`,
            },
        ];
        return callAI(messages);
    },

    gatherBusinessContext,
};

// ─── Smart Alerts (from Supabase data) ───────────────────────────────────────

export const aiUtils = {
    gatherBusinessContext,

    async getSmartAlerts(): Promise<import('@/types').Alert[]> {
        const alerts: import('@/types').Alert[] = [];
        const today = new Date().toISOString().split('T')[0];

        try {
            const [apptRes, serviceStats, pendingRes] = await Promise.all([
                // مواعيد اليوم المعلّقة (لم تُأكَّد بعد)
                supabase
                    .from('appointments')
                    .select('id')
                    .eq('date', today)
                    .eq('status', 'pending'),
                // أكثر خدمة محجوزة هذا الشهر
                supabase
                    .from('appointment_services')
                    .select('service_id, services(name_ar, name_fr)')
                    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
                    .limit(100),
                // مواعيد اليوم المؤكدة
                supabase
                    .from('appointments')
                    .select('id')
                    .eq('status', 'confirmed')
                    .eq('date', today),
            ]);

            // تنبيه 1: مواعيد اليوم المعلّقة
            const pendingCount = apptRes.data?.length || 0;
            if (pendingCount > 0) {
                alerts.push({
                    id: 'pending-appts-' + today,
                    type: 'appointment',
                    titleAr: `${pendingCount} موعد بانتظار التأكيد`,
                    titleFr: `${pendingCount} RDV en attente`,
                    messageAr: 'يوجد مواعيد اليوم لم تُؤكَّد بعد. أسرعي بالتأكيد!',
                    messageFr: 'Des rendez-vous du jour ne sont pas encore confirmés.',
                    severity: pendingCount > 2 ? 'error' : 'warning',
                    isRead: false,
                    createdAt: new Date(),
                });
            }

            // تنبيه 2: أكثر خدمة مطلوبة هذا الشهر
            if (serviceStats.data && serviceStats.data.length > 0) {
                const countMap = new Map<string, { nameAr: string; nameFr: string; count: number }>();
                for (const row of serviceStats.data as any[]) {
                    const id = row.service_id;
                    if (!countMap.has(id)) {
                        countMap.set(id, {
                            nameAr: row.services?.name_ar || '',
                            nameFr: row.services?.name_fr || '',
                            count: 0,
                        });
                    }
                    countMap.get(id)!.count++;
                }
                const top = Array.from(countMap.values()).sort((a, b) => b.count - a.count)[0];
                if (top && top.count > 0) {
                    alerts.push({
                        id: 'top-service-' + new Date().getMonth(),
                        type: 'info',
                        titleAr: `⭐ الأكثر طلباً: ${top.nameAr}`,
                        titleFr: `⭐ Service phare: ${top.nameFr}`,
                        messageAr: `${top.nameAr} حُجِزَت ${top.count} مرة هذا الشهر`,
                        messageFr: `${top.nameFr} réservé ${top.count} fois ce mois`,
                        severity: 'info',
                        isRead: false,
                        createdAt: new Date(),
                    });
                }
            }

            // تنبيه 3: مواعيد اليوم المؤكدة
            const confirmedToday = pendingRes.data?.length || 0;
            if (confirmedToday > 0) {
                alerts.push({
                    id: 'confirmed-today-' + today,
                    type: 'appointment',
                    titleAr: `📅 ${confirmedToday} موعد اليوم`,
                    titleFr: `📅 ${confirmedToday} RDV aujourd'hui`,
                    messageAr: `لديك ${confirmedToday} موعد مؤكد اليوم. أداء رائع!`,
                    messageFr: `Vous avez ${confirmedToday} RDV confirmé(s) aujourd'hui.`,
                    severity: 'info',
                    isRead: false,
                    createdAt: new Date(),
                });
            }

        } catch (err) {
            console.error('getSmartAlerts error:', err);
        }

        return alerts;
    },
};
