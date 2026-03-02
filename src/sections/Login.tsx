import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import type { Language } from '@/types';
import { useTheme } from '@/providers/ThemeProvider'; // استدعاء محرك الثيمات

interface LoginProps {
    language: Language;
}

export default function Login({ language }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // استخدام دالة تغيير الثيم
    const { theme, setTheme } = useTheme();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // 🌟 السحر هنا: بعد نجاح الدخول، نقوم بجلب ثيم الزبون
            // في الإنتاج الحقيقي، سنجلب هذا من جدول settings في Supabase
            // الآن سنحاكي العملية بناءً على الإيميل لكي ترى النتيجة بعينيك:

            if (email.toLowerCase().includes('barber')) {
                setTheme({
                    primaryColor: '#d97706', // ذهبي
                    hoverColor: '#b45309',
                    lightColor: '#fffbeb',
                    appName: 'Royal Barber'
                });
            } else if (email.toLowerCase().includes('wash')) {
                setTheme({
                    primaryColor: '#0ea5e9', // أزرق
                    hoverColor: '#0284c7',
                    lightColor: '#f0f9ff',
                    appName: 'SpeedWash Auto'
                });
            } else {
                setTheme({
                    primaryColor: '#f43f5e', // وردي (الافتراضي)
                    hoverColor: '#e11d48',
                    lightColor: '#fff1f2',
                    appName: 'ZenStyle Beauty'
                });
            }

        } catch (err: any) {
            setError(err.message === 'Invalid login credentials'
                ? (language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Email ou mot de passe incorrect')
                : err.message);
        } finally {
            setLoading(false);
        }
    };

    const isRTL = language === 'ar';

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden transition-colors duration-700">
            {/* Background Image & Overlay */}
            <div
                className="absolute inset-0 z-0 opacity-40"
                style={{
                    backgroundImage: "url('/salon-bg.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            {/* استخدام لون الثيم الفاتح كخلفية بدلاً من اللون الثابت */}
            <div className="absolute inset-0 z-0 bg-brand-50/80 dark:bg-slate-900/90 backdrop-blur-[4px]" />

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-800/80 p-8 rounded-3xl shadow-2xl border border-white dark:border-slate-700">

                    {/* Logo & Header */}
                    <div className="text-center mb-8">
                        {/* استخدام bg-brand-500 بدلاً من التدرج الوردي */}
                        <div className="w-16 h-16 mx-auto bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        {/* ربط اسم التطبيق بالثيم */}
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-all duration-300">
                            {theme.appName}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {language === 'ar' ? 'مرحباً بعودتك! يرجى تسجيل الدخول' : 'Bon retour ! Veuillez vous connecter'}
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                                </label>
                                <div className="relative group">
                                    <Mail className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors ${isRTL ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={language === 'ar' ? 'name@example.com' : 'nom@exemple.com'}
                                        className={`${isRTL ? 'pr-10' : 'pl-10'} h-12 rounded-xl bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all`}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {language === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
                                    </label>
                                    <a href="#" className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors">
                                        {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
                                    </a>
                                </div>
                                <div className="relative group">
                                    <Lock className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors ${isRTL ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`${isRTL ? 'pr-10' : 'pl-10'} h-12 rounded-xl bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all`}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-medium rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg transition-all active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    {language === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}
                                    <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                                </div>
                            )}
                        </Button>
                    </form>

                </div>

                {/* Footer */}
                <p className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    © 2026 Supra System
                </p>
            </div>
        </div>
    );
}