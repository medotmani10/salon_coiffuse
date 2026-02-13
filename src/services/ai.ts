// import { supabase } from '@/lib/supabase';
import type { Client, Appointment, Alert } from '@/types';

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
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In a real implementation, we would call an Edge Function here
        // const { data, error } = await supabase.functions.invoke('analyze-client', { body: { client } });

        const insights: AiInsight[] = [];

        // Mock logic based on tier and spending
        if (client.tier === 'platinum') {
            insights.push({
                type: 'recommendation',
                message: 'High value client. Suggest booking the "Luxury Spa Package" for their next visit.',
                confidence: 0.95,
                action: 'Book Spa Package'
            });
        } else if (client.tier === 'bronze' && client.visitCount > 5) {
            insights.push({
                type: 'recommendation',
                message: 'Loyal customer approaching Silver tier. Offer a 10% discount on next service to encourage upgrade.',
                confidence: 0.85,
                action: 'Offer Discount'
            });
        }

        if (client.totalSpent > 50000) {
            insights.push({
                type: 'prediction',
                message: 'Client likely to purchase retail products based on spending habits.',
                confidence: 0.75,
                action: 'Show Products'
            });
        }

        // Generic fallback if no specific insights
        if (insights.length === 0) {
            insights.push({
                type: 'recommendation',
                message: 'Suggest rebooking their last service based on regular cycle.',
                confidence: 0.60
            });
        }

        return insights;
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
