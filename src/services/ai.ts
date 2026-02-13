import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Client, Appointment, Alert } from '@/types';
import { api } from './api';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Interface for AI responses
export interface AiInsight {
    type: 'recommendation' | 'prediction' | 'warning';
    message: string;
    confidence: number;
    action?: string;
}

export const aiService = {
    // Gather business context from various APIs
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
                4. If asked about revenue or appointments, use the stats provided above.
                5. If specific data is missing, say "I don't have access to that specific record right now."
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Chat Error:", error);
            return "Sorry, I'm having trouble connecting to the AI service right now.";
        }
    },

    // Get dashboard alerts (placeholder for future AI implementation)
    async getDashboardAlerts(): Promise<Alert[]> {
        // ... (existing implementation)
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
            // ... (keep existing alerts)
        ];
    },

    // Analyze a client's history to suggest services
    async analyzeClient(client: Client): Promise<AiInsight[]> {
        try {
            const prompt = `
                Analyze this salon client and provide 2-3 short, actionable insights/recommendations in JSON format.
                Client: ${client.firstName} ${client.lastName}
                Tier: ${client.tier}
                Visits: ${client.visitCount}
                Spent: ${client.totalSpent}
                Last Visit: ${client.lastVisit}

                Output JSON array only:
                [
                    {
                        "type": "recommendation" | "prediction" | "warning",
                        "message": "Short text (max 15 words)",
                        "confidence": 0.0-1.0,
                        "action": "Short action label"
                    }
                ]
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const insights = JSON.parse(jsonStr) as AiInsight[];

            return insights;
        } catch (error) {
            console.error("Gemini AI Error:", error);
            const insights: AiInsight[] = [];
            if (client.tier === 'platinum') {
                insights.push({
                    type: 'recommendation',
                    message: 'High value client. Suggest Luxury Spa Package.',
                    confidence: 0.95,
                    action: 'Book Spa'
                });
            }
            return insights;
        }
    },

    // Optimize schedule based on staff availability and demand
    async optimizeSchedule(appointments: Appointment[]): Promise<{
        optimized: boolean;
        suggestions: string[];
    }> {
        // ... (existing implementation)
        return {
            optimized: appointments.length < 5,
            suggestions: [
                'Move 10:00 AM slot to 10:15 AM to minimize gaps.',
                'Staff "Nadia" has open availability in the afternoon.'
            ]
        };
    },

    // Predict inventory usage
    async predictInventory(): Promise<{
        lowStock: string[];
        reorderSuggestions: { itemId: string; quantity: number }[];
    }> {
        // ... (existing implementation)
        return {
            lowStock: ['Shampoo X', 'Hair Dye Y'],
            reorderSuggestions: [
                { itemId: '1', quantity: 10 },
                { itemId: '2', quantity: 5 }
            ]
        };
    }
};
