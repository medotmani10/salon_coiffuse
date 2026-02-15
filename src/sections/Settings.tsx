import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  DollarSign,
  Percent,
  Shield,
  Database,
  Cloud,
  Moon,
  Sun,
  Check,
  Lock,
  UserPlus,
  Save,
  RefreshCw,
  Download,
  Upload,
  Bell,
  Mail,
  Smartphone,
  Clock,
  MessageSquare,
  Copy,
  ExternalLink
} from 'lucide-react';
import { api } from '@/services/api';
// import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Language } from '@/types';



const currencies = [
  { code: 'DZD', name: { ar: 'دينار جزائري', fr: 'Dinar Algérien' }, symbol: 'DZD' },
  { code: 'EUR', name: { ar: 'يورو', fr: 'Euro' }, symbol: '€' },
  { code: 'USD', name: { ar: 'دولار أمريكي', fr: 'Dollar US' }, symbol: '$' },
];

const roles = [
  { id: 'admin', name: { ar: 'مدير', fr: 'Administrateur' }, permissions: ['all'] },
  { id: 'manager', name: { ar: 'مدير salon', fr: 'Gérant' }, permissions: ['view', 'edit', 'reports'] },
  { id: 'receptionist', name: { ar: 'موظف استقبال', fr: 'Réceptionniste' }, permissions: ['view', 'appointments', 'pos'] },
];



interface SettingsProps {
  t: any;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSettingsChange?: () => void;
}

