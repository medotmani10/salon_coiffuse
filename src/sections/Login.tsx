import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import type { Language } from '@/types';

interface LoginProps {
    language: Language;
}

export default function Login({ language }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
            {/* Background Image & Overlay */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url('/salon-bg.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 z-0 bg-rose-900/20 dark:bg-slate-900/60 backdrop-blur-[2px]" />

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/60 p-8 rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50">

                    {/* Logo & Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30 mb-4 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            ZenStyle
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
                                    <Mail className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-rose-500 transition-colors ${isRTL ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={language === 'ar' ? 'name@example.com' : 'nom@exemple.com'}
                                        className={`${isRTL ? 'pr-10' : 'pl-10'} h-12 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-rose-500 transition-all`}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {language === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
                                    </label>
                                    <a href="#" className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
                                        {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
                                    </a>
                                </div>
                                <div className="relative group">
                                    <Lock className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-rose-500 transition-colors ${isRTL ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`${isRTL ? 'pr-10' : 'pl-10'} h-12 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-rose-500 transition-all`}
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
                            className="w-full h-12 text-base font-medium rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-lg shadow-rose-500/25 transition-all active:scale-[0.98]"
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
                <p className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
                    © 2026 Supra System
                </p>
            </div>
        </div>
    );
}
