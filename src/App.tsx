import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard, ShoppingCart, Calendar, Users, Sparkles, UserCircle,
  BarChart3, Settings, Package, Search, Menu, X, Sun, Moon, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import Login from '@/sections/Login';
import type { Language } from '@/types';
import { api } from '@/services/api';

import { translations } from '@/i18n/translations';
import Dashboard from '@/sections/Dashboard';
import POS from '@/sections/POS';
import Appointments from '@/sections/Appointments';
import Clients from '@/sections/Clients';
import Services from '@/sections/Services';
import Staff from '@/sections/Staff';
import Inventory from '@/sections/Inventory';
import Reports from '@/sections/Reports';
import SettingsPanel from '@/sections/Settings';
import PublicBooking from '@/sections/PublicBooking';
import { useTheme } from '@/providers/ThemeProvider'; // محرك الثيمات
import './App.css';

type View = 'dashboard' | 'pos' | 'appointments' | 'clients' | 'services' | 'staff' | 'inventory' | 'reports' | 'settings';

import { ChatWidget } from './components/ChatWidget';

function CRMApp() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [language, setLanguage] = useState<Language>('fr');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  // استدعاء محرك الثيمات للتجربة المباشرة
  const { theme } = useTheme();



  const t = translations[language];
  const isRTL = language === 'ar';

  const [storeSettings, setStoreSettings] = useState({
    name: theme.appName, // ربط الاسم بالثيم
    logo_url: ''
  });
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const loadUser = async () => {
        const { data } = await api.users.getCurrentUser();
        if (data) setUser(data);
      };
      loadUser();
    } else {
      setUser(null);
    }
  }, [session]);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

  const loadStoreSettings = async () => {
    const { data } = await api.settings.getStoreSettings();
    if (data) {
      setStoreSettings({
        name: data.name || theme.appName,
        logo_url: data.logo_url || ''
      });
      if (data.name) document.title = data.name;
    }
  };

  useEffect(() => {
    loadStoreSettings();
  }, []);

  const navItems: { id: View; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'pos', label: t.pos, icon: ShoppingCart },
    { id: 'appointments', label: t.appointments, icon: Calendar },
    { id: 'clients', label: t.clients, icon: Users },
    { id: 'services', label: t.services, icon: Sparkles },
    { id: 'staff', label: t.staff, icon: UserCircle },
    { id: 'inventory', label: language === 'ar' ? 'المخزون' : 'Inventaire', icon: Package },
    { id: 'reports', label: t.reports, icon: BarChart3 },
    { id: 'settings', label: t.settings, icon: Settings },
  ].map(item => ({ ...item, id: item.id as View })).filter(item => {
    if (!user) return true;
    if (user.role === 'admin') return true;

    const permissions: Record<string, string[]> = {
      manager: ['dashboard', 'pos', 'appointments', 'clients', 'services', 'staff', 'inventory', 'reports'],
      receptionist: ['dashboard', 'pos', 'appointments', 'clients'],
      staff: ['dashboard', 'appointments'],
    };

    const userPerms = permissions[user.role] || [];
    return userPerms.includes(item.id);
  });

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard t={t} language={language} onNavigate={setCurrentView} />;
      case 'pos': return <POS t={t} language={language} />;
      case 'appointments': return <Appointments t={t} language={language} />;
      case 'clients': return <Clients t={t} language={language} />;
      case 'services': return <Services t={t} language={language} />;
      case 'staff': return <Staff t={t} language={language} />;
      case 'inventory': return <Inventory t={t} language={language} />;
      case 'reports': return <Reports t={t} language={language} />;
      case 'settings': return <SettingsPanel t={t} language={language} onLanguageChange={setLanguage} onSettingsChange={loadStoreSettings} />;
      default: return <Dashboard t={t} language={language} onNavigate={setCurrentView} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login language={language} />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-brand-50 dark:bg-slate-900 transition-colors duration-500">

        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-64' : 'w-20'} ${isRTL ? 'border-l' : 'border-r'} 
            border-brand-200/50 dark:border-slate-700/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl 
            transition-all duration-300 ease-in-out 
            fixed md:relative inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 md:z-0
            ${isMobileMenuOpen ? 'translate-x-0' : isRTL ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0'}
            flex flex-col`}
        >
          {/* Logo */}
          <div className={`h-20 flex items-center ${sidebarOpen ? 'px-6' : 'px-4'} ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-200 dark:shadow-brand-900/30 overflow-hidden transition-colors duration-500">
                {storeSettings.logo_url ? (
                  <img src={storeSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              {sidebarOpen && (
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h1 className="text-xl font-bold text-slate-800 dark:text-white truncate max-w-[150px]">
                    {theme.appName}
                  </h1>
                  <p className="text-xs text-brand-500 dark:text-brand-400 font-medium">
                    {language === 'ar' ? 'إدارة الأعمال' : 'Business CRM'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} 
                    gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-200 dark:shadow-brand-900/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-slate-700/50 hover:text-brand-600 dark:hover:text-brand-400'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                  {sidebarOpen && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-brand-200/50 dark:border-slate-700/50">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`w-full flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} 
                justify-center gap-2 p-2 rounded-lg text-slate-500 dark:text-slate-400 
                hover:bg-brand-50 dark:hover:bg-slate-700/50 transition-colors`}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <header className="h-16 md:h-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl 
            border-b border-brand-200/50 dark:border-slate-700/50 
            flex items-center justify-between px-4 md:px-6 z-10">
            {/* Mobile Toggle & Logo */}
            <div className="md:hidden flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="h-10 w-10 text-slate-600 dark:text-slate-400"
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-200 dark:shadow-brand-900/30 overflow-hidden">
                {storeSettings.logo_url ? (
                  <img src={storeSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            {/* Search */}
            <div className={`flex-1 max-w-md ${isRTL ? 'mr-0 ml-4' : 'ml-0 mr-4'}`}>
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 
                  ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  placeholder={t.search}
                  className={`${isRTL ? 'pr-10' : 'pl-10'} w-full bg-brand-50/50 dark:bg-slate-700/50 
                    border-brand-200 dark:border-slate-600 focus:border-brand-400 dark:focus:border-brand-500
                    rounded-xl h-9 md:h-10 text-sm`}
                />
              </div>
            </div>


            {/* Right Actions */}
            <div className={`flex items-center gap-2 md:gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>

              {/* Language Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-brand-50 dark:hover:bg-slate-700 h-9 w-9 md:h-10 md:w-10">
                    <Globe className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  <DropdownMenuItem onClick={() => setLanguage('ar')} className={language === 'ar' ? 'bg-brand-50 dark:bg-slate-700' : ''}>
                    <span className="ml-2">العربية</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('fr')} className={language === 'fr' ? 'bg-brand-50 dark:bg-slate-700' : ''}>
                    <span>Français</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-xl hover:bg-brand-50 dark:hover:bg-slate-700 h-9 w-9 md:h-10 md:w-10"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                )}
              </Button>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-brand-50 dark:hover:bg-slate-700 p-0">
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-brand-500
                        flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-200 dark:shadow-brand-900/30 overflow-hidden ring-2 ring-white dark:ring-slate-700 transition-colors duration-500">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        (user?.name?.charAt(0) || 'U').toUpperCase()
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0" sideOffset={8}>
                  <div className="p-1">
                    <DropdownMenuItem
                      onClick={() => { supabase.auth.signOut(); setSession(null); }}
                      className="gap-2 cursor-pointer rounded-lg text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{language === 'ar' ? 'تسجيل الخروج' : 'Se déconnecter'}</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-2 md:p-6 pb-20 md:pb-6 transition-colors duration-500">
            <div className="max-w-7xl mx-auto">
              {renderView()}
            </div>
          </main>

        </div>

        {/* Mobile Sidebar Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
      <ChatWidget />
    </div>
  );
}

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (currentHash === '#/book') {
    return <PublicBooking />;
  }

  return <CRMApp />;
}