export default function SettingsPanel({ t, language, onLanguageChange, onSettingsChange }: SettingsProps) {
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState('general');
  const [darkMode, setDarkMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('DZD');
  const [taxRate, setTaxRate] = useState(19);
  const [showNewUser, setShowNewUser] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const [savingHours, setSavingHours] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhook`);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    const { data } = await api.users.getAll();
    if (data) setUsers(data);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await api.users.updateRole(userId, newRole);
    loadUsers();
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    await api.users.toggleActive(userId, !currentStatus);
    loadUsers();
  };

  const defaultHours: Record<string, { open: string; close: string; isOpen: boolean }> = {
    saturday: { open: '08:00', close: '19:00', isOpen: true },
    sunday: { open: '08:00', close: '19:00', isOpen: true },
    monday: { open: '08:00', close: '19:00', isOpen: true },
    tuesday: { open: '08:00', close: '19:00', isOpen: true },
    wednesday: { open: '08:00', close: '19:00', isOpen: true },
    thursday: { open: '08:00', close: '19:00', isOpen: true },
    friday: { open: '08:00', close: '19:00', isOpen: false },
  };

  const [workingHours, setWorkingHours] = useState(defaultHours);

  const dayLabels: Record<string, { ar: string; fr: string }> = {
    saturday: { ar: 'السبت', fr: 'Samedi' },
    sunday: { ar: 'الأحد', fr: 'Dimanche' },
    monday: { ar: 'الاثنين', fr: 'Lundi' },
    tuesday: { ar: 'الثلاثاء', fr: 'Mardi' },
    wednesday: { ar: 'الأربعاء', fr: 'Mercredi' },
    thursday: { ar: 'الخميس', fr: 'Jeudi' },
    friday: { ar: 'الجمعة', fr: 'Vendredi' },
  };

  useEffect(() => {
    const loadWorkingHours = async () => {
      const { data } = await api.settings.get('working_hours');
      if (data) setWorkingHours(data);
    };
    loadWorkingHours();
  }, []);

  const handleSaveWorkingHours = async () => {
    setSavingHours(true);
    await api.settings.update('working_hours', workingHours);
    setSavingHours(false);
  };

  const updateDayHours = (day: string, field: string, value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const [storeSettings, setStoreSettings] = useState({
    name: 'Caisse Xpress',
    logo_url: '',
    phone: '',
    address: '',
    tax_id: '',
    business_reg: ''
  });
  const [savingStore, setSavingStore] = useState(false);

  useEffect(() => {
    const loadStoreSettings = async () => {
      const { data } = await api.settings.getStoreSettings();
      if (data) setStoreSettings({
        name: data.name || 'Caisse Xpress',
        logo_url: data.logo_url || '',
        phone: data.phone || '',
        address: data.address || '',
        tax_id: data.tax_id || '',
        business_reg: data.business_reg || ''
      });
    };
    loadStoreSettings();
  }, []);

  const handleSaveStoreSettings = async () => {
    setSavingStore(true);
    await api.settings.updateStoreSettings(storeSettings);
    // Update document title immediately
    document.title = storeSettings.name;
    onSettingsChange?.();
    setSavingStore(false);
  };

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmCode, setResetConfirmCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDatabase = async () => {
    if (resetConfirmCode !== 'DELETE') return;

    setIsResetting(true);
    const { error } = await api.settings.resetDatabase();
    setIsResetting(false);

    if (error) {
      alert(language === 'ar' ? 'حدث خطأ أثناء إعادة التعيين' : 'Erreur lors de la réinitialisation');
      console.error(error);
    } else {
      setResetConfirmOpen(false);
      setResetConfirmCode('');
      // Reload page to reflect changes
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.settings}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' ? 'إدارة إعدادات النظام' : 'Gérer les paramètres du système'}
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'عام' : 'Général'}</span>
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'المتجر' : 'Magasin'}</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'أوقات العمل' : 'Horaires'}</span>
          </TabsTrigger>
          <TabsTrigger value="localization" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{t.language}</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'مالي' : 'Financier'}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t.security}</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">{t.backup}</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إعدادات المتجر' : 'Paramètres du Magasin'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'معلومات الهوية وجهات الاتصال' : 'Informations d\'identité et contact'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'اسم المتجر' : 'Nom du Magasin'}</label>
                  <Input
                    value={storeSettings.name}
                    onChange={(e) => setStoreSettings({ ...storeSettings, name: e.target.value })}
                    placeholder="Caisse Xpress"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'رقم الهاتف' : 'Téléphone'}</label>
                  <Input
                    value={storeSettings.phone}
                    onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                    placeholder="0550..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'شعار المتجر' : 'Logo du Magasin'}</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative group">
                      {storeSettings.logo_url ? (
                        <img src={storeSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Database className="w-6 h-6 text-slate-300" />
                      )}
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setSavingStore(true);
                          const { data: publicUrl, error } = await api.settings.uploadLogo(file);
                          if (publicUrl) {
                            setStoreSettings(prev => ({ ...prev, logo_url: publicUrl }));
                            // Notify App component to refresh settings
                            onSettingsChange?.();
                          } else {
                            console.error('Upload failed:', error);
                          }
                          setSavingStore(false);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">
                        {language === 'ar' ? 'قم برفع شعار متجرك' : 'Télécharger votre logo'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'ar' ? 'PNG, JPG حتى 2MB' : 'PNG, JPG jusqu\'à 2MB'}
                      </p>
                      {/* Remove URL button (optional, or keep for advanced users) */}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'العنوان' : 'Adresse'}</label>
                  <Input
                    value={storeSettings.address}
                    onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                    placeholder="Cité ... Alger"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'رقم التعريف الجبائي (NIF)' : 'NIF (Numéro d\'Identification Fiscale)'}</label>
                  <Input
                    value={storeSettings.tax_id}
                    onChange={(e) => setStoreSettings({ ...storeSettings, tax_id: e.target.value })}
                    placeholder="000..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'السجل التجاري (RC)' : 'Registre de Commerce (RC)'}</label>
                  <Input
                    value={storeSettings.business_reg}
                    onChange={(e) => setStoreSettings({ ...storeSettings, business_reg: e.target.value })}
                    placeholder="16/00..."
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveStoreSettings}
                disabled={savingStore}
                className="w-full mt-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingStore
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Enregistrement...')
                  : (language === 'ar' ? 'حفظ المعلومات' : 'Enregistrer les Informations')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'المظهر' : 'Apparence'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تخصيص مظهر التطبيق' : 'Personnaliser l\'apparence de l\'application'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'الوضع الداكن' : 'Mode Sombre'}</p>
                    <p className="text-sm text-slate-500">
                      {language === 'ar' ? 'تفعيل المظهر الداكن' : 'Activer le thème sombre'}
                    </p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'الإشعارات' : 'Notifications'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إدارة إعدادات الإشعارات' : 'Gérer les paramètres de notification'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'إشعارات التطبيق' : 'Notifications App'}</p>
                    <p className="text-sm text-slate-500">
                      {language === 'ar' ? 'تلقي إشعارات داخل التطبيق' : 'Recevoir des notifications in-app'}
                    </p>
                  </div>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>

              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'إشعارات البريد' : 'Notifications Email'}</p>
                    <p className="text-sm text-slate-500">
                      {language === 'ar' ? 'تلقي إشعارات عبر البريد' : 'Recevoir des notifications par email'}
                    </p>
                  </div>
                </div>
                <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
              </div>

              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'إشعارات SMS' : 'Notifications SMS'}</p>
                    <p className="text-sm text-slate-500">
                      {language === 'ar' ? 'تلقي إشعارات عبر الرسائل' : 'Recevoir des notifications par SMS'}
                    </p>
                  </div>
                </div>
                <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Localization Settings */}
        <TabsContent value="localization" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t.language}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'اختر لغة واجهة التطبيق' : 'Choisir la langue de l\'interface'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => onLanguageChange('ar')}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${language === 'ar'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                  }`}
              >
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                    ع
                  </div>
                  <div>
                    <p className="font-medium">العربية</p>
                    <p className="text-sm text-slate-500">Arabic (RTL)</p>
                  </div>
                </div>
                {language === 'ar' && <Check className="w-5 h-5 text-rose-500" />}
              </div>

              <div
                onClick={() => onLanguageChange('fr')}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${language === 'fr'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                  }`}
              >
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    Fr
                  </div>
                  <div>
                    <p className="font-medium">Français</p>
                    <p className="text-sm text-slate-500">French (LTR)</p>
                  </div>
                </div>
                {language === 'fr' && <Check className="w-5 h-5 text-rose-500" />}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings */}
        <TabsContent value="financial" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t.currency}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إعدادات العملة' : 'Paramètres de devise'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currencies.map((currency) => (
                <div
                  key={currency.code}
                  onClick={() => setSelectedCurrency(currency.code)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedCurrency === currency.code
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                    }`}
                >
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{language === 'ar' ? currency.name.ar : currency.name.fr}</p>
                      <p className="text-sm text-slate-500">{currency.code} ({currency.symbol})</p>
                    </div>
                  </div>
                  {selectedCurrency === currency.code && <Check className="w-5 h-5 text-rose-500" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t.taxes}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إعدادات الضرائب' : 'Paramètres de taxe'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'معدل الضريبة (%)' : 'Taux de Taxe (%)'}
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="max-w-[120px]"
                  />
                  <Percent className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">
                  {language === 'ar'
                    ? 'سيتم تطبيق هذا المعدل على جميع الفواتير'
                    : 'Ce taux sera appliqué à toutes les factures'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'المستخدمون' : 'Utilisateurs'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إدارة مستخدمي النظام والصلاحيات' : 'Gérer les utilisateurs et les permissions'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex justify-end ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <Button onClick={() => setShowNewUser(true)} variant="outline" className="rounded-xl">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'مستخدم جديد' : 'Nouvel Utilisateur'}
                </Button>
              </div>

              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                        flex items-center justify-center text-white font-bold overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="h-8 rounded-md border-slate-200 dark:border-slate-600 bg-transparent text-sm"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {language === 'ar' ? r.name.ar : r.name.fr}
                          </option>
                        ))}
                      </select>

                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleActive(user.id, user.isActive)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تغيير كلمة المرور' : 'Changer le Mot de Passe'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'كلمة المرور الحالية' : 'Mot de Passe Actuel'}</label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'كلمة المرور الجديدة' : 'Nouveau Mot de Passe'}</label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirmer le Mot de Passe'}</label>
                <Input type="password" />
              </div>
              <Button className="w-full bg-gradient-to-r from-rose-500 to-pink-500">
                <Lock className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تحديث كلمة المرور' : 'Mettre à Jour'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t.backup}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إدارة النسخ الاحتياطي والمزامنة' : 'Gérer les sauvegardes et la synchronisation'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'نسخ احتياطي تلقائي' : 'Sauvegarde Automatique'}</p>
                    <p className="text-sm text-slate-500">
                      {language === 'ar' ? 'نسخ احتياطي يومي في الساعة 2 صباحاً' : 'Sauvegarde quotidienne à 2h du matin'}
                    </p>
                  </div>
                </div>
                <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-16 rounded-xl">
                  <Download className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <p className="font-medium">{language === 'ar' ? 'تصدير البيانات' : 'Exporter'}</p>
                    <p className="text-xs text-slate-500">JSON / CSV</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-16 rounded-xl">
                  <Upload className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <p className="font-medium">{language === 'ar' ? 'استيراد البيانات' : 'Importer'}</p>
                    <p className="text-xs text-slate-500">JSON / CSV</p>
                  </div>
                </Button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Cloud className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-400">
                      {language === 'ar' ? 'المزامنة السحابية' : 'Synchronisation Cloud'}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {language === 'ar' ? 'آخر مزامنة: منذ 2 ساعة' : 'Dernière sync: il y a 2 heures'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-2 border-red-100 dark:border-red-900/30 shadow-none bg-red-50/30 dark:bg-red-900/10">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                {language === 'ar' ? 'منطقة الخطر' : 'Zone de Danger'}
              </CardTitle>
              <CardDescription className="text-red-500/80">
                {language === 'ar' ? 'الإجراءات هنا غير قابلة للتراجع' : 'Les actions ici sont irréversibles'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {language === 'ar' ? 'مسح جميع البيانات' : 'Effacer toutes les données'}
                  </p>
                  <p className="text-sm text-slate-500 max-w-md">
                    {language === 'ar'
                      ? 'سيتم حذف جميع الزبائن، المواعيد، المعاملات، والمخزون. ستبقى الإعدادات فقط.'
                      : 'Cela supprimera tous les clients, rendez-vous, transactions et stocks. Seuls les paramètres resteront.'}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setResetConfirmOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {language === 'ar' ? 'إعادة ضبط المصنع' : 'Réinitialiser Données'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Settings */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-green-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                WhatsApp Integration (AppsLink.io)
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'اربط التطبيق مع واتساب للرد الآلي والحجز'
                  : 'Connecter WhatsApp pour les réponses automatiques et la réservation'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Webhook URL
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {language === 'ar'
                    ? 'انسخ هذا الرابط وضعه في إعدادات Webhook في AppsLink'
                    : 'Copiez cette URL et collez-la dans les paramètres Webhook de AppsLink'}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-mono break-all">
                    {webhookUrl || 'Loading...'}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    alert('Copied!');
                  }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Setup Instructions</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>Go to <a href="https://app.appslink.io" target="_blank" className="text-blue-500 hover:underline">AppsLink Dashboard</a>.</li>
                  <li>Click on your Instance.</li>
                  <li>Go to <strong>Webhook Settings</strong>.</li>
                  <li>Paste the URL above into the <strong>Webhook URL</strong> field.</li>
                  <li>Enable <strong>MESSAGES_UPSERT</strong> or <strong>MESSAGES_SET</strong>.</li>
                  <li>Click <strong>Save</strong>.</li>
                </ol>
              </div>

              <div className="flex justify-end">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open AppsLink
                </Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Working Hours Settings */}
        <TabsContent value="hours" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'أوقات عمل المحل' : 'Horaires d\'Ouverture'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'حدد أوقات العمل لكل يوم من أيام الأسبوع' : 'Définir les heures d\'ouverture pour chaque jour de la semaine'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(dayLabels).map(([day, label]) => (
                <div
                  key={day}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${workingHours[day]?.isOpen
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-60'
                    } ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Switch
                    checked={workingHours[day]?.isOpen || false}
                    onCheckedChange={(val) => updateDayHours(day, 'isOpen', val)}
                  />
                  <div className="w-24 font-medium text-sm">
                    {language === 'ar' ? label.ar : label.fr}
                  </div>
                  {workingHours[day]?.isOpen ? (
                    <div className={`flex items-center gap-2 flex-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Input
                        type="time"
                        value={workingHours[day]?.open || '08:00'}
                        onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                        className="max-w-[130px]"
                      />
                      <span className="text-slate-400">→</span>
                      <Input
                        type="time"
                        value={workingHours[day]?.close || '19:00'}
                        onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                        className="max-w-[130px]"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 text-sm text-slate-400 italic">
                      {language === 'ar' ? 'مغلق' : 'Fermé'}
                    </div>
                  )}
                </div>
              ))}
              <Button
                onClick={handleSaveWorkingHours}
                disabled={savingHours}
                className="w-full mt-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingHours
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Enregistrement...')
                  : (language === 'ar' ? 'حفظ أوقات العمل' : 'Enregistrer les Horaires')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New User Dialog */}
      <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <UserPlus className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'مستخدم جديد' : 'Nouvel Utilisateur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الاسم الكامل' : 'Nom Complet'}</label>
              <Input placeholder={language === 'ar' ? 'الاسم الكامل' : 'Nom complet'} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="email@zenstyle.dz" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الدور' : 'Rôle'}</label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3">
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {language === 'ar' ? role.name.ar : role.name.fr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'كلمة المرور' : 'Mot de Passe'}</label>
              <Input type="password" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewUser(false)}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                onClick={() => {
                  // Ideally call API to create user
                  // For now, allow simple UI feedback or guidance
                  alert(language === 'ar' ? 'لإضافة مستخدم جديد، يرجى استخدام لوحة تحكم Supabase > Authentication.' : 'Pour ajouter un utilisateur, veuillez utiliser le tableau de bord Supabase > Authentication.');
                  setShowNewUser(false);
                }}
              >
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>

      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-md border-red-200">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-red-600 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Shield className="w-5 h-5" />
              {language === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirmation de Suppression'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
              {language === 'ar'
                ? 'تحذير: هذا الإجراء سيقوم بمسح قاعدة البيانات بالكامل ولا يمكن التراجع عنه. هل أنت متأكد؟'
                : 'Attention: Cette action effacera toute la base de données et est irréversible. Êtes-vous sûr ?'}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === 'ar' ? 'اكتب "DELETE" للتأكيد' : 'Écrivez "DELETE" pour confirmer'}
              </label>
              <Input
                value={resetConfirmCode}
                onChange={(e) => setResetConfirmCode(e.target.value)}
                placeholder="DELETE"
                className="border-red-200 focus-visible:ring-red-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setResetConfirmOpen(false)}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={resetConfirmCode !== 'DELETE' || isResetting}
                onClick={handleResetDatabase}
              >
                {isResetting
                  ? (language === 'ar' ? 'جاري المسح...' : 'Suppression...')
                  : (language === 'ar' ? 'نعم، احذف كل شيء' : 'Oui, tout supprimer')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
