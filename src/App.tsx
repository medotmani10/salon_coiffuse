import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  ShoppingCart,
  Calendar,
  Users,
  Sparkles,
  UserCircle,
  BarChart3,
  Settings,
  Package,
  Bell,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
import './App.css';

type View = 'dashboard' | 'pos' | 'appointments' | 'clients' | 'services' | 'staff' | 'inventory' | 'reports' | 'settings';

import { ChatWidget } from './components/ChatWidget';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [language, setLanguage] = useState<Language>('fr');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications] = useState(3);

  const t = translations[language];
  const isRTL = language === 'ar';

  const [storeSettings, setStoreSettings] = useState({
    name: 'ZenStyle',
    logo_url: ''
  });
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for changes
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
        name: data.name || 'ZenStyle',
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

    // Explicitly type the permissions object
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
      case 'dashboard':
        return <Dashboard t={t} language={language} onNavigate={setCurrentView} />;
      case 'pos':
        return <POS t={t} language={language} />;
      case 'appointments':
        return <Appointments t={t} language={language} />;
      case 'clients':
        return <Clients t={t} language={language} />;
      case 'services':
        return <Services t={t} language={language} />;
      case 'staff':
        return <Staff t={t} language={language} />;
      case 'inventory':
        return <Inventory t={t} language={language} />;
      case 'reports':
        return <Reports t={t} language={language} />;
      case 'settings':
        return <SettingsPanel t={t} language={language} onLanguageChange={setLanguage} onSettingsChange={loadStoreSettings} />;
      default:
        return <Dashboard t={t} language={language} onNavigate={setCurrentView} />;
    }
  };



  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login language={language} />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-64' : 'w-20'} ${isRTL ? 'border-l' : 'border-r'} 
            border-rose-200/50 dark:border-slate-700/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl 
            transition-all duration-300 ease-in-out hidden md:flex flex-col`}
        >
          {/* Logo */}
          <div className={`h-20 flex items-center ${sidebarOpen ? 'px-6' : 'px-4'} ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-rose-900/30 overflow-hidden">
                {storeSettings.logo_url ? (
                  <img src={storeSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              {sidebarOpen && (
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent truncate max-w-[150px]">
                    {storeSettings.name}
                  </h1>
                  <p className="text-xs text-rose-400 dark:text-rose-300">
                    {t.salonManagement}
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
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} 
                    gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-slate-700/50 hover:text-rose-600 dark:hover:text-rose-400'
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
          <div className="p-4 border-t border-rose-200/50 dark:border-slate-700/50">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`w-full flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} 
                justify-center gap-2 p-2 rounded-lg text-slate-500 dark:text-slate-400 
                hover:bg-rose-50 dark:hover:bg-slate-700/50 transition-colors`}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <header className="h-16 md:h-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl 
            border-b border-rose-200/50 dark:border-slate-700/50 
            flex items-center justify-between px-4 md:px-6 z-10">
            {/* Mobile Logo (Visible only on mobile) */}
            <div className="md:hidden flex items-center gap-2 mr-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-rose-900/30 overflow-hidden">
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
                  className={`${isRTL ? 'pr-10' : 'pl-10'} w-full bg-rose-50/50 dark:bg-slate-700/50 
                    border-rose-200 dark:border-slate-600 focus:border-rose-400 dark:focus:border-rose-500
                    rounded-xl h-9 md:h-10 text-sm`}
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className={`flex items-center gap-2 md:gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Language Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-rose-50 dark:hover:bg-slate-700 h-9 w-9 md:h-10 md:w-10">
                    <Globe className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  <DropdownMenuItem onClick={() => setLanguage('ar')} className={language === 'ar' ? 'bg-rose-50 dark:bg-slate-700' : ''}>
                    <span className="ml-2">العربية</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('fr')} className={language === 'fr' ? 'bg-rose-50 dark:bg-slate-700' : ''}>
                    <span>Français</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-xl hover:bg-rose-50 dark:hover:bg-slate-700 h-9 w-9 md:h-10 md:w-10"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                )}
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-rose-50 dark:hover:bg-slate-700 relative h-9 w-9 md:h-10 md:w-10"
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
                {notifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 p-0 flex items-center justify-center 
                    bg-rose-500 text-white text-[10px] md:text-xs">
                    {notifications}
                  </Badge>
                )}
              </Button>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-rose-50 dark:hover:bg-slate-700">
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                      flex items-center justify-center text-white font-medium shadow-lg shadow-rose-200 dark:shadow-rose-900/30 overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        (user?.name?.charAt(0) || 'U').toUpperCase()
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.name || 'User'}</p>
                      <p className="w-[200px] truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      supabase.auth.signOut();
                      setSession(null);
                    }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{language === 'ar' ? 'تسجيل الخروج' : 'Se déconnecter'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-2 md:p-6 pb-20 md:pb-6">
            <div className="max-w-7xl mx-auto">
              {renderView()}
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl 
            border-t border-rose-200/50 dark:border-slate-700/50 z-50 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex flex-col items-center justify-center w-full h-full gap-1 
                    transition-all duration-200 
                    ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'}`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[10px] font-medium truncate w-full text-center px-1">
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors">
                  <Menu className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{language === 'ar' ? 'المزيد' : 'Menu'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} side="top" className="w-56 mb-2">
                {navItems.slice(4).map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`gap-2 p-3 cursor-pointer ${isActive ? 'bg-rose-50 dark:bg-slate-700 text-rose-600' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
      <ChatWidget />
    </div >
  );
}

export default App;
