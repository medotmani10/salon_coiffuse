import React, { createContext, useContext, useEffect, useState } from 'react';

// 1. تعريف واجهة إعدادات الثيم (ما يخص النشاط التجاري)
export interface ThemeConfig {
    primaryColor: string; // اللون الأساسي (للأزرار - Brand 500)
    hoverColor: string;   // لون التحويم (Brand 600)
    lightColor: string;   // لون الخلفيات الفاتحة (Brand 50)
    appName: string;      // اسم النشاط التجاري
}

// 2. الثيم الافتراضي (الوردي لصالون التجميل كبداية)
const defaultTheme: ThemeConfig = {
    primaryColor: '#f43f5e', 
    hoverColor: '#e11d48',   
    lightColor: '#fff1f2',   
    appName: 'Zenstyle CRM'
};

const ThemeContext = createContext<{
    theme: ThemeConfig;
    setTheme: (theme: ThemeConfig) => void;
}>({
    theme: defaultTheme,
    setTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

    // عند تحميل التطبيق، نتحقق مما إذا كان هناك ثيم محفوظ محلياً
    useEffect(() => {
        const savedTheme = localStorage.getItem('tenant_theme');
        if (savedTheme) {
            try {
                setTheme(JSON.parse(savedTheme));
            } catch (e) {
                console.error("خطأ في قراءة الثيم:", e);
            }
        }
    }, []);

    // محرك الحقن: كلما تغير الثيم، نقوم بحقنه في المتصفح ليقرأه Tailwind
    useEffect(() => {
        const root = document.documentElement;
        
        // حقن متغيرات CSS التي أضفناها في tailwind.config.js
        root.style.setProperty('--brand-500', theme.primaryColor);
        root.style.setProperty('--brand-600', theme.hoverColor);
        root.style.setProperty('--brand-50', theme.lightColor);
        
        // تحديث اسم التبويبة في المتصفح
        document.title = theme.appName;

        // حفظ الاختيار (في المستقبل سنسجله في Supabase)
        localStorage.setItem('tenant_theme', JSON.stringify(theme));
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Hook سريع ومخصص لاستخدام الثيم في أي مكان في تطبيقك
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};