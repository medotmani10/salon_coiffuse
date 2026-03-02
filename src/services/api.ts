import { supabase } from '@/lib/supabase';
import type { Client, Appointment, Staff, Service } from '@/types';

// Helper: get local date string as YYYY-MM-DD (fixes UTC midnight shift bug)
const localDateStr = (d: Date = new Date()): string => d.toLocaleDateString('en-CA');

export type ApiResponse<T> = { data: T | null; error: string | null };

// ─── Mappers ───────────────────────────────────────────────────────────────
const mapClient = (item: any): Client => ({
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
    creditBalance: item.credit_balance || 0,
});

const mapStaff = (item: any): Staff => ({
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
    avatar: item.avatar_url,
});

const mapAppointment = (item: any): Appointment => ({
    id: item.id,
    clientId: item.client_id,
    staffId: item.staff_id,
    date: item.date,
    startTime: item.start_time?.slice(0, 5),
    endTime: item.end_time?.slice(0, 5),
    status: item.status,
    notes: item.notes,
    totalAmount: item.total_amount,
    clientName: item.clients ? `${item.clients.first_name} ${item.clients.last_name}` : 'Unknown',
    staffName: item.staff ? `${item.staff.first_name} ${item.staff.last_name}` : 'Unknown',
    services: (item.appointment_services || []).map((as: any) => ({
        nameAr: as.services?.name_ar || '',
        nameFr: as.services?.name_fr || '',
        color: as.services?.color || '#000000',
        price: as.price_at_booking,
        duration: as.services?.duration || 0,
    })),
});

