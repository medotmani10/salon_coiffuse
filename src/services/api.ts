import { supabase } from '@/lib/supabase';
import type { Client, Appointment, Staff, Service } from '@/types';
import { aiService } from './ai';

// Generic helper for responses
type ApiResponse<T> = {
    data: T | null;
    error: string | null;
};

export const api = {
    ai: aiService,
    clients: {
        async getAll(): Promise<ApiResponse<Client[]>> {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: error.message };

            // Map DB snake_case to Frontend camelCase
            const mappedData = data.map((item: any) => ({
                id: item.id,
                firstName: item.first_name,
                lastName: item.last_name,
                phone: item.phone,
                email: item.email,
                birthDate: item.birth_date ? new Date(item.birth_date) : undefined,
                notes: item.notes,
                loyaltyPoints: item.loyalty_points || 0,
                tier: item.tier || 'bronze',
                totalSpent: item.total_spent || 0,
                visitCount: item.visit_count || 0,
                lastVisit: item.last_visit ? new Date(item.last_visit) : undefined,
                preferredStaff: item.preferred_staff,
                creditBalance: item.credit_balance || 0
            }));

            return { data: mappedData, error: null };
        },

        async create(client: Omit<Client, 'id'>): Promise<ApiResponse<Client>> {
            // Map Frontend camelCase to DB snake_case
            const dbClient = {
                first_name: client.firstName,
                last_name: client.lastName,
                phone: client.phone,
                email: client.email,
                birth_date: client.birthDate,
                notes: client.notes,
                loyalty_points: client.loyaltyPoints,
                tier: client.tier,
                total_spent: client.totalSpent,
                visit_count: client.visitCount,
                last_visit: client.lastVisit
            };

            const { data, error } = await supabase
                .from('clients')
                .insert(dbClient)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            const mappedData = {
                id: data.id,
                firstName: data.first_name,
                lastName: data.last_name,
                phone: data.phone,
                email: data.email,
                birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
                notes: data.notes,
                loyaltyPoints: data.loyalty_points || 0,
                tier: data.tier || 'bronze',
                totalSpent: data.total_spent || 0,
                visitCount: data.visit_count || 0,
                lastVisit: data.last_visit ? new Date(data.last_visit) : undefined,
                creditBalance: data.credit_balance || 0
            } as Client;

            return { data: mappedData, error: null };
        },

        async update(id: string, updates: Partial<Client>): Promise<ApiResponse<Client>> {
            // Map Frontend camelCase to DB snake_case
            const dbUpdates: any = {};
            if (updates.firstName) dbUpdates.first_name = updates.firstName;
            if (updates.lastName) dbUpdates.last_name = updates.lastName;
            if (updates.phone) dbUpdates.phone = updates.phone;
            if (updates.email) dbUpdates.email = updates.email;
            if (updates.birthDate) dbUpdates.birth_date = updates.birthDate;
            if (updates.notes) dbUpdates.notes = updates.notes;
            if (updates.loyaltyPoints !== undefined) dbUpdates.loyalty_points = updates.loyaltyPoints;
            if (updates.tier) dbUpdates.tier = updates.tier;
            if (updates.totalSpent !== undefined) dbUpdates.total_spent = updates.totalSpent;
            if (updates.visitCount !== undefined) dbUpdates.visit_count = updates.visitCount;
            if (updates.lastVisit) dbUpdates.last_visit = updates.lastVisit;

            const { data, error } = await supabase
                .from('clients')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            const mappedData = {
                id: data.id,
                firstName: data.first_name,
                lastName: data.last_name,
                phone: data.phone,
                email: data.email,
                birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
                notes: data.notes,
                loyaltyPoints: data.loyalty_points || 0,
                tier: data.tier || 'bronze',
                totalSpent: data.total_spent || 0,
                visitCount: data.visit_count || 0,
                lastVisit: data.last_visit ? new Date(data.last_visit) : undefined,
                creditBalance: data.credit_balance || 0
            } as Client;

            return { data: mappedData, error: null };
        },

        async getPayments(clientId: string): Promise<ApiResponse<any[]>> {
            try {
                const { data, error } = await supabase
                    .from('client_payments')
                    .select('*')
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('client_payments not available:', error.message);
                    return { data: [], error: null };
                }

                const mapped = (data || []).map((item: any) => ({
                    id: item.id,
                    clientId: item.client_id,
                    type: item.type,
                    amount: item.amount,
                    description: item.description,
                    referenceId: item.reference_id,
                    createdAt: new Date(item.created_at)
                }));

                return { data: mapped, error: null };
            } catch {
                return { data: [], error: null };
            }
        },

        async addPayment(payment: { clientId: string; type: string; amount: number; description?: string; referenceId?: string }): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase
                    .from('client_payments')
                    .insert({
                        client_id: payment.clientId,
                        type: payment.type,
                        amount: payment.amount,
                        description: payment.description || null,
                        reference_id: payment.referenceId || null
                    })
                    .select()
                    .single();

                if (error) {
                    console.warn('client_payments insert failed:', error.message);
                    return { data: null, error: null };
                }
                return { data, error: null };
            } catch {
                return { data: null, error: null };
            }
        },

        async updateCreditBalance(clientId: string, amount: number): Promise<ApiResponse<any>> {
            try {
                const { data: client, error: fetchErr } = await supabase
                    .from('clients')
                    .select('credit_balance')
                    .eq('id', clientId)
                    .single();

                if (fetchErr) {
                    console.warn('credit_balance not available:', fetchErr.message);
                    return { data: null, error: null };
                }

                const newBalance = (client.credit_balance || 0) + amount;
                const { data, error } = await supabase
                    .from('clients')
                    .update({ credit_balance: newBalance })
                    .eq('id', clientId)
                    .select()
                    .single();

                if (error) {
                    console.warn('credit_balance update failed:', error.message);
                    return { data: null, error: null };
                }
                return { data, error: null };
            } catch {
                return { data: null, error: null };
            }
        },

        async addLoyaltyPoints(clientId: string, points: number, totalAmount: number): Promise<ApiResponse<any>> {
            const { data: client, error: fetchErr } = await supabase
                .from('clients')
                .select('loyalty_points, total_spent, visit_count')
                .eq('id', clientId)
                .single();

            if (fetchErr) return { data: null, error: fetchErr.message };

            const newPoints = (client.loyalty_points || 0) + points;
            const newTotalSpent = (client.total_spent || 0) + totalAmount;
            const newVisitCount = (client.visit_count || 0) + 1;

            // Auto-upgrade tier based on total spent
            let newTier = 'bronze';
            if (newTotalSpent >= 200000) newTier = 'platinum';
            else if (newTotalSpent >= 100000) newTier = 'gold';
            else if (newTotalSpent >= 50000) newTier = 'silver';

            const { data, error } = await supabase
                .from('clients')
                .update({
                    loyalty_points: newPoints,
                    total_spent: newTotalSpent,
                    visit_count: newVisitCount,
                    tier: newTier,
                    last_visit: new Date().toISOString()
                })
                .eq('id', clientId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        }
    },

    appointments: {
        async getStats(): Promise<ApiResponse<{
            todayAppointments: number;
            totalClients: number;
            totalRevenue: number;
            monthlyGrowth: number;
            occupancy: number; // Added occupancy
            weeklyData: any[];
            monthlyData: any[];
            serviceDistribution: any[];
            recentActivity: any[];
        }>> {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); // e.g., 'saturday'

            // Parallel fetch for basic stats
            const [
                { count: todayCount, error: todayError },
                { count: clientCount, error: clientError },
                { data: apptRevenueData, error: apptRevenueError },
                { data: txRevenueData, error: txRevenueError },
                { data: recentAppts, error: recentApptsError },
                { data: recentTxs, error: recentTxsError },
                { data: workingHoursData },
                { count: staffCount },
                { data: todayApptsDetails }
            ] = await Promise.all([
                supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('date', todayStr).neq('status', 'cancelled'),
                supabase.from('clients').select('*', { count: 'exact', head: true }),
                supabase.from('appointments').select('total_amount').neq('status', 'cancelled'),
                supabase.from('transactions').select('total').eq('payment_status', 'paid'),
                supabase.from('appointments').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('transactions').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('app_settings').select('value').eq('key', 'working_hours').single(),
                supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('appointments').select('start_time, end_time').eq('date', todayStr).neq('status', 'cancelled')
            ]);

            if (todayError || clientError || apptRevenueError || txRevenueError || recentApptsError || recentTxsError) {
                return { data: null, error: 'Failed to fetch initial stats' };
            }

            // --- Occupancy Calculation ---
            let occupancy = 0;
            if (workingHoursData?.value && staffCount && todayApptsDetails) {
                const hours = workingHoursData.value[dayName];
                if (hours && hours.isOpen) {
                    const openTime = parseInt(hours.open.split(':')[0]) * 60 + parseInt(hours.open.split(':')[1]);
                    const closeTime = parseInt(hours.close.split(':')[0]) * 60 + parseInt(hours.close.split(':')[1]);
                    const dailyMinutesPerStaff = closeTime - openTime;
                    const totalCapacityMinutes = dailyMinutesPerStaff * staffCount;

                    if (totalCapacityMinutes > 0) {
                        const bookedMinutes = todayApptsDetails.reduce((acc: number, appt: any) => {
                            const start = parseInt(appt.start_time.split(':')[0]) * 60 + parseInt(appt.start_time.split(':')[1]);
                            const end = parseInt(appt.end_time.split(':')[0]) * 60 + parseInt(appt.end_time.split(':')[1]);
                            return acc + (end - start);
                        }, 0);

                        occupancy = Math.round((bookedMinutes / totalCapacityMinutes) * 100);
                    }
                }
            }


            const apptRevenue = apptRevenueData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
            const txRevenue = txRevenueData?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;
            const totalRevenue = apptRevenue + txRevenue;

            // --- Weekly Data Calculation (appointments + transactions) ---
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 6);
            const lastWeekStr = lastWeek.toISOString().split('T')[0];

            const [
                { data: weeklyAppts },
                { data: weeklyTxs }
            ] = await Promise.all([
                supabase.from('appointments').select('date, total_amount').gte('date', lastWeekStr).neq('status', 'cancelled'),
                supabase.from('transactions').select('created_at, total').gte('created_at', lastWeek.toISOString()).eq('payment_status', 'paid')
            ]);

            const weeklyMap = new Map();
            for (let i = 0; i < 7; i++) {
                const d = new Date(lastWeek);
                d.setDate(lastWeek.getDate() + i);
                const dayStr = d.toISOString().split('T')[0];
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                weeklyMap.set(dayStr, { day: dayName, revenue: 0, appointments: 0 });
            }

            weeklyAppts?.forEach(appt => {
                if (weeklyMap.has(appt.date)) {
                    const entry = weeklyMap.get(appt.date);
                    entry.revenue += appt.total_amount || 0;
                    entry.appointments += 1;
                }
            });

            weeklyTxs?.forEach(tx => {
                const txDate = new Date(tx.created_at).toISOString().split('T')[0];
                if (weeklyMap.has(txDate)) {
                    weeklyMap.get(txDate).revenue += Number(tx.total) || 0;
                }
            });

            const weeklyData = Array.from(weeklyMap.values());

            // --- Monthly Data (last 6 months) ---
            const monthlyMap = new Map();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                monthlyMap.set(key, { month: monthName, revenue: 0 });
            }

            const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

            const [
                { data: monthlyAppts },
                { data: monthlyTxs }
            ] = await Promise.all([
                supabase.from('appointments').select('date, total_amount').gte('date', sixMonthsAgoStr).neq('status', 'cancelled'),
                supabase.from('transactions').select('created_at, total').gte('created_at', sixMonthsAgo.toISOString()).eq('payment_status', 'paid')
            ]);

            monthlyAppts?.forEach(appt => {
                const key = appt.date.substring(0, 7); // YYYY-MM
                if (monthlyMap.has(key)) {
                    monthlyMap.get(key).revenue += appt.total_amount || 0;
                }
            });

            monthlyTxs?.forEach(tx => {
                const key = new Date(tx.created_at).toISOString().substring(0, 7);
                if (monthlyMap.has(key)) {
                    monthlyMap.get(key).revenue += Number(tx.total) || 0;
                }
            });

            const monthlyData = Array.from(monthlyMap.values());

            // --- Service Distribution ---
            const { data: serviceStats, error: serviceStatsError } = await supabase
                .from('appointment_services')
                .select(`
                   service_id,
                   services (name_fr, color)
               `);

            if (serviceStatsError) {
                console.error('Error fetching service stats:', serviceStatsError);
                return { data: null, error: 'Failed to fetch service distribution' };
            }

            const serviceCountMap = new Map();
            let totalServices = 0;
            serviceStats?.forEach((item: any) => {
                if (item.services) {
                    const name = item.services.name_fr;
                    const color = item.services.color;
                    if (!serviceCountMap.has(name)) {
                        serviceCountMap.set(name, { name, value: 0, color });
                    }
                    serviceCountMap.get(name).value += 1;
                    totalServices++;
                }
            });

            const serviceDistribution = totalServices > 0
                ? Array.from(serviceCountMap.values())
                    .map(item => ({ ...item, value: Math.round((item.value / totalServices) * 100) }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                : [];

            // --- Recent Activity (mixed: appointments + transactions) ---
            const apptActivity = recentAppts?.map((appt: any) => ({
                id: appt.id,
                action: 'Rendez-vous',
                client: appt.clients ? `${appt.clients.first_name} ${appt.clients.last_name}` : 'Unknown',
                time: new Date(appt.created_at).toLocaleTimeString().slice(0, 5),
                type: 'appointment',
                amount: `${appt.total_amount} DZD`,
                sortDate: new Date(appt.created_at)
            })) || [];

            const txActivity = recentTxs?.map((tx: any) => ({
                id: tx.id,
                action: 'Vente POS',
                client: tx.clients ? `${tx.clients.first_name} ${tx.clients.last_name}` : 'Client Direct',
                time: new Date(tx.created_at).toLocaleTimeString().slice(0, 5),
                type: 'payment',
                amount: `${tx.total} DZD`,
                sortDate: new Date(tx.created_at)
            })) || [];

            const recentActivity = [...apptActivity, ...txActivity]
                .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
                .slice(0, 5)
                .map(({ sortDate, ...rest }) => rest);


            return {
                data: {
                    todayAppointments: todayCount || 0,
                    totalClients: clientCount || 0,
                    totalRevenue,
                    monthlyGrowth: 0,
                    occupancy, // Return calculated occupancy
                    weeklyData,
                    monthlyData,
                    serviceDistribution,
                    recentActivity
                },
                error: null
            };
        },

        async getUpcoming(): Promise<ApiResponse<Appointment[]>> {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    clients (first_name, last_name),
                    staff (first_name, last_name),
                    appointment_services (
                        price_at_booking,
                        services (name_ar, name_fr, color, duration)
                    )
                `)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) return { data: null, error: error.message };

            // Map DB structure to Appointment interface
            const mappedData: Appointment[] = data.map((item: any) => ({
                id: item.id,
                clientId: item.client_id,
                staffId: item.staff_id,
                date: item.date,
                startTime: item.start_time.slice(0, 5), // Ensure HH:MM format
                endTime: item.end_time.slice(0, 5),
                status: item.status,
                notes: item.notes,
                totalAmount: item.total_amount,
                clientName: item.clients ? `${item.clients.first_name} ${item.clients.last_name}` : 'Unknown',
                staffName: item.staff ? `${item.staff.first_name} ${item.staff.last_name}` : 'Unknown',
                services: item.appointment_services ? item.appointment_services.map((as: any) => ({
                    nameAr: as.services?.name_ar || '',
                    nameFr: as.services?.name_fr || '',
                    color: as.services?.color || '#000000',
                    price: as.price_at_booking,
                    duration: as.services?.duration || 0
                })) : []
            }));

            return { data: mappedData, error: null };
        },

        async checkAvailability(staffId: string, date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
            let query = supabase
                .from('appointments')
                .select('id')
                .eq('staff_id', staffId)
                .eq('date', date)
                .neq('status', 'cancelled')
                .lt('start_time', endTime)
                .gt('end_time', startTime);

            if (excludeId) {
                query = query.neq('id', excludeId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error checking availability:', error);
                return false;
            }

            return data.length === 0;
        },

        async create(appointment: Omit<Appointment, 'id'>): Promise<ApiResponse<Appointment>> {
            // 1. Insert the base appointment
            const dbAppointment = {
                client_id: appointment.clientId,
                staff_id: appointment.staffId,
                date: appointment.date,
                start_time: appointment.startTime,
                end_time: appointment.endTime,
                status: appointment.status,
                notes: appointment.notes,
                total_amount: appointment.totalAmount
            };

            const { data: newAppt, error: apptError } = await supabase
                .from('appointments')
                .insert(dbAppointment)
                .select()
                .single();

            if (apptError) return { data: null, error: apptError.message };

            // 2. Insert linked services if any
            if (appointment.services && appointment.services.length > 0) {
                const serviceInserts = appointment.services.map(s => ({
                    appointment_id: newAppt.id,
                    service_id: s.serviceId,
                    price_at_booking: s.price
                }));

                const { error: serviceError } = await supabase
                    .from('appointment_services')
                    .insert(serviceInserts);

                if (serviceError) {
                    console.error('Error linking services:', serviceError);
                    // Optional: revert appointment creation or just warn
                }
            }

            // 3. Return mapped object (simplified for now as full fetch is heavy)
            const mappedData: Appointment = {
                id: newAppt.id,
                clientId: newAppt.client_id,
                clientName: 'Loading...',
                staffId: newAppt.staff_id,
                staffName: 'Loading...',
                date: newAppt.date,
                startTime: newAppt.start_time,
                endTime: newAppt.end_time,
                status: newAppt.status,
                notes: newAppt.notes,
                totalAmount: newAppt.total_amount,
                services: appointment.services || []
            };

            return { data: mappedData, error: null };
        },

        async getByDate(date: string): Promise<ApiResponse<Appointment[]>> {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    clients (first_name, last_name),
                    staff (first_name, last_name),
                    appointment_services (
                        price_at_booking,
                        services (name_ar, name_fr, color, duration)
                    )
                `)
                .eq('date', date)
                .order('start_time', { ascending: true });

            if (error) return { data: null, error: error.message };

            const mappedData: Appointment[] = data.map((item: any) => ({
                id: item.id,
                clientId: item.client_id,
                staffId: item.staff_id,
                date: item.date,
                startTime: item.start_time.slice(0, 5),
                endTime: item.end_time.slice(0, 5),
                status: item.status,
                notes: item.notes,
                totalAmount: item.total_amount,
                clientName: item.clients ? `${item.clients.first_name} ${item.clients.last_name}` : 'Unknown',
                staffName: item.staff ? `${item.staff.first_name} ${item.staff.last_name}` : 'Unknown',
                services: item.appointment_services ? item.appointment_services.map((as: any) => ({
                    nameAr: as.services?.name_ar || '',
                    nameFr: as.services?.name_fr || '',
                    color: as.services?.color || '#000000',
                    price: as.price_at_booking,
                    duration: as.services?.duration || 0
                })) : []
            }));

            return { data: mappedData, error: null };
        },

        async update(id: string, updates: Partial<Appointment>): Promise<ApiResponse<any>> {
            const dbUpdates: any = {};
            if (updates.clientId) dbUpdates.client_id = updates.clientId;
            if (updates.staffId) dbUpdates.staff_id = updates.staffId;
            if (updates.date) dbUpdates.date = updates.date;
            if (updates.startTime) dbUpdates.start_time = updates.startTime;
            if (updates.endTime) dbUpdates.end_time = updates.endTime;
            if (updates.status) dbUpdates.status = updates.status;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
            dbUpdates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('appointments')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async updateStatus(id: string, status: string): Promise<ApiResponse<any>> {
            const { data, error } = await supabase
                .from('appointments')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);

            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        }
    },

    services: {
        async getAll(): Promise<ApiResponse<Service[]>> {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('is_active', true);

            if (error) return { data: null, error: error.message };

            // Map DB snake_case to Frontend camelCase
            const mappedData = data.map((item: any) => ({
                id: item.id,
                nameAr: item.name_ar,
                nameFr: item.name_fr,
                category: item.category,
                price: item.price,
                duration: item.duration,
                descriptionAr: item.description_ar,
                descriptionFr: item.description_fr,
                color: item.color
            }));

            return { data: mappedData, error: null };
        },

        async create(service: Omit<Service, 'id'>): Promise<ApiResponse<Service>> {
            const dbService = {
                name_ar: service.nameAr,
                name_fr: service.nameFr,
                category: service.category,
                price: service.price,
                duration: service.duration,
                description_ar: service.descriptionAr,
                description_fr: service.descriptionFr,
                color: service.color,
                is_active: true
            };

            const { data, error } = await supabase
                .from('services')
                .insert(dbService)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            const mappedData: Service = {
                id: data.id,
                nameAr: data.name_ar,
                nameFr: data.name_fr,
                category: data.category,
                price: data.price,
                duration: data.duration,
                descriptionAr: data.description_ar,
                descriptionFr: data.description_fr,
                color: data.color
            };

            return { data: mappedData, error: null };
        }
    },

    staff: {
        async getAll(): Promise<ApiResponse<Staff[]>> {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: error.message };

            const mappedData = data.map((item: any) => ({
                id: item.id,
                firstName: item.first_name,
                lastName: item.last_name,
                phone: item.phone,
                email: item.email,
                specialty: item.specialties || [],
                commissionRate: item.commission_rate || 0,
                baseSalary: item.base_salary || 0,
                salaryType: item.salary_type || 'monthly',
                hireDate: item.hire_date ? new Date(item.hire_date) : new Date(),
                isActive: item.is_active,
                workingHours: item.working_hours || {},
                avatarUrl: item.avatar_url
            }));

            return { data: mappedData, error: null };
        },

        async create(staff: Omit<Staff, 'id'>): Promise<ApiResponse<Staff>> {
            const dbStaff: any = {
                first_name: staff.firstName,
                last_name: staff.lastName,
                phone: staff.phone || null,
                email: staff.email || null,
                specialties: staff.specialty || [],
                commission_rate: staff.commissionRate || 0,
                base_salary: staff.baseSalary || 0,
                hire_date: staff.hireDate ? new Date(staff.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                is_active: true,
                working_hours: staff.workingHours || {}
            };

            // Try with salary_type, fall back without if column doesn't exist yet
            if (staff.salaryType) {
                dbStaff.salary_type = staff.salaryType;
            }

            let { data, error } = await supabase.from('staff').insert(dbStaff).select().single();

            // If error mentions salary_type column, retry without it
            if (error && error.message?.includes('salary_type')) {
                delete dbStaff.salary_type;
                const retry = await supabase.from('staff').insert(dbStaff).select().single();
                data = retry.data;
                error = retry.error;
            }

            if (error) {
                console.error('Staff create error:', error);
                return { data: null, error: error.message };
            }

            return {
                data: {
                    id: data.id,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    phone: data.phone,
                    email: data.email,
                    specialty: data.specialties || [],
                    commissionRate: data.commission_rate || 0,
                    baseSalary: data.base_salary || 0,
                    salaryType: data.salary_type || staff.salaryType || 'monthly',
                    hireDate: new Date(data.hire_date),
                    isActive: data.is_active,
                    workingHours: data.working_hours || {}
                } as Staff,
                error: null
            };
        },

        async update(id: string, updates: Partial<Staff>): Promise<ApiResponse<any>> {
            const dbUpdates: any = {};
            if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
            if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
            if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
            if (updates.email !== undefined) dbUpdates.email = updates.email;
            if (updates.specialty !== undefined) dbUpdates.specialties = updates.specialty;
            if (updates.commissionRate !== undefined) dbUpdates.commission_rate = updates.commissionRate;
            if (updates.baseSalary !== undefined) dbUpdates.base_salary = updates.baseSalary;
            if (updates.salaryType !== undefined) dbUpdates.salary_type = updates.salaryType;
            if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
            if (updates.workingHours !== undefined) dbUpdates.working_hours = updates.workingHours;

            const { data, error } = await supabase
                .from('staff')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('staff').update({ is_active: false }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        async toggleAvailability(id: string, isActive: boolean): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('staff').update({ is_active: isActive }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        async getPayments(staffId: string): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase
                .from('staff_payments')
                .select('*')
                .eq('staff_id', staffId)
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: error.message };

            const mapped = data.map((p: any) => ({
                id: p.id,
                staffId: p.staff_id,
                type: p.type,
                amount: Number(p.amount),
                description: p.description,
                referenceId: p.reference_id,
                createdAt: new Date(p.created_at)
            }));

            return { data: mapped, error: null };
        },

        async addPayment(payment: { staffId: string; type: string; amount: number; description?: string; referenceId?: string }): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('staff_payments').insert({
                staff_id: payment.staffId,
                type: payment.type,
                amount: payment.amount,
                description: payment.description || null,
                reference_id: payment.referenceId || null
            }).select().single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async getBalance(staffId: string): Promise<{ totalDue: number; totalPaid: number; balance: number }> {
            const { data } = await supabase
                .from('staff_payments')
                .select('type, amount')
                .eq('staff_id', staffId);

            let totalDue = 0;
            let totalPaid = 0;

            data?.forEach((p: any) => {
                const amt = Number(p.amount);
                if (p.type === 'commission' || p.type === 'salary' || p.type === 'bonus') {
                    totalDue += amt;
                }
                if (p.type === 'advance' || p.type === 'deduction') {
                    totalPaid += amt;
                }
            });

            return { totalDue, totalPaid, balance: totalDue - totalPaid };
        }
    },

    products: {
        async getAll(): Promise<ApiResponse<any[]>> { // TODO: Define Product type in types/index.ts
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name_fr', { ascending: true });

            if (error) return { data: null, error: error.message };

            const mappedData = data.map((item: any) => ({
                id: item.id,
                nameAr: item.name_ar,
                nameFr: item.name_fr,
                category: item.category,
                price: item.price,
                stock: item.stock,
                minStock: item.min_stock,
                expiryDate: item.expiry_date ? new Date(item.expiry_date) : undefined
            }));

            return { data: mappedData, error: null };
        },

        // Simple stock update (decrement)
        async updateStock(id: string, quantity: number): Promise<ApiResponse<boolean>> {
            // Fetch current stock first
            const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('stock')
                .eq('id', id)
                .single();

            if (fetchError || !product) return { data: null, error: 'Product not found' };

            // For stock update in POS (sales), we subtract.
            // If we want to add stock (restock), we should probably pass a negative quantity or add a mode.
            // For now, adhering to POS logic which sends positive quantity for sold items.
            const finalStock = (product.stock || 0) - quantity;

            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: finalStock })
                .eq('id', id);

            if (updateError) return { data: null, error: updateError.message };

            return { data: true, error: null };
        },

        async create(product: any): Promise<ApiResponse<any>> {
            const dbProduct = {
                name_ar: product.nameAr,
                name_fr: product.nameFr,
                category: product.category,
                price: product.price,
                stock: product.stock,
                min_stock: product.minStock,
                expiry_date: product.expiryDate
            };

            const { data, error } = await supabase
                .from('products')
                .insert(dbProduct)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            const mappedData = {
                id: data.id,
                nameAr: data.name_ar,
                nameFr: data.name_fr,
                category: data.category,
                price: data.price,
                stock: data.stock,
                minStock: data.min_stock,
                expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined
            };

            return { data: mappedData, error: null };
        },

        async update(id: string, updates: any): Promise<ApiResponse<any>> {
            const dbUpdates: any = {};
            if (updates.nameAr) dbUpdates.name_ar = updates.nameAr;
            if (updates.nameFr) dbUpdates.name_fr = updates.nameFr;
            if (updates.category) dbUpdates.category = updates.category;
            if (updates.price !== undefined) dbUpdates.price = updates.price;
            if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
            if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
            if (updates.expiryDate) dbUpdates.expiry_date = updates.expiryDate;

            const { data, error } = await supabase
                .from('products')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            const mappedData = {
                id: data.id,
                nameAr: data.name_ar,
                nameFr: data.name_fr,
                category: data.category,
                price: data.price,
                stock: data.stock,
                minStock: data.min_stock,
                expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined
            };

            return { data: mappedData, error: null };
        },

        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        }
    },

    transactions: {
        async create(transaction: {
            clientId?: string | null;
            staffId?: string;
            subtotal?: number;
            discount?: number;
            tax?: number;
            totalAmount: number;
            paymentMethod: string;
            items: any[];
        }): Promise<ApiResponse<any>> {

            // 1. Create Transaction Header
            const dbTransaction = {
                client_id: transaction.clientId || null,
                staff_id: transaction.staffId || null,
                subtotal: transaction.subtotal ?? transaction.totalAmount,
                discount: transaction.discount ?? 0,
                tax: transaction.tax ?? 0,
                total: transaction.totalAmount,
                payment_method: transaction.paymentMethod,
                payment_status: 'paid',
                created_at: new Date().toISOString()
            };

            const { data: newTx, error: txError } = await supabase
                .from('transactions')
                .insert(dbTransaction)
                .select()
                .single();

            if (txError) return { data: null, error: txError.message };

            // 2. Create Transaction Items & Update Stock
            if (transaction.items && transaction.items.length > 0) {
                const itemsToInsert = transaction.items.map((item: any) => ({
                    transaction_id: newTx.id,
                    item_type: 'product', // Or 'service', currently generic
                    item_id: item.id,
                    name_ar: item.nameAr,
                    name_fr: item.nameFr,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total: item.price * item.quantity
                }));

                const { error: itemsError } = await supabase
                    .from('transaction_items')
                    .insert(itemsToInsert);

                if (itemsError) {
                    console.error('Error inserting transaction items:', itemsError);
                    // Critical failure, might need cleanup
                }

                // 3. Update Stock for Products
                for (const item of transaction.items) {
                    // Update stock only for products (assuming services have no stock)
                    // We call the basic updateStock method
                    await api.products.updateStock(item.id, item.quantity);
                }
            }

            return { data: newTx, error: null };
        },

        async getAll(period: 'today' | 'week' | 'month' | 'all' = 'all'): Promise<ApiResponse<any[]>> {
            try {
                let query = supabase
                    .from('transactions')
                    .select('*, clients(first_name, last_name), staff(first_name, last_name)')
                    .order('created_at', { ascending: false });

                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

                if (period === 'today') {
                    query = query.gte('created_at', today);
                } else if (period === 'week') {
                    const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
                    query = query.gte('created_at', weekAgo);
                } else if (period === 'month') {
                    const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
                    query = query.gte('created_at', monthAgo);
                }

                const { data, error } = await query;

                if (error) throw error;

                const mapped = data.map((item: any) => ({
                    id: item.id,
                    clientName: item.clients ? `${item.clients.first_name} ${item.clients.last_name}` : 'Unknown',
                    staffName: item.staff ? `${item.staff.first_name} ${item.staff.last_name}` : 'Unknown',
                    total: item.total,
                    paymentMethod: item.payment_method,
                    status: item.payment_status,
                    date: new Date(item.created_at)
                }));

                return { data: mapped, error: null };
            } catch (err: any) {
                return { data: null, error: err.message };
            }
        },

        async getItems(transactionId: string): Promise<ApiResponse<any[]>> {
            try {
                const { data, error } = await supabase
                    .from('transaction_items')
                    .select('*')
                    .eq('transaction_id', transactionId);
                if (error) return { data: [], error: error.message };
                return { data: data || [], error: null };
            } catch {
                return { data: [], error: null };
            }
        }
    },

    reports: {
        async getFinancialData(startDate?: Date, endDate?: Date): Promise<ApiResponse<any>> {
            try {
                let query = supabase
                    .from('transactions')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (startDate) query = query.gte('created_at', startDate.toISOString());
                if (endDate) query = query.lte('created_at', endDate.toISOString());

                const { data: transactions, error } = await query;

                if (error) return { data: null, error: error.message };

                // Group by month
                const monthlyMap = new Map<string, { revenue: number; count: number }>();
                const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

                (transactions || []).forEach((tx: any) => {
                    const d = new Date(tx.created_at);
                    const key = `${d.getFullYear()}-${d.getMonth()}`;
                    const existing = monthlyMap.get(key) || { revenue: 0, count: 0 };
                    existing.revenue += Number(tx.total) || 0;
                    existing.count += 1;
                    monthlyMap.set(key, existing);
                });

                const monthlyRevenue = Array.from(monthlyMap.entries()).map(([key, val]) => {
                    const [, monthIdx] = key.split('-');
                    return {
                        month: monthNames[Number(monthIdx)],
                        revenue: val.revenue,
                        expenses: Math.round(val.revenue * 0.6), // Estimate expenses as ~60%
                        profit: Math.round(val.revenue * 0.4),
                        count: val.count
                    };
                }); // Removed slice(-6) to show all matching range

                const totalRevenue = (transactions || []).reduce((s: number, tx: any) => s + (Number(tx.total) || 0), 0);
                const totalTransactions = (transactions || []).length;

                // Payment method distribution
                const paymentMethods: Record<string, number> = {};
                (transactions || []).forEach((tx: any) => {
                    const method = tx.payment_method || 'other';
                    paymentMethods[method] = (paymentMethods[method] || 0) + (Number(tx.total) || 0);
                });

                return {
                    data: {
                        monthlyRevenue,
                        totalRevenue,
                        totalTransactions,
                        totalExpenses: Math.round(totalRevenue * 0.6),
                        totalProfit: Math.round(totalRevenue * 0.4),
                        paymentMethods
                    },
                    error: null
                };
            } catch {
                return { data: null, error: 'Failed to load financial data' };
            }
        },

        async getServiceDistribution(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
            try {
                // We need to join with transactions to filter by date
                let query = supabase
                    .from('transaction_items')
                    .select('*, transactions!inner(created_at)');

                if (startDate) query = query.gte('transactions.created_at', startDate.toISOString());
                if (endDate) query = query.lte('transactions.created_at', endDate.toISOString());

                const { data: items, error } = await query;

                if (error) return { data: [], error: error.message };

                // Group by name
                const serviceMap = new Map<string, { amount: number; count: number }>();
                (items || []).forEach((item: any) => {
                    const name = item.name_fr || item.name_ar || 'Autre';
                    const existing = serviceMap.get(name) || { amount: 0, count: 0 };
                    existing.amount += Number(item.total) || 0;
                    existing.count += item.quantity || 1;
                    serviceMap.set(name, existing);
                });

                const totalAmount = Array.from(serviceMap.values()).reduce((s, v) => s + v.amount, 0);

                const distribution = Array.from(serviceMap.entries())
                    .map(([name, val]) => ({
                        name,
                        amount: val.amount,
                        value: totalAmount > 0 ? Math.round((val.amount / totalAmount) * 100) : 0,
                        count: val.count
                    }))
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 8);

                return { data: distribution, error: null };
            } catch {
                return { data: [], error: null };
            }
        },

        async getStaffPerformance(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
            try {
                // Get staff
                const { data: staffList } = await supabase
                    .from('staff')
                    .select('id, first_name, last_name, commission_rate')
                    .eq('is_active', true);

                if (!staffList || staffList.length === 0) return { data: [], error: null };

                // Get transactions per staff with date filter
                let query = supabase
                    .from('transactions')
                    .select('staff_id, total, client_id, created_at');

                if (startDate) query = query.gte('created_at', startDate.toISOString());
                if (endDate) query = query.lte('created_at', endDate.toISOString());

                const { data: transactions } = await query;

                const staffStats = (staffList || []).map((s: any) => {
                    const staffTx = (transactions || []).filter((tx: any) => tx.staff_id === s.id);
                    const revenue = staffTx.reduce((sum: number, tx: any) => sum + (Number(tx.total) || 0), 0);
                    const uniqueClients = new Set(staffTx.filter((tx: any) => tx.client_id).map((tx: any) => tx.client_id)).size;

                    return {
                        name: `${s.first_name} ${s.last_name}`,
                        revenue,
                        clients: uniqueClients,
                        transactions: staffTx.length,
                        commission: s.commission_rate || 0
                    };
                }).sort((a: any, b: any) => b.revenue - a.revenue);

                return { data: staffStats, error: null };
            } catch {
                return { data: [], error: null };
            }
        },

        async getInventoryReport(): Promise<ApiResponse<any[]>> {
            try {
                const { data: products } = await supabase
                    .from('products')
                    .select('*')
                    .order('stock', { ascending: true });

                const inventory = (products || []).map((p: any) => ({
                    name: p.name_fr || p.name_ar || 'N/A',
                    stock: p.stock || 0,
                    minStock: p.min_stock || 5,
                    price: p.price || 0,
                    category: p.category || 'Autre'
                }));

                return { data: inventory, error: null };
            } catch {
                return { data: [], error: null };
            }
        }
    },

    suppliers: {
        async getAll(): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) return { data: null, error: error.message };

            const mappedData = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                contactPerson: item.contact_person,
                phone: item.phone,
                email: item.email,
                address: item.address,
                city: item.city,
                isActive: item.is_active,
                totalOrders: 0, // Placeholder
                totalSpent: 0,   // Placeholder
                balance: item.balance || 0
            }));

            return { data: mappedData, error: null };
        },

        async create(supplier: any): Promise<ApiResponse<any>> {
            const dbSupplier = {
                name: supplier.name,
                contact_person: supplier.contactPerson,
                phone: supplier.phone,
                email: supplier.email,
                address: supplier.address,
                city: supplier.city,
                is_active: true,
                balance: 0
            };

            const { data, error } = await supabase
                .from('suppliers')
                .insert(dbSupplier)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            return { data: { ...data, contactPerson: data.contact_person, isActive: data.is_active, balance: data.balance }, error: null };
        },

        async updateBalance(id: string, amount: number): Promise<ApiResponse<any>> {
            // First get current balance
            const { data: current, error: fetchError } = await supabase
                .from('suppliers')
                .select('balance')
                .eq('id', id)
                .single();

            if (fetchError) return { data: null, error: fetchError.message };

            const newBalance = (current.balance || 0) + amount;

            const { data, error } = await supabase
                .from('suppliers')
                .update({ balance: newBalance })
                .eq('id', id)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async getHistory(id: string): Promise<ApiResponse<any[]>> {
            // 1. Fetch Purchase Orders (Debts)
            const { data: orders, error: ordersError } = await supabase
                .from('purchase_orders')
                .select('id, created_at, total')
                .eq('supplier_id', id);

            if (ordersError) return { data: null, error: ordersError.message };

            // 2. Fetch Payments (Credits)
            const { data: payments, error: paymentsError } = await supabase
                .from('supplier_payments')
                .select('*')
                .eq('supplier_id', id);

            if (paymentsError) return { data: null, error: paymentsError.message };

            // 3. Combine and Sort
            const combined = [
                ...(orders || []).map((o: any) => ({
                    id: o.id,
                    date: o.created_at,
                    type: 'order',
                    amount: o.total,
                    description: `Order`
                })),
                ...(payments || []).map((p: any) => ({
                    id: p.id,
                    date: p.payment_date,
                    type: 'payment',
                    amount: p.amount,
                    description: p.notes || 'Payment'
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return { data: combined, error: null };
        }
    },

    supplierPayments: {
        async create(payment: { supplierId: string, amount: number, date: string, method?: string, notes?: string }): Promise<ApiResponse<any>> {
            const { data, error } = await supabase
                .from('supplier_payments')
                .insert({
                    supplier_id: payment.supplierId,
                    amount: payment.amount,
                    payment_date: payment.date,
                    payment_method: payment.method,
                    notes: payment.notes
                })
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        }
    },

    purchaseOrders: {
        async getAll(): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    suppliers (name),
                    purchase_order_items (
                        *,
                        products (name_fr)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: error.message };

            const mappedData = data.map((item: any) => ({
                id: item.id,
                supplierId: item.supplier_id,
                supplierName: item.suppliers?.name || 'Unknown',
                orderDate: new Date(item.order_date),
                expectedDate: item.expected_date ? new Date(item.expected_date) : undefined,
                receivedDate: item.received_date ? new Date(item.received_date) : undefined,
                status: item.status,
                items: item.purchase_order_items.map((i: any) => ({
                    id: i.id,
                    productId: i.product_id,
                    productNameFr: i.products?.name_fr || 'Unknown',
                    quantity: i.quantity,
                    unitPrice: i.unit_price,
                    total: i.total
                })),
                subtotal: item.subtotal,
                tax: item.tax,
                total: item.total,
                notes: item.notes
            }));

            return { data: mappedData, error: null };
        },

        async getById(id: string): Promise<ApiResponse<any>> {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    suppliers (name),
                    purchase_order_items (
                        *,
                        products (name_fr, name_ar)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async create(order: any): Promise<ApiResponse<any>> {
            // 1. Create Order Header
            const dbOrder = {
                supplier_id: order.supplierId,
                order_date: new Date(),
                status: 'pending',
                subtotal: order.subtotal,
                tax: order.tax,
                total: order.total,
                notes: order.notes
            };

            const { data: newOrder, error: orderError } = await supabase
                .from('purchase_orders')
                .insert(dbOrder)
                .select()
                .single();

            if (orderError) return { data: null, error: orderError.message };

            // 2. Create Order Items
            if (order.items && order.items.length > 0) {
                const itemsToInsert = order.items.map((item: any) => ({
                    purchase_order_id: newOrder.id,
                    product_id: item.productId,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    total: item.total
                }));

                const { error: itemsError } = await supabase
                    .from('purchase_order_items')
                    .insert(itemsToInsert);

                if (itemsError) console.error('Error inserting PO items:', itemsError);
            }

            return { data: newOrder, error: null };
        }
    },

    expenses: {
        async getAll(): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async create(expense: any): Promise<ApiResponse<any>> {
            const { data, error } = await supabase
                .from('expenses')
                .insert(expense)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        }
    },

    settings: {
        async getStoreSettings(): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase
                    .from('store_settings')
                    .select('*')
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                // If no settings exist yet, return empty object/null but valid response
                return { data: data || {}, error: null };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        },

        async updateStoreSettings(settings: any): Promise<ApiResponse<any>> {
            try {
                // Check if row exists
                const { data: existing } = await supabase
                    .from('store_settings')
                    .select('id')
                    .limit(1)
                    .single();

                if (existing) {
                    const { data, error } = await supabase
                        .from('store_settings')
                        .update(settings)
                        .eq('id', existing.id)
                        .select()
                        .single();
                    if (error) throw error;
                    return { data, error: null };
                } else {
                    const { data, error } = await supabase
                        .from('store_settings')
                        .insert([settings])
                        .select()
                        .single();
                    if (error) throw error;
                    return { data, error: null };
                }
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        },

        async uploadLogo(file: File): Promise<ApiResponse<string>> {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `logo-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(filePath, file, {
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('logos')
                    .getPublicUrl(filePath);

                return { data: publicUrl, error: null };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        },

        async resetDatabase(): Promise<ApiResponse<void>> {
            const { error } = await supabase.rpc('reset_app_data');
            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        },

        async get(key: string): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', key)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                return { data: data?.value, error: null };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        },

        async update(key: string, value: any): Promise<ApiResponse<boolean>> {
            try {
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({ key, value })
                    .select()
                    .single();

                if (error) throw error;
                return { data: true, error: null };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        }
    },

    users: {
        async getAll(): Promise<ApiResponse<any[]>> {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const mapped = data.map((p: any) => ({
                    id: p.id,
                    name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
                    email: p.email,
                    role: p.role,
                    isActive: p.is_active,
                    avatar: p.avatar_url
                }));

                return { data: mapped, error: null };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        },

        async updateRole(id: string, role: string): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .update({ role })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return { data, error: null };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        },

        async toggleActive(id: string, isActive: boolean): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .update({ is_active: isActive })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return { data, error: null };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        },

        async getCurrentUser(): Promise<ApiResponse<any>> {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { data: null, error: 'No user found' };

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    return {
                        data: {
                            id: user.id,
                            email: user.email,
                            role: 'staff'
                        },
                        error: null
                    };
                }

                return {
                    data: {
                        ...profile,
                        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    },
                    error: null
                };
            } catch (error: any) {
                return { data: null, error: error.message };
            }
        }
    },

    chat: {
        async getHistory(limit = 20): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) return { data: null, error: error.message };
            return { data: data ? data.reverse() : [], error: null };
        },

        async addMessage(role: 'user' | 'assistant', content: string): Promise<ApiResponse<any>> {
            const { data, error } = await supabase
                .from('chat_messages')
                .insert([{ role, content }])
                .select()
                .single();

            if (error) {
                console.error("Error saving message:", error);
                return { data: null, error: error.message };
            }
            return { data, error: null };
        }
    }
};
