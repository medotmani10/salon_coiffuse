import OpenAI from 'openai';
import type { Client, Appointment, Alert } from '@/types';
import { api } from './api';

// Initialize OpenRouter client (using OpenAI SDK)
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    dangerouslyAllowBrowser: true
});

// Interface for AI responses
export interface AiInsight {
    type: 'recommendation' | 'prediction' | 'warning';
    message: string;
    confidence: number;
    action?: string;
}

export const aiService = {
    // Gather business context
    async gatherBusinessContext() {
        try {
            const [
                { data: stats },
                { data: upcoming },
                { data: services },
                { data: staff },
                { data: products },
                { data: transactions },
                { data: clients },
                { data: suppliers },
                { data: purchaseOrders }
            ] = await Promise.all([
                api.appointments.getStats(),
                api.appointments.getUpcoming(),
                api.services.getAll(),
                api.staff.getAll(),
                api.products.getAll(),
                api.transactions.getAll('week'),
                api.clients.getAll(),
                api.suppliers.getAll(),
                api.purchaseOrders.getAll()
            ]);

            // Process Clients (Top 5 by spend)
            const topClients = clients?.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5).map(c => ({
                name: `${c.firstName} ${c.lastName}`,
                spent: c.totalSpent,
                tier: c.tier
            }));

            // Map Product to Supplier
            const productSources: Record<string, string> = {};
            purchaseOrders?.forEach((po: any) => {
                po.items.forEach((item: any) => {
                    if (!productSources[item.productNameFr]) {
                        productSources[item.productNameFr] = po.supplierName;
                    }
                });
            });

            // Process Inventory
            const lowStockItems = products?.filter((p: any) => p.stock <= p.minStock).map((p: any) => `${p.nameFr} (${p.stock})`);

            const detailedInventory = products?.map((p: any) => {
                const supplier = productSources[p.nameFr] || 'Unknown';
                return `${p.nameFr}: ${p.stock} units (Supplier: ${supplier})`;
            });

            // Process Suppliers
            const supplierAccounts = suppliers?.map((s: any) => ({
                name: s.name,
                balance: s.balance,
                contact: s.phone
            }));

            return {
                timestamp: new Date().toLocaleString(),
                summary: stats ? {
                    dailyRevenue: stats.totalRevenue,
                    todayAppointments: stats.todayAppointments,
                    totalClients: stats.totalClients
                } : null,
                upcomingAppointments: upcoming?.slice(0, 5).map(a => ({
                    time: a.startTime,
                    client: a.clientName,
                    service: a.services.map(s => s.nameFr).join(', '),
                    status: a.status
                })),
                staff: staff?.filter(s => s.isActive).map(s => s.firstName),
                services: services?.map(s => s.nameFr),
                inventory: {
                    totalItems: products?.length || 0,
                    lowStock: lowStockItems,
                    allItems: detailedInventory,
                    samplePrices: products?.slice(0, 5).map((p: any) => `${p.nameFr}: ${p.price} DA`)
                },
                financials: {
                    weeklyTransactions: transactions?.length || 0,
                    recentSales: transactions?.slice(0, 3).map((t: any) => `${t.total} DA (${t.paymentMethod})`)
                },
                suppliers: supplierAccounts,
                vipClients: topClients
            };
        } catch (error) {
            console.error("Failed to gather context:", error);
            return null;
        }
    },

    // Chat with context (OpenRouter)
    async chat(message: string, context: any): Promise<string> {
        try {
            const contextString = context ? JSON.stringify(context, null, 2) : "No context available.";

            const systemPrompt = `
                You are a helpful AI assistant for a Salon Management App called "ZenStyle".
                You have access to the following real-time business data:
                ${contextString}

                Instructions:
                1. **Persona**: You are a friendly, professional Algerian assistant.
                2. **Language**: **ALWAYS speak in Algerian Darja** (Arabic dialect). Use French terms for technical words (like "shampoo", "coupe", "stock", "client") as is common in Algeria.
                3. **Tone**: Helpful, concise, and respectful.
                4. **Context**: Use the provided data to answer questions accurately. If you don't know, say "ما علاباليش" (I don't know).
            `;

            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini", // OpenRouter model ID
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 1000,
            });

            return response.choices[0]?.message?.content || "No response generated.";

        } catch (error) {
            console.error("OpenRouter Chat Error:", error);
            return "Sorry, I'm having trouble connecting to the AI service right now.";
        }
    },

    // Get dashboard alerts
    async getDashboardAlerts(): Promise<Alert[]> {
        await new Promise(resolve => setTimeout(resolve, 800));
        return [
            {
                id: '1',
                type: 'stock',
                titleAr: 'مخزون منخفض',
                titleFr: 'Stock Faible',
                messageAr: 'منتج "شامبو الكيراتين" وصل للحد الأدنى',
                messageFr: 'Produit "Shampooing Kératine" a atteint le minimum',
                severity: 'warning',
                isRead: false,
                createdAt: new Date(),
            },
        ];
    },

    // Analyze a client's history
    async analyzeClient(client: Client): Promise<AiInsight[]> {
        try {
            const systemPrompt = `
                Analyze this salon client and provide 2-3 short, actionable insights/recommendations in JSON format.
                Output JSON array only.
            `;

            const userPrompt = `
                Client: ${client.firstName} ${client.lastName}
                Tier: ${client.tier}
                Visits: ${client.visitCount}
                Spent: ${client.totalSpent}
                Last Visit: ${client.lastVisit}
            `;

            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            });

            const text = response.choices[0]?.message?.content || "[]";
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed)) return parsed as AiInsight[];
            if (parsed.insights && Array.isArray(parsed.insights)) return parsed.insights as AiInsight[];

            return [];
        } catch (error) {
            console.error("OpenRouter Error:", error);
            return [];
        }
    },

    // Optimize schedule
    async optimizeSchedule(appointments: Appointment[]): Promise<{
        optimized: boolean;
        suggestions: string[];
    }> {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            optimized: appointments.length < 5,
            suggestions: [
                'Move 10:00 AM slot to 10:15 AM to minimize gaps.',
                'Staff "Nadia" has open availability in the afternoon.'
            ]
        };
    },

    // Predict inventory
    async predictInventory(): Promise<{
        lowStock: string[];
        reorderSuggestions: { itemId: string; quantity: number }[];
    }> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            lowStock: ['Shampoo X', 'Hair Dye Y'],
            reorderSuggestions: [
                { itemId: '1', quantity: 10 },
                { itemId: '2', quantity: 5 }
            ]
        };
    }
};