// ─── API ────────────────────────────────────────────────────────────────────
export const api = {
    clients: {
        async getAll(): Promise<ApiResponse<Client[]>> {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });
            if (error) return { data: null, error: error.message };
            return { data: data.map(mapClient), error: null };
        },

        async create(client: Omit<Client, 'id'>): Promise<ApiResponse<Client>> {
            const { data, error } = await supabase
                .from('clients')
                .insert({
                    first_name: client.firstName, last_name: client.lastName,
                    phone: client.phone, email: client.email,
                    birth_date: client.birthDate, notes: client.notes,
                    loyalty_points: client.loyaltyPoints, tier: client.tier,
                    total_spent: client.totalSpent, visit_count: client.visitCount,
                    last_visit: client.lastVisit,
                })
                .select().single();
            if (error) return { data: null, error: error.message };
            return { data: mapClient(data), error: null };
        },

        async update(id: string, updates: Partial<Client>): Promise<ApiResponse<Client>> {
            const db: any = {};
            if (updates.firstName !== undefined) db.first_name = updates.firstName;
            if (updates.lastName !== undefined) db.last_name = updates.lastName;
            if (updates.phone !== undefined) db.phone = updates.phone;
            if (updates.email !== undefined) db.email = updates.email;
            if (updates.birthDate !== undefined) db.birth_date = updates.birthDate;
            if (updates.notes !== undefined) db.notes = updates.notes;
            if (updates.loyaltyPoints !== undefined) db.loyalty_points = updates.loyaltyPoints;
            if (updates.tier !== undefined) db.tier = updates.tier;
            if (updates.totalSpent !== undefined) db.total_spent = updates.totalSpent;
            if (updates.visitCount !== undefined) db.visit_count = updates.visitCount;
            if (updates.lastVisit !== undefined) db.last_visit = updates.lastVisit;
            db.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from('clients').update(db).eq('id', id).select().single();
            if (error) return { data: null, error: error.message };
            return { data: mapClient(data), error: null };
        },

        // Soft delete — preserves historical invoice data
        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('clients').update({ is_deleted: true }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        async getPayments(clientId: string): Promise<ApiResponse<any[]>> {
            try {
                const { data, error } = await supabase
                    .from('client_payments').select('*')
                    .eq('client_id', clientId).order('created_at', { ascending: false });
                if (error) return { data: [], error: null };
                return {
                    data: (data || []).map((item: any) => ({
                        id: item.id, clientId: item.client_id, type: item.type,
                        amount: item.amount, description: item.description,
                        referenceId: item.reference_id, createdAt: new Date(item.created_at),
                    })), error: null,
                };
            } catch { return { data: [], error: null }; }
        },

        async addPayment(payment: { clientId: string; type: string; amount: number; description?: string; referenceId?: string }): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('client_payments').insert({
                client_id: payment.clientId, type: payment.type, amount: payment.amount,
                description: payment.description || null, reference_id: payment.referenceId || null,
            }).select().single();
            // credit_balance updated automatically by DB trigger
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async updateCreditBalance(clientId: string, amount: number): Promise<ApiResponse<any>> {
            // Done via trigger — just add a payment record
            return api.clients.addPayment({ clientId, type: amount >= 0 ? 'credit' : 'debit', amount: Math.abs(amount) });
        },

        // Atomic loyalty update via RPC
        async addLoyaltyPoints(clientId: string, points: number, totalAmount: number): Promise<ApiResponse<any>> {
            const { error } = await supabase.rpc('add_loyalty_points', {
                p_client_id: clientId, p_points: points, p_amount_paid: totalAmount,
            });
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },
    },

    appointments: {
        async getStats(): Promise<ApiResponse<any>> {
            const today = new Date();
            const todayStr = localDateStr(today); // Fix: local date, not UTC
            const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            const [
                { count: todayCount, error: todayError },
                { count: clientCount, error: clientError },
                { data: apptRevenueData, error: apptRevenueError },
                { data: txRevenueData, error: txRevenueError },
                { data: recentAppts, error: recentApptsError },
                { data: recentTxs, error: recentTxsError },
                { data: workingHoursData },
                { count: staffCount },
                { data: todayApptsDetails },
            ] = await Promise.all([
                supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('date', todayStr).neq('status', 'cancelled'),
                supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
                supabase.from('appointments').select('total_amount').neq('status', 'cancelled'),
                supabase.from('transactions').select('total').eq('payment_status', 'paid'),
                supabase.from('appointments').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('transactions').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('app_settings').select('value').eq('key', 'working_hours').single(),
                supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_deleted', false),
                supabase.from('appointments').select('start_time, end_time').eq('date', todayStr).neq('status', 'cancelled'),
            ]);

            if (todayError || clientError || apptRevenueError || txRevenueError || recentApptsError || recentTxsError) {
                return { data: null, error: 'Failed to fetch initial stats' };
            }

            // Occupancy
            let occupancy = 0;
            if (workingHoursData?.value && staffCount && todayApptsDetails) {
                const hours = workingHoursData.value[dayName];
                if (hours?.isOpen) {
                    const toMin = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
                    const totalCap = (toMin(hours.close) - toMin(hours.open)) * staffCount;
                    if (totalCap > 0) {
                        const bookedMin = todayApptsDetails.reduce((acc: number, a: any) =>
                            acc + toMin(a.end_time) - toMin(a.start_time), 0);
                        occupancy = Math.round((bookedMin / totalCap) * 100);
                    }
                }
            }

            const totalRevenue =
                (apptRevenueData?.reduce((s, c) => s + (c.total_amount || 0), 0) || 0) +
                (txRevenueData?.reduce((s, c) => s + (Number(c.total) || 0), 0) || 0);

            // Weekly (fix: local date strings)
            const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 6);
            const lastWeekStr = localDateStr(lastWeek);
            const [{ data: weeklyAppts }, { data: weeklyTxs }] = await Promise.all([
                supabase.from('appointments').select('date, total_amount').gte('date', lastWeekStr).neq('status', 'cancelled'),
                supabase.from('transactions').select('created_at, total').gte('created_at', lastWeek.toISOString()).eq('payment_status', 'paid'),
            ]);

            const weeklyMap = new Map();
            for (let i = 0; i < 7; i++) {
                const d = new Date(lastWeek); d.setDate(lastWeek.getDate() + i);
                weeklyMap.set(localDateStr(d), { day: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: 0, appointments: 0 });
            }
            weeklyAppts?.forEach((a: any) => { if (weeklyMap.has(a.date)) { const e = weeklyMap.get(a.date); e.revenue += a.total_amount || 0; e.appointments += 1; } });
            weeklyTxs?.forEach((t: any) => { const k = localDateStr(new Date(t.created_at)); if (weeklyMap.has(k)) weeklyMap.get(k).revenue += Number(t.total) || 0; });
            const weeklyData = Array.from(weeklyMap.values());

            // Monthly
            const monthlyMap = new Map();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthlyMap.set(key, { month: d.toLocaleDateString('en-US', { month: 'short' }), revenue: 0 });
            }
            const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            const [{ data: monthlyAppts }, { data: monthlyTxs }] = await Promise.all([
                supabase.from('appointments').select('date, total_amount').gte('date', localDateStr(sixMonthsAgo)).neq('status', 'cancelled'),
                supabase.from('transactions').select('created_at, total').gte('created_at', sixMonthsAgo.toISOString()).eq('payment_status', 'paid'),
            ]);
            monthlyAppts?.forEach((a: any) => { const k = a.date.substring(0, 7); if (monthlyMap.has(k)) monthlyMap.get(k).revenue += a.total_amount || 0; });
            monthlyTxs?.forEach((t: any) => { const k = new Date(t.created_at).toISOString().substring(0, 7); if (monthlyMap.has(k)) monthlyMap.get(k).revenue += Number(t.total) || 0; });
            const monthlyData = Array.from(monthlyMap.values());

            // Service distribution
            const { data: serviceStats } = await supabase.from('appointment_services').select('service_id, services(name_fr, color)');
            const serviceCountMap = new Map(); let totalServices = 0;
            serviceStats?.forEach((item: any) => {
                if (item.services) {
                    const { name_fr: name, color } = item.services;
                    if (!serviceCountMap.has(name)) serviceCountMap.set(name, { name, value: 0, color });
                    serviceCountMap.get(name).value += 1; totalServices++;
                }
            });
            const serviceDistribution = totalServices > 0
                ? Array.from(serviceCountMap.values()).map(i => ({ ...i, value: Math.round((i.value / totalServices) * 100) })).sort((a, b) => b.value - a.value).slice(0, 5)
                : [];

            // Recent activity
            const recentActivity = [
                ...(recentAppts || []).map((a: any) => ({ id: a.id, action: 'Rendez-vous', client: a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : 'Unknown', time: new Date(a.created_at).toLocaleTimeString().slice(0, 5), type: 'appointment', amount: `${a.total_amount} DZD`, sortDate: new Date(a.created_at) })),
                ...(recentTxs || []).map((t: any) => ({ id: t.id, action: 'Vente POS', client: t.clients ? `${t.clients.first_name} ${t.clients.last_name}` : 'Client Direct', time: new Date(t.created_at).toLocaleTimeString().slice(0, 5), type: 'payment', amount: `${t.total} DZD`, sortDate: new Date(t.created_at) })),
            ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()).slice(0, 5).map(({ sortDate, ...rest }) => rest);

            return { data: { todayAppointments: todayCount || 0, totalClients: clientCount || 0, totalRevenue, monthlyGrowth: 0, occupancy, weeklyData, monthlyData, serviceDistribution, recentActivity }, error: null };
        },

        // Fix: limit to next 30 days to prevent overfetching
        async getUpcoming(): Promise<ApiResponse<Appointment[]>> {
            const today = localDateStr();
            const limit30 = localDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
            const { data, error } = await supabase
                .from('appointments')
                .select('*, clients(first_name, last_name), staff(first_name, last_name), appointment_services(price_at_booking, services(name_ar, name_fr, color, duration))')
                .gte('date', today).lte('date', limit30)
                .order('date', { ascending: true }).order('start_time', { ascending: true })
                .limit(200);
            if (error) return { data: null, error: error.message };
            return { data: data.map(mapAppointment), error: null };
        },

        async checkAvailability(staffId: string, date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
            let query = supabase.from('appointments').select('id').eq('staff_id', staffId).eq('date', date).neq('status', 'cancelled').lt('start_time', endTime).gt('end_time', startTime);
            if (excludeId) query = query.neq('id', excludeId);
            const { data, error } = await query;
            if (error) return false;
            return data.length === 0;
        },

        async create(appointment: Omit<Appointment, 'id'>): Promise<ApiResponse<Appointment>> {
            const { data: newAppt, error: apptError } = await supabase
                .from('appointments')
                .insert({
                    client_id: appointment.clientId, staff_id: appointment.staffId,
                    date: appointment.date, start_time: appointment.startTime,
                    end_time: appointment.endTime, status: appointment.status,
                    notes: appointment.notes, total_amount: appointment.totalAmount,
                }).select().single();
            if (apptError) return { data: null, error: apptError.message };

            if (appointment.services?.length) {
                await supabase.from('appointment_services').insert(
                    appointment.services.map((s: any) => ({ appointment_id: newAppt.id, service_id: s.serviceId, price_at_booking: s.price }))
                );
            }
            return { data: mapAppointment({ ...newAppt, clients: null, staff: null, appointment_services: appointment.services || [] }), error: null };
        },

        async getByDate(date: string): Promise<ApiResponse<Appointment[]>> {
            const { data, error } = await supabase
                .from('appointments')
                .select('*, clients(first_name, last_name), staff(first_name, last_name), appointment_services(price_at_booking, services(name_ar, name_fr, color, duration))')
                .eq('date', date).order('start_time', { ascending: true });
            if (error) return { data: null, error: error.message };
            return { data: data.map(mapAppointment), error: null };
        },

        async update(id: string, updates: Partial<Appointment>): Promise<ApiResponse<any>> {
            const db: any = {};
            if (updates.clientId) db.client_id = updates.clientId;
            if (updates.staffId) db.staff_id = updates.staffId;
            if (updates.date) db.date = updates.date;
            if (updates.startTime) db.start_time = updates.startTime;
            if (updates.endTime) db.end_time = updates.endTime;
            if (updates.status) db.status = updates.status;
            if (updates.notes !== undefined) db.notes = updates.notes;
            if (updates.totalAmount !== undefined) db.total_amount = updates.totalAmount;
            db.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from('appointments').update(db).eq('id', id).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async updateStatus(id: string, status: string): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('appointments').delete().eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },
    },

    services: {
        async getAll(): Promise<ApiResponse<Service[]>> {
            const { data, error } = await supabase.from('services').select('*').eq('is_active', true).eq('is_deleted', false);
            if (error) return { data: null, error: error.message };
            return {
                data: data.map((item: any) => ({
                    id: item.id, nameAr: item.name_ar, nameFr: item.name_fr,
                    category: item.category, price: item.price, duration: item.duration,
                    descriptionAr: item.description_ar, descriptionFr: item.description_fr, color: item.color,
                })), error: null,
            };
        },

        async create(service: Omit<Service, 'id'>): Promise<ApiResponse<Service>> {
            const { data, error } = await supabase.from('services').insert({
                name_ar: service.nameAr, name_fr: service.nameFr, category: service.category,
                price: service.price, duration: service.duration,
                description_ar: service.descriptionAr, description_fr: service.descriptionFr,
                color: service.color, is_active: true,
            }).select().single();
            if (error) return { data: null, error: error.message };
            return { data: { id: data.id, nameAr: data.name_ar, nameFr: data.name_fr, category: data.category, price: data.price, duration: data.duration, descriptionAr: data.description_ar, descriptionFr: data.description_fr, color: data.color }, error: null };
        },

        async update(id: string, updates: any): Promise<ApiResponse<any>> {
            const db: any = {};
            if (updates.nameAr !== undefined) db.name_ar = updates.nameAr;
            if (updates.nameFr !== undefined) db.name_fr = updates.nameFr;
            if (updates.category !== undefined) db.category = updates.category;
            if (updates.price !== undefined) db.price = updates.price;
            if (updates.duration !== undefined) db.duration = updates.duration;
            if (updates.color !== undefined) db.color = updates.color;
            if (updates.isActive !== undefined) db.is_active = updates.isActive;
            const { data, error } = await supabase.from('services').update(db).eq('id', id).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        // Soft delete — preserves appointment_services history
        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('services').update({ is_deleted: true, is_active: false }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },
    },

    staff: {
        async getAll(): Promise<ApiResponse<Staff[]>> {
            const { data, error } = await supabase.from('staff').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
            if (error) return { data: null, error: error.message };
            return { data: data.map(mapStaff), error: null };
        },

        async create(staff: Omit<Staff, 'id'>): Promise<ApiResponse<Staff>> {
            const db: any = {
                first_name: staff.firstName, last_name: staff.lastName,
                phone: staff.phone || null, email: staff.email || null,
                specialties: staff.specialty || [], commission_rate: staff.commissionRate || 0,
                base_salary: staff.baseSalary || 0, salary_type: staff.salaryType || 'monthly',
                hire_date: staff.hireDate ? localDateStr(new Date(staff.hireDate as any)) : localDateStr(),
                is_active: true, working_hours: staff.workingHours || {},
            };
            const { data, error } = await supabase.from('staff').insert(db).select().single();
            if (error) return { data: null, error: error.message };
            return { data: mapStaff(data), error: null };
        },

        async update(id: string, updates: Partial<Staff>): Promise<ApiResponse<any>> {
            const db: any = {};
            if (updates.firstName !== undefined) db.first_name = updates.firstName;
            if (updates.lastName !== undefined) db.last_name = updates.lastName;
            if (updates.phone !== undefined) db.phone = updates.phone;
            if (updates.email !== undefined) db.email = updates.email;
            if (updates.specialty !== undefined) db.specialties = updates.specialty;
            if (updates.commissionRate !== undefined) db.commission_rate = updates.commissionRate;
            if (updates.baseSalary !== undefined) db.base_salary = updates.baseSalary;
            if (updates.salaryType !== undefined) db.salary_type = updates.salaryType;
            if (updates.isActive !== undefined) db.is_active = updates.isActive;
            if (updates.workingHours !== undefined) db.working_hours = updates.workingHours;
            const { data, error } = await supabase.from('staff').update(db).eq('id', id).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        // Soft delete
        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('staff').update({ is_deleted: true, is_active: false }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        async toggleAvailability(id: string, isActive: boolean): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('staff').update({ is_active: isActive }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        async getPayments(staffId: string): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase.from('staff_payments').select('*').eq('staff_id', staffId).order('created_at', { ascending: false });
            if (error) return { data: null, error: error.message };
            return { data: (data || []).map((p: any) => ({ id: p.id, staffId: p.staff_id, type: p.type, amount: Number(p.amount), description: p.description, referenceId: p.reference_id, createdAt: new Date(p.created_at) })), error: null };
        },

        async addPayment(payment: { staffId: string; type: string; amount: number; description?: string; referenceId?: string }): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('staff_payments').insert({ staff_id: payment.staffId, type: payment.type, amount: payment.amount, description: payment.description || null, reference_id: payment.referenceId || null }).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async getBalance(staffId: string): Promise<{ totalDue: number; totalPaid: number; balance: number }> {
            const { data } = await supabase.from('staff_payments').select('type, amount').eq('staff_id', staffId);
            let totalDue = 0, totalPaid = 0;
            data?.forEach((p: any) => {
                const amt = Number(p.amount);
                if (['commission', 'salary', 'bonus'].includes(p.type)) totalDue += amt;
                if (['advance', 'deduction'].includes(p.type)) totalPaid += amt;
            });
            return { totalDue, totalPaid, balance: totalDue - totalPaid };
        },
    },

    products: {
        async getAll(): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase.from('products').select('*').eq('is_deleted', false).order('name_fr', { ascending: true });
            if (error) return { data: null, error: error.message };
            return { data: data.map((item: any) => ({ id: item.id, nameAr: item.name_ar, nameFr: item.name_fr, category: item.category, price: item.price, stock: item.stock, minStock: item.min_stock, expiryDate: item.expiry_date ? new Date(item.expiry_date) : undefined })), error: null };
        },

        async create(product: any): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('products').insert({ name_ar: product.nameAr, name_fr: product.nameFr, category: product.category, price: product.price, stock: product.stock, min_stock: product.minStock, expiry_date: product.expiryDate }).select().single();
            if (error) return { data: null, error: error.message };
            return { data: { id: data.id, nameAr: data.name_ar, nameFr: data.name_fr, category: data.category, price: data.price, stock: data.stock, minStock: data.min_stock, expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined }, error: null };
        },

        async update(id: string, updates: any): Promise<ApiResponse<any>> {
            const db: any = {};
            if (updates.nameAr !== undefined) db.name_ar = updates.nameAr;
            if (updates.nameFr !== undefined) db.name_fr = updates.nameFr;
            if (updates.category !== undefined) db.category = updates.category;
            if (updates.price !== undefined) db.price = updates.price;
            if (updates.stock !== undefined) db.stock = updates.stock;
            if (updates.minStock !== undefined) db.min_stock = updates.minStock;
            if (updates.expiryDate !== undefined) db.expiry_date = updates.expiryDate;
            const { data, error } = await supabase.from('products').update(db).eq('id', id).select().single();
            if (error) return { data: null, error: error.message };
            return { data: { id: data.id, nameAr: data.name_ar, nameFr: data.name_fr, category: data.category, price: data.price, stock: data.stock, minStock: data.min_stock, expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined }, error: null };
        },

        // Soft delete — preserves transaction_items history
        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        // Legacy helper (still available for restock flows)
        async updateStock(id: string, quantity: number): Promise<ApiResponse<boolean>> {
            const { data: product, error: fetchError } = await supabase.from('products').select('stock').eq('id', id).single();
            if (fetchError || !product) return { data: null, error: 'Product not found' };
            const finalStock = (product.stock || 0) - quantity;
            if (finalStock < 0) return { data: null, error: 'Stock insuffisant' };
            const { error } = await supabase.from('products').update({ stock: finalStock }).eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },
    },

    transactions: {
        // Fully atomic via DB RPC — no more partial inserts or race conditions
        async create(transaction: { clientId?: string | null; staffId?: string; subtotal?: number; discount?: number; tax?: number; totalAmount: number; paymentMethod: string; items: any[] }): Promise<ApiResponse<any>> {
            const items = (transaction.items || []).map((item: any) => ({
                item_type: item.item_type || 'product',
                item_id: item.id || null,
                name_ar: item.nameAr || null,
                name_fr: item.nameFr || null,
                quantity: item.quantity,
                unit_price: item.price,
                total: item.price * item.quantity,
            }));

            const { data: txId, error } = await supabase.rpc('create_transaction_atomic', {
                p_client_id: transaction.clientId || null,
                p_staff_id: transaction.staffId || null,
                p_subtotal: transaction.subtotal ?? transaction.totalAmount,
                p_discount: transaction.discount ?? 0,
                p_tax: transaction.tax ?? 0,
                p_total: transaction.totalAmount,
                p_payment_method: transaction.paymentMethod,
                p_items: items,
            });

            if (error) return { data: null, error: error.message };
            return { data: { id: txId }, error: null };
        },

        async getAll(period: 'today' | 'week' | 'month' | 'all' = 'all'): Promise<ApiResponse<any[]>> {
            try {
                let query = supabase.from('transactions').select('*, clients(first_name, last_name), staff(first_name, last_name)').order('created_at', { ascending: false });
                const now = new Date();
                if (period === 'today') query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
                else if (period === 'week') query = query.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
                else if (period === 'month') query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString());
                const { data, error } = await query;
                if (error) throw error;
                return { data: data.map((item: any) => ({ id: item.id, clientName: item.clients ? `${item.clients.first_name} ${item.clients.last_name}` : 'Unknown', staffName: item.staff ? `${item.staff.first_name} ${item.staff.last_name}` : 'Unknown', total: item.total, paymentMethod: item.payment_method, status: item.payment_status, date: new Date(item.created_at) })), error: null };
            } catch (err: any) { return { data: null, error: err.message }; }
        },

        async getItems(transactionId: string): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase.from('transaction_items').select('*').eq('transaction_id', transactionId);
            if (error) return { data: [], error: error.message };
            return { data: data || [], error: null };
        },
    },

    reports: {
        async getFinancialData(startDate?: Date, endDate?: Date): Promise<ApiResponse<any>> {
            try {
                // endDate: include the full last day (set to 23:59:59)
                const endOfDay = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : undefined;

                let txQuery = supabase.from('transactions').select('*').order('created_at', { ascending: true });
                if (startDate) txQuery = txQuery.gte('created_at', startDate.toISOString());
                if (endOfDay) txQuery = txQuery.lte('created_at', endOfDay.toISOString());

                let expQuery = supabase.from('expenses').select('amount, date');
                if (startDate) expQuery = expQuery.gte('date', localDateStr(startDate));
                if (endDate) expQuery = expQuery.lte('date', localDateStr(endDate));

                const [{ data: transactions, error }, { data: expenses }] = await Promise.all([txQuery, expQuery]);
                if (error) return { data: null, error: error.message };

                const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

                // Build monthly revenue map from actual transactions
                const monthlyMap = new Map<string, { revenue: number; expenses: number; count: number }>();
                (transactions || []).forEach((tx: any) => {
                    const d = new Date(tx.created_at);
                    const key = `${d.getFullYear()}-${d.getMonth()}`;
                    const ex = monthlyMap.get(key) || { revenue: 0, expenses: 0, count: 0 };
                    ex.revenue += Number(tx.total) || 0;
                    ex.count += 1;
                    monthlyMap.set(key, ex);
                });

                // Map actual expenses to months
                (expenses || []).forEach((exp: any) => {
                    const d = new Date(exp.date);
                    const key = `${d.getFullYear()}-${d.getMonth()}`;
                    const ex = monthlyMap.get(key) || { revenue: 0, expenses: 0, count: 0 };
                    ex.expenses += Number(exp.amount) || 0;
                    monthlyMap.set(key, ex);
                });

                const monthlyRevenue = Array.from(monthlyMap.entries()).map(([key, val]) => {
                    const [, mi] = key.split('-');
                    const profit = Math.max(0, val.revenue - val.expenses);
                    return { month: monthNames[Number(mi)], revenue: val.revenue, expenses: val.expenses, profit, count: val.count };
                });

                const totalRevenue = (transactions || []).reduce((s: number, tx: any) => s + (Number(tx.total) || 0), 0);
                const totalExpenses = (expenses || []).reduce((s: number, ex: any) => s + (Number(ex.amount) || 0), 0);
                const totalProfit = Math.max(0, totalRevenue - totalExpenses);

                const paymentMethods: Record<string, number> = {};
                (transactions || []).forEach((tx: any) => {
                    const m = tx.payment_method || 'other';
                    paymentMethods[m] = (paymentMethods[m] || 0) + (Number(tx.total) || 0);
                });

                return {
                    data: { monthlyRevenue, totalRevenue, totalExpenses, totalProfit, totalTransactions: (transactions || []).length, profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0', paymentMethods },
                    error: null,
                };
            } catch { return { data: null, error: 'Failed to load financial data' }; }
        },

        async getServiceDistribution(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
            try {
                const endOfDay = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : undefined;

                // Fetch transaction_items joined with their transaction's created_at
                let query = supabase
                    .from('transaction_items')
                    .select('name_fr, name_ar, total, quantity, item_type, transactions!inner(created_at)');
                if (startDate) query = query.gte('transactions.created_at', startDate.toISOString());
                if (endOfDay) query = query.lte('transactions.created_at', endOfDay.toISOString());

                const { data: items, error } = await query;
                if (error) return { data: [], error: error.message };

                const serviceMap = new Map<string, { amount: number; count: number }>();
                (items || []).forEach((item: any) => {
                    const name = item.name_fr || item.name_ar || 'Autre';
                    const ex = serviceMap.get(name) || { amount: 0, count: 0 };
                    ex.amount += Number(item.total) || 0;
                    ex.count += item.quantity || 1;
                    serviceMap.set(name, ex);
                });

                const totalAmount = Array.from(serviceMap.values()).reduce((s, v) => s + v.amount, 0);
                return {
                    data: Array.from(serviceMap.entries())
                        .map(([name, val]) => ({
                            name,
                            amount: val.amount,
                            // value = percentage for pie chart
                            value: totalAmount > 0 ? Math.round((val.amount / totalAmount) * 100) : 0,
                            count: val.count,
                        }))
                        .sort((a, b) => b.amount - a.amount)
                        .slice(0, 8),
                    error: null,
                };
            } catch { return { data: [], error: null }; }
        },

        // Fix: include deleted staff so historical revenue is preserved
        async getStaffPerformance(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
            try {
                const { data: staffList } = await supabase.from('staff').select('id, first_name, last_name, commission_rate');
                // Note: no is_active filter — includes deleted staff for accurate reports
                if (!staffList?.length) return { data: [], error: null };
                let query = supabase.from('transactions').select('staff_id, total, client_id, created_at');
                if (startDate) query = query.gte('created_at', startDate.toISOString());
                if (endDate) query = query.lte('created_at', endDate.toISOString());
                const { data: transactions } = await query;
                return {
                    data: staffList.map((s: any) => {
                        const staffTx = (transactions || []).filter((tx: any) => tx.staff_id === s.id);
                        return { name: `${s.first_name} ${s.last_name}`, revenue: staffTx.reduce((sum: number, tx: any) => sum + (Number(tx.total) || 0), 0), clients: new Set(staffTx.filter((tx: any) => tx.client_id).map((tx: any) => tx.client_id)).size, transactions: staffTx.length, commission: s.commission_rate || 0 };
                    }).sort((a: any, b: any) => b.revenue - a.revenue), error: null,
                };
            } catch { return { data: [], error: null }; }
        },

        async getInventoryReport(): Promise<ApiResponse<any[]>> {
            try {
                const { data } = await supabase.from('products').select('*').eq('is_deleted', false).order('stock', { ascending: true });
                return { data: (data || []).map((p: any) => ({ name: p.name_fr || p.name_ar || 'N/A', stock: p.stock || 0, minStock: p.min_stock || 5, price: p.price || 0, category: p.category || 'Autre' })), error: null };
            } catch { return { data: [], error: null }; }
        },
    },

    suppliers: {
        async getAll(): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase.from('suppliers').select('*').eq('is_active', true).order('name', { ascending: true });
            if (error) return { data: null, error: error.message };
            return { data: data.map((item: any) => ({ id: item.id, name: item.name, contactPerson: item.contact_person, phone: item.phone, email: item.email, address: item.address, city: item.city, isActive: item.is_active, balance: item.balance || 0, totalOrders: 0, totalSpent: 0 })), error: null };
        },

        async create(supplier: any): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('suppliers').insert({ name: supplier.name, contact_person: supplier.contactPerson, phone: supplier.phone, email: supplier.email, address: supplier.address, city: supplier.city, is_active: true, balance: 0 }).select().single();
            if (error) return { data: null, error: error.message };
            return { data: { ...data, contactPerson: data.contact_person, isActive: data.is_active }, error: null };
        },

        async updateBalance(id: string, amount: number): Promise<ApiResponse<any>> {
            const { data: current, error: fe } = await supabase.from('suppliers').select('balance').eq('id', id).single();
            if (fe) return { data: null, error: fe.message };
            const { data, error } = await supabase.from('suppliers').update({ balance: (current.balance || 0) + amount }).eq('id', id).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async getHistory(id: string): Promise<ApiResponse<any[]>> {
            const [{ data: orders, error: oe }, { data: payments, error: pe }] = await Promise.all([
                supabase.from('purchase_orders').select('id, created_at, total').eq('supplier_id', id),
                supabase.from('supplier_payments').select('*').eq('supplier_id', id),
            ]);
            if (oe) return { data: null, error: oe.message };
            if (pe) return { data: null, error: pe.message };
            return { data: [...(orders || []).map((o: any) => ({ id: o.id, date: o.created_at, type: 'order', amount: o.total, description: 'Order' })), ...(payments || []).map((p: any) => ({ id: p.id, date: p.payment_date, type: 'payment', amount: p.amount, description: p.notes || 'Payment' }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), error: null };
        },
    },

    supplierPayments: {
        async create(payment: { supplierId: string; amount: number; date: string; method?: string; notes?: string }): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('supplier_payments').insert({ supplier_id: payment.supplierId, amount: payment.amount, payment_date: payment.date, payment_method: payment.method, notes: payment.notes }).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },
    },

    purchaseOrders: {
        async getAll(): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase.from('purchase_orders').select('*, suppliers(name), purchase_order_items(*, products(name_fr))').order('created_at', { ascending: false });
            if (error) return { data: null, error: error.message };
            return { data: data.map((item: any) => ({ id: item.id, supplierId: item.supplier_id, supplierName: item.suppliers?.name || 'Unknown', orderDate: new Date(item.order_date), expectedDate: item.expected_date ? new Date(item.expected_date) : undefined, receivedDate: item.received_date ? new Date(item.received_date) : undefined, status: item.status, items: (item.purchase_order_items || []).map((i: any) => ({ id: i.id, productId: i.product_id, productNameFr: i.products?.name_fr || 'Unknown', quantity: i.quantity, unitPrice: i.unit_price, total: i.total })), subtotal: item.subtotal, tax: item.tax, total: item.total, notes: item.notes })), error: null };
        },

        async getById(id: string): Promise<ApiResponse<any>> {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, suppliers(name), purchase_order_items(*, products(name_fr))')
                .eq('id', id)
                .single();
            if (error) return { data: null, error: error.message };
            return {
                data: {
                    id: data.id, supplierId: data.supplier_id, supplierName: data.suppliers?.name || 'Unknown',
                    orderDate: new Date(data.order_date),
                    expectedDate: data.expected_date ? new Date(data.expected_date) : undefined,
                    receivedDate: data.received_date ? new Date(data.received_date) : undefined,
                    status: data.status,
                    items: (data.purchase_order_items || []).map((i: any) => ({
                        id: i.id, productId: i.product_id, productNameFr: i.products?.name_fr || 'Unknown',
                        quantity: i.quantity, unitPrice: i.unit_price, total: i.total,
                    })),
                    subtotal: data.subtotal, tax: data.tax, total: data.total, notes: data.notes,
                },
                error: null,
            };
        },

        async create(order: any): Promise<ApiResponse<any>> {
            const { data: newOrder, error } = await supabase.from('purchase_orders').insert({ supplier_id: order.supplierId, order_date: localDateStr(), status: 'pending', subtotal: order.subtotal, tax: order.tax, total: order.total, notes: order.notes }).select().single();
            if (error) return { data: null, error: error.message };
            if (order.items?.length) {
                await supabase.from('purchase_order_items').insert(order.items.map((item: any) => ({ purchase_order_id: newOrder.id, product_id: item.productId, quantity: item.quantity, unit_price: item.unitPrice, total: item.total })));
            }
            return { data: newOrder, error: null };
        },
    },

    expenses: {
        async getAll(): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async create(expense: any): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('expenses').insert(expense).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },

        async delete(id: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },
    },

    settings: {
        async getStoreSettings(): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
                if (error && error.code !== 'PGRST116') throw error;
                return { data: data || {}, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async updateStoreSettings(settings: any): Promise<ApiResponse<any>> {
            try {
                const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
                if (existing) {
                    const { data, error } = await supabase.from('store_settings').update(settings).eq('id', existing.id).select().single();
                    if (error) throw error;
                    return { data, error: null };
                } else {
                    const { data, error } = await supabase.from('store_settings').insert([settings]).select().single();
                    if (error) throw error;
                    return { data, error: null };
                }
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async uploadLogo(file: File): Promise<ApiResponse<string>> {
            try {
                const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
                return { data: publicUrl, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async resetDatabase(): Promise<ApiResponse<void>> {
            const { error } = await supabase.rpc('reset_app_data');
            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        },

        async get(key: string): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
                if (error && error.code !== 'PGRST116') throw error;
                return { data: data?.value, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async update(key: string, value: any): Promise<ApiResponse<boolean>> {
            try {
                const { error } = await supabase.from('app_settings').upsert({ key, value }).select().single();
                if (error) throw error;
                return { data: true, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },
    },

    users: {
        async getAll(): Promise<ApiResponse<any[]>> {
            try {
                const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                return { data: data.map((p: any) => ({ id: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email, email: p.email, role: p.role, isActive: p.is_active, avatar: p.avatar_url })), error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async updateRole(id: string, role: string): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select().single();
                if (error) throw error;
                return { data, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async toggleActive(id: string, isActive: boolean): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id).select().single();
                if (error) throw error;
                return { data, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async getCurrentUser(): Promise<ApiResponse<any>> {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { data: null, error: 'No user found' };
                const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (error) return { data: { id: user.id, email: user.email, role: 'staff' }, error: null };
                return { data: { ...profile, name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() }, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },
    },

    whatsapp: {
        async findClientByPhone(phoneNumber: string): Promise<ApiResponse<any>> {
            try {
                const cleanPhone = phoneNumber.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/^\+?213/, '').replace(/\D/g, '');
                const { data, error } = await supabase.from('clients').select('id, first_name, last_name, phone, tier, total_spent, last_visit, visit_count').or(`phone.eq.${cleanPhone},phone.eq.0${cleanPhone},phone.eq.+213${cleanPhone}`).eq('is_deleted', false).limit(1).single();
                if (error && error.code !== 'PGRST116') return { data: null, error: error.message };
                return { data: data || null, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async getSession(phoneNumber: string): Promise<ApiResponse<any>> {
            try {
                const { data, error } = await supabase.from('whatsapp_sessions').select('*').eq('phone_number', phoneNumber).single();
                if (error && error.code === 'PGRST116') {
                    const { data: newSession, error: ce } = await supabase.from('whatsapp_sessions').insert({ phone_number: phoneNumber }).select().single();
                    if (ce) return { data: null, error: ce.message };
                    return { data: newSession, error: null };
                }
                if (error) return { data: null, error: error.message };
                return { data, error: null };
            } catch (error: any) { return { data: null, error: error.message }; }
        },

        async linkClientToSession(phoneNumber: string, clientId: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.from('whatsapp_sessions').update({ client_id: clientId }).eq('phone_number', phoneNumber);
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        // Atomic via RPC — no more concurrent overwrite race condition
        async updateMessages(phoneNumber: string, role: 'user' | 'assistant', content: string): Promise<ApiResponse<boolean>> {
            const { error } = await supabase.rpc('append_whatsapp_message', { p_phone: phoneNumber, p_role: role, p_content: content, p_max_keep: 3 });
            if (error) return { data: null, error: error.message };
            return { data: true, error: null };
        },

        async getRecentMessages(phoneNumber: string): Promise<ApiResponse<any[]>> {
            try {
                const { data, error } = await supabase.from('whatsapp_sessions').select('last_messages').eq('phone_number', phoneNumber).single();
                if (error) return { data: [], error: null };
                return { data: data?.last_messages || [], error: null };
            } catch { return { data: [], error: null }; }
        },
    },

    chat: {
        async getHistory(limit = 20): Promise<ApiResponse<any[]>> {
            const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(limit);
            if (error) return { data: null, error: error.message };
            return { data: data ? data.reverse() : [], error: null };
        },

        async addMessage(role: 'user' | 'assistant', content: string): Promise<ApiResponse<any>> {
            const { data, error } = await supabase.from('chat_messages').insert([{ role, content }]).select().single();
            if (error) return { data: null, error: error.message };
            return { data, error: null };
        },
    },
};
