
import { supabase } from './supabase.js';

// Helper type for response
type ApiResponse<T> = {
    data: T | null;
    error: string | null;
};

export const whatsapp = {
    // Find client by phone number (removes country code prefixes)
    async findClientByPhone(phoneNumber: string): Promise<ApiResponse<any>> {
        try {
            // Clean phone number (remove @s.whatsapp.net, country codes, etc.)
            const cleanPhone = phoneNumber
                .replace('@s.whatsapp.net', '')
                .replace('@c.us', '')
                .replace(/^\+?213/, '') // Remove Algeria country code
                .replace(/\D/g, ''); // Remove non-digits

            // Search in clients table
            const { data, error } = await supabase
                .from('clients')
                .select('id, first_name, last_name, phone, tier, total_spent, last_visit, visit_count')
                .or(`phone.eq.${cleanPhone},phone.eq.0${cleanPhone},phone.eq.+213${cleanPhone}`)
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                return { data: null, error: error.message };
            }

            return { data: data || null, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Get or create WhatsApp session
    async getSession(phoneNumber: string): Promise<ApiResponse<any>> {
        try {
            const { data, error } = await supabase
                .from('whatsapp_sessions')
                .select('*')
                .eq('phone_number', phoneNumber)
                .single();

            if (error && error.code === 'PGRST116') {
                // Session doesn't exist, create it
                const { data: newSession, error: createError } = await supabase
                    .from('whatsapp_sessions')
                    .insert({ phone_number: phoneNumber })
                    .select()
                    .single();

                if (createError) return { data: null, error: createError.message };
                return { data: newSession, error: null };
            }

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Link client to session
    async linkClientToSession(phoneNumber: string, clientId: string): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('whatsapp_sessions')
                .update({ client_id: clientId })
                .eq('phone_number', phoneNumber);

            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Update session messages (keep last 3 only)
    async updateMessages(phoneNumber: string, role: 'user' | 'assistant', content: string): Promise<ApiResponse<boolean>> {
        try {
            // Get current session
            const { data: session } = await supabase
                .from('whatsapp_sessions')
                .select('last_messages, message_count')
                .eq('phone_number', phoneNumber)
                .single();

            if (!session) return { data: null, error: 'Session not found' };

            // Add new message and keep last 3
            const messages = Array.isArray(session.last_messages) ? session.last_messages : [];
            messages.push({
                role,
                content,
                timestamp: new Date().toISOString()
            });

            // Keep only last 20 messages
            const last20 = messages.slice(-20);

            // Update session
            const { error } = await supabase
                .from('whatsapp_sessions')
                .update({
                    last_messages: last20,
                    message_count: (session.message_count || 0) + 1,
                    last_interaction: new Date().toISOString()
                })
                .eq('phone_number', phoneNumber);

            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Get recent messages from session
    async getRecentMessages(phoneNumber: string): Promise<ApiResponse<any[]>> {
        try {
            const { data, error } = await supabase
                .from('whatsapp_sessions')
                .select('last_messages')
                .eq('phone_number', phoneNumber)
                .single();

            if (error) return { data: [], error: null };
            return { data: data?.last_messages || [], error: null };
        } catch {
            return { data: [], error: null };
        }
    },

    // Get booking context for a session
    async getBookingContext(phoneNumber: string): Promise<ApiResponse<any>> {
        try {
            const { data, error } = await supabase
                .from('whatsapp_sessions')
                .select('booking_context, client_id')
                .eq('phone_number', phoneNumber)
                .single();

            if (error) return { data: null, error: error.message };
            return { data: data?.booking_context || {}, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Update booking context for a session
    async updateBookingContext(phoneNumber: string, context: any): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('whatsapp_sessions')
                .update({ booking_context: context })
                .eq('phone_number', phoneNumber);

            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Clear booking context (after completion or cancellation)
    async clearBookingContext(phoneNumber: string): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('whatsapp_sessions')
                .update({ booking_context: {} })
                .eq('phone_number', phoneNumber);

            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Check available time slots for a date
    async getAvailableSlots(date: string, staffId?: string): Promise<ApiResponse<string[]>> {
        try {
            // Get existing appointments for the date
            let query = supabase
                .from('appointments')
                .select('start_time, end_time')
                .eq('date', date)
                .in('status', ['confirmed', 'in-progress']);

            if (staffId) {
                query = query.eq('staff_id', staffId);
            }

            const { data: appointments, error } = await query;

            if (error) return { data: null, error: error.message };

            // Generate all possible slots (9 AM to 7 PM, 30 min intervals)
            const slots: string[] = [];
            const startHour = 9;
            const endHour = 19;

            for (let hour = startHour; hour < endHour; hour++) {
                slots.push(`${hour.toString().padStart(2, '0')}:00`);
                slots.push(`${hour.toString().padStart(2, '0')}:30`);
            }

            // Remove booked slots
            const bookedTimes = new Set(appointments?.map(a => a.start_time) || []);
            const availableSlots = slots.filter(slot => !bookedTimes.has(slot));

            return { data: availableSlots, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    // Get all active services
    async getServices(): Promise<ApiResponse<any[]>> {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('id, name_ar, name_fr, price, duration, category')
                .eq('is_active', true)
                .order('name_ar');

            if (error) return { data: null, error: error.message };
            return { data: data || [], error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    }
};
