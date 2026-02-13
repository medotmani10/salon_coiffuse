import { GoogleGenAI } from "@google/genai";
import type { Client, Appointment, Alert } from '@/types';
import { api } from './api';

// Initialize Gemini with new SDK
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

// Interface for AI responses
export interface AiInsight {
    type: 'recommendation' | 'prediction' | 'warning';
    message: string;
    confidence: number;
    action?: string;
}

export const aiService = {
    // Gather business context (Unchanged)
    async gatherBusinessContext() {
        try {
            const [
                { data: stats },
                { data: upcoming },
                { data: services },
                { data: staff }
            ] = await Promise.all([
                api.appointments.getStats(),
                api.appointments.getUpcoming(),
                api.services.getAll(),
                api.staff.getAll()
            ]);

            return {
                timestamp: new Date().toLocaleString(),
                stats: stats ? {
                    dailyRevenue: stats.totalRevenue,
                    appointmentCount: stats.todayAppointments,
                    clientCount: stats.totalClients
                } : null,
                upcomingAppointments: upcoming?.slice(0, 5).map(a => ({
                    time: a.startTime,
                    client: a.clientName,
                    service: a.services.map(s => s.nameFr).join(', '),
                    status: a.status
                })),
                availableStaff: staff?.filter(s => s.isActive).map(s => s.firstName),
                services: services?.map(s => `${s.nameFr} (${s.price} DZD)`)
            };
        } catch (error) {
            console.error("Failed to gather context:", error);
            return null;
        }
    },

    // Chat with context
    async chat(message: string, context: any): Promise<string> {
        try {
            const contextString = context ? JSON.stringify(context, null, 2) : "No context available.";

            const prompt = `
                You are a helpful AI assistant for a Salon Management App called "ZenStyle".
                You have access to the following real-time business data:
                ${contextString}

                User Query: "${message}"

                Instructions:
                1. Answer vaguely if you don't have enough data, but use the provided data if relevant.
                2. Be professional, concise, and helpful.
                3. You can speak in Arabic or French depending on the user's query language. Default to the language of the query.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash", // Using newer model as requested
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ]
            });

            return response.text || "No response generated.";
        } catch (error) {
            console.error("Gemini Chat Error:", error);
            return "Sorry, I'm having trouble connecting to the AI service right now. (SDK Error)";
        }
    },

    // Get dashboard alerts
    async getDashboardAlerts(): Promise<Alert[]> {
        // (Keep existing logic)
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
            // ...
        ];
    },

    // Analyze a client's history
    async analyzeClient(client: Client): Promise<AiInsight[]> {
        try {
            const prompt = `
                Analyze this salon client and provide 2-3 short, actionable insights/recommendations in JSON format.
                Client: ${client.firstName} ${client.lastName}
                Tier: ${client.tier}
                Visits: ${client.visitCount}
                Spent: ${client.totalSpent}
                Last Visit: ${client.lastVisit}

                Output JSON array only.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const text = response.text || "[]";
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const insights = JSON.parse(jsonStr) as AiInsight[];

            return insights;
        } catch (error) {
            console.error("Gemini AI Error:", error);
            return [];
        }
    },
    // Optimize schedule (Keep existing)
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

    // Predict inventory (Keep existing)
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
