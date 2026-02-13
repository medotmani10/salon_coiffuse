import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Client, Appointment, Alert } from '@/types';

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
    // Get dashboard alerts (placeholder for future AI implementation)
    async getDashboardAlerts(): Promise<Alert[]> {
        // Simulate API delay
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
            {
                id: '2',
                type: 'appointment',
                titleAr: 'موعد VIP قادم',
                titleFr: 'Rendez-vous VIP à Venir',
                messageAr: 'العميلة سارة محمد - صبغة شعر كاملة',
                messageFr: 'Cliente Sarah Mohamed - Coloration Complète',
                severity: 'info',
                isRead: false,
                createdAt: new Date(),
            },
            {
                id: '3',
                type: 'goal',
                titleAr: 'الهدف اليومي',
                titleFr: 'Objectif Quotidien',
                messageAr: 'تم تحقيق 85% من الهدف اليومي',
                messageFr: '85% de l\'objectif quotidien atteint',
                severity: 'info',
                isRead: false,
                createdAt: new Date(),
            },
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

            // Basic cleanup to parse JSON if model includes backticks
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const insights = JSON.parse(jsonStr) as AiInsight[];

            return insights;
        } catch (error) {
            console.error("Gemini AI Error:", error);
            // Fallback to mock logic if AI fails
            const insights: AiInsight[] = [];

            if (client.tier === 'platinum') {
                insights.push({
                    type: 'recommendation',
                    message: 'High value client. Suggest Luxury Spa Package.',
                    confidence: 0.95,
                    action: 'Book Spa'
                });
            } else if (client.tier === 'bronze' && client.visitCount > 5) {
                insights.push({
                    type: 'recommendation',
                    message: 'Loyal customer. Offer 10% discount to upgrade.',
                    confidence: 0.85,
                    action: 'Offer Discount'
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
        await new Promise(resolve => setTimeout(resolve, 2000));

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
