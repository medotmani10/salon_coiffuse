import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';

interface Service {
    id: string;
    name_ar: string;
    price: number;
    duration: number;
}

interface Staff {
    id: string;
    first_name: string;
    working_hours?: unknown;
}

interface BookedSlot {
    date: string;
    time: string;
    staffId: string;
}

export default function PublicBooking() {
    const [services, setServices] = useState<Service[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        serviceId: '',
        staffId: 'any',
        date: '',
        time: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [servicesRes, staffRes, appointmentsRes] = await Promise.all([
                supabase.from('services').select('*').eq('is_active', true),
                supabase.from('staff').select('*').eq('is_active', true),
                supabase
                    .from('appointments')
                    .select('date, start_time, staff_id')
                    .in('status', ['confirmed', 'in-progress'])
                    .gte('date', new Date().toISOString().split('T')[0]),
            ]);

            if (servicesRes.data) setServices(servicesRes.data as Service[]);
            if (staffRes.data) setStaff(staffRes.data as Staff[]);
            if (appointmentsRes.data) {
                setBookedSlots(
                    appointmentsRes.data.map((app: { date: string; start_time: string; staff_id: string | null }) => ({
                        date: app.date,
                        time: app.start_time.substring(0, 5),
                        staffId: app.staff_id || 'any',
                    }))
                );
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('تعذّر تحميل البيانات. يرجى تحديث الصفحة.');
        } finally {
            setLoading(false);
        }
    };

    const generateAvailableTimes = (): string[] => {
        if (!formData.date) return [];
        const times: string[] = [];
        for (let h = 9; h < 18; h++) {
            const hourStr = h < 10 ? `0${h}` : `${h}`;
            times.push(`${hourStr}:00`);
            times.push(`${hourStr}:30`);
        }

        const booked = bookedSlots
            .filter(
                (b) =>
                    b.date === formData.date &&
                    (b.staffId === formData.staffId ||
                        formData.staffId === 'any' ||
                        b.staffId === 'any')
            )
            .map((b) => b.time);

        return times.filter((t) => !booked.includes(t));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // 1. البحث عن الزبونة أو إنشاؤها
            let clientId: string;
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('phone', formData.phone)
                .maybeSingle();

            if (existingClient) {
                clientId = existingClient.id as string;
            } else {
                const { data: newClient, error: clientErr } = await supabase
                    .from('clients')
                    .insert([{ first_name: formData.name, phone: formData.phone, last_name: 'N/A' }])
                    .select()
                    .single();
                if (clientErr) throw clientErr;
                clientId = (newClient as { id: string }).id;
            }

            // 2. حساب وقت الانتهاء
            const selectedService = services.find((s) => s.id === formData.serviceId);
            const durationMins = selectedService?.duration || 60;
            const [h, m] = formData.time.split(':').map(Number);
            const dateObj = new Date();
            dateObj.setHours(h, m + durationMins, 0, 0);
            const endTime = dateObj.toTimeString().substring(0, 8);

            // 3. إدخال الموعد
            const { data: appointment, error: appErr } = await supabase
                .from('appointments')
                .insert([
                    {
                        client_id: clientId,
                        staff_id: formData.staffId === 'any' ? null : formData.staffId,
                        date: formData.date,
                        start_time: `${formData.time}:00`,
                        end_time: endTime,
                        status: 'confirmed',
                        total_amount: selectedService?.price || 0,
                    },
                ])
                .select()
                .single();

            if (appErr) throw appErr;

            // 4. ربط الخدمة بالموعد
            if (appointment) {
                await supabase.from('appointment_services').insert([
                    {
                        appointment_id: (appointment as { id: string }).id,
                        service_id: formData.serviceId,
                        price_at_booking: selectedService?.price || 0,
                    },
                ]);
            }

            // 5. إشعار n8n لإرسال تأكيد الواتساب
            try {
                await fetch(
                    'http://YOUR_N8N_URL:5678/webhook/trigger-whatsapp-confirmation',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: formData.phone,
                            name: formData.name,
                            service: selectedService?.name_ar,
                            date: formData.date,
                            time: formData.time,
                        }),
                    }
                );
            } catch {
                // إشعار n8n اختياري - لا يوقف الحجز
                console.warn('n8n notification failed (non-blocking)');
            }

            setSuccess(true);
        } catch (err) {
            console.error('Booking failed:', err);
            setError('حدث خطأ أثناء الحجز. يرجى المحاولة مجدداً.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Loading State ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
                <Loader2 className="animate-spin text-rose-500 w-10 h-10" />
            </div>
        );
    }

    // ─── Success State ───────────────────────────────────────────────────────────
    if (success) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 p-4"
                dir="rtl"
            >
                <Card className="w-full max-w-md text-center py-12 border-0 shadow-2xl rounded-3xl">
                    <CardContent className="flex flex-col items-center gap-4 pt-6">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">تم الحجز بنجاح! 🎉</h2>
                        <p className="text-slate-500 leading-relaxed">
                            شكراً لكِ،{' '}
                            <span className="font-semibold text-rose-600">{formData.name}</span>
                            .<br />
                            سيصلكِ تأكيد على الواتساب قريباً.
                        </p>
                        <Button
                            className="mt-4 bg-rose-500 hover:bg-rose-600 rounded-xl px-8"
                            onClick={() => {
                                setSuccess(false);
                                setFormData({ name: '', phone: '', serviceId: '', staffId: 'any', date: '', time: '' });
                            }}
                        >
                            حجز موعد آخر
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const availableTimes = generateAvailableTimes();

    // ─── Booking Form ────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 p-4"
            dir="rtl"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
        >
            {/* Google Font for Arabic */}
            <link
                href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
                rel="stylesheet"
            />

            <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden">
                {/* Decorative Header */}
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-8 text-center text-white">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-bold mb-1">ZenStyle ✨</CardTitle>
                    <CardDescription className="text-rose-100 text-sm">
                        احجزي موعدك المفضّل بكل سهولة
                    </CardDescription>
                </div>

                <CardHeader className="pb-0 pt-6 px-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-2 text-center">
                            {error}
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* الاسم */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-medium">الاسم الكريم</Label>
                            <Input
                                required
                                placeholder="مثال: مريم"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="rounded-xl border-rose-200 focus:border-rose-400 h-11"
                            />
                        </div>

                        {/* الهاتف */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-medium">رقم الهاتف (واتساب)</Label>
                            <Input
                                required
                                type="tel"
                                dir="ltr"
                                placeholder="0555xxxxxx"
                                pattern="[0-9]{10}"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="rounded-xl border-rose-200 focus:border-rose-400 h-11"
                            />
                        </div>

                        {/* الخدمة */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-medium">الخدمة المطلوبة</Label>
                            <Select
                                required
                                value={formData.serviceId}
                                onValueChange={(val) => setFormData({ ...formData, serviceId: val })}
                            >
                                <SelectTrigger className="rounded-xl border-rose-200 h-11">
                                    <SelectValue placeholder="اختاري الخدمة..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            لا توجد خدمات متاحة
                                        </SelectItem>
                                    ) : (
                                        services.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name_ar}{' '}
                                                <span className="text-slate-400 text-xs mr-1">({s.price} دج)</span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* المصممة */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-medium">المصمّمة (اختياري)</Label>
                            <Select
                                value={formData.staffId}
                                onValueChange={(val) => setFormData({ ...formData, staffId: val })}
                            >
                                <SelectTrigger className="rounded-xl border-rose-200 h-11">
                                    <SelectValue placeholder="أي مصمّمة متوفرة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">أي مصمّمة متوفرة</SelectItem>
                                    {staff.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.first_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* التاريخ والوقت */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 font-medium">التاريخ</Label>
                                <Input
                                    required
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={formData.date}
                                    onChange={(e) =>
                                        setFormData({ ...formData, date: e.target.value, time: '' })
                                    }
                                    className="rounded-xl border-rose-200 focus:border-rose-400 h-11"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 font-medium">الوقت المتاح</Label>
                                <Select
                                    required
                                    value={formData.time}
                                    onValueChange={(val) => setFormData({ ...formData, time: val })}
                                    disabled={!formData.date}
                                >
                                    <SelectTrigger className="rounded-xl border-rose-200 h-11">
                                        <SelectValue placeholder="اختاري الوقت" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTimes.length > 0 ? (
                                            availableTimes.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="__none__" disabled>
                                                {formData.date ? 'عذراً، اليوم ممتلئ' : 'اختاري التاريخ أولاً'}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 
                         text-white rounded-xl h-12 text-base font-semibold shadow-lg shadow-rose-200 
                         transition-all duration-200 mt-2"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin ml-2 w-5 h-5" />
                                    جاري التأكيد...
                                </>
                            ) : (
                                'تأكيد الحجز 💖'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
