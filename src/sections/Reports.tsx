import { useState, useEffect } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Printer,
  PieChart as PieChartIcon,
  Award,
  Loader2,
  FileText
} from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { generateFullReport } from '@/services/reportGenerator';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import type { Localization, Language } from '@/types';

interface ReportsProps {
  t: Localization;
  language: Language;
}

const COLORS = ['#f43f5e', '#ec4899', '#a855f7', '#8b5cf6', '#d946ef', '#6366f1', '#3b82f6', '#14b8a6'];

export default function Reports({ t, language }: ReportsProps) {
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('financial');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Data States
  const [financialData, setFinancialData] = useState<any>(null);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [storeName, setStoreName] = useState<string>('Caisse Xpress');

  useEffect(() => {
    fetchData();
    fetchStoreSettings();
  }, [dateRange]);

  const fetchStoreSettings = async () => {
    const { data } = await api.settings.getStoreSettings();
    if (data && data.name) setStoreName(data.name);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange?.from;
      const endDate = dateRange?.to;

      const [finRes, servRes, staffRes, invRes] = await Promise.all([
        api.reports.getFinancialData(startDate, endDate),
        api.reports.getServiceDistribution(startDate, endDate),
        api.reports.getStaffPerformance(startDate, endDate),
        api.reports.getInventoryReport() // Inventory is always current state
      ]);

      if (finRes.data) setFinancialData(finRes.data);
      if (servRes.data) setServiceData(servRes.data);
      if (staffRes.data) setStaffData(staffRes.data);
      if (invRes.data) setInventoryData(invRes.data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let cvsContent = "data:text/csv;charset=utf-8,\uFEFF";
    let filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'financial' && financialData) {
      cvsContent += "Mois,Revenus,Dépenses,Profit\n";
      financialData.monthlyRevenue.forEach((row: any) => {
        cvsContent += `${row.month},${row.revenue},${row.expenses},${row.profit}\n`;
      });
    } else if (activeTab === 'inventory' && inventoryData) {
      cvsContent += "Nom,Stock,MinStock,Prix,Catégorie\n";
      inventoryData.forEach((row: any) => {
        cvsContent += `${row.name},${row.stock},${row.minStock},${row.price},${row.category}\n`;
      });
    } else if (activeTab === 'performance' && staffData) {
      cvsContent += "Staff,Revenus,Clients,Transactions,Commission\n";
      staffData.forEach((row: any) => {
        cvsContent += `${row.name},${row.revenue},${row.clients},${row.transactions},${row.commission}\n`;
      });
    }

    const encodedUri = encodeURI(cvsContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    generateFullReport({
      financial: financialData,
      service: serviceData,
      staff: staffData,
      inventory: inventoryData,
      dateRange: dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined,
      storeName
    }, language);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mx-auto" />
          <p className="text-slate-500">{language === 'ar' ? 'جاري تحميل التقارير...' : 'Chargement des rapports...'}</p>
        </div>
      </div>
    );
  }

  // Fallback defaults if data is missing
  const totalRevenue = financialData?.totalRevenue || 0;
  const totalExpenses = financialData?.totalExpenses || 0;
  const totalProfit = financialData?.totalProfit || 0;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const monthlyRevenue = financialData?.monthlyRevenue || [];

  return (
    <div className="space-y-6 print:space-y-4 print:p-4">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''} print:hidden`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.reports}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' ? 'تحليلات وإحصائيات شاملة' : 'Analyses et statistiques complètes'}
          </p>
        </div>

        <div className={`flex flex-wrap items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
            language={language === 'ar' ? 'ar' : 'fr'}
            className="w-full md:w-auto"
          />

          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Button variant="outline" className="rounded-xl" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white print:shadow-none print:border print:border-slate-200">
          <CardContent className="p-5">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-emerald-100 text-sm">{language === 'ar' ? 'إجمالي الإيرادات' : 'Revenus Totaux'}</p>
                <p className="text-2xl font-bold">{(totalRevenue).toLocaleString()} DZD</p>
                <div className={`flex items-center gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">{financialData?.totalTransactions || 0} {language === 'ar' ? 'معاملة' : 'trans.'}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-400 to-rose-600 text-white print:shadow-none print:border print:border-slate-200">
          <CardContent className="p-5">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-rose-100 text-sm">{language === 'ar' ? 'إجمالي المصروفات' : 'Dépenses (Est.)'}</p>
                <p className="text-2xl font-bold">{(totalExpenses).toLocaleString()} DZD</p>
                <div className={`flex items-center gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm">~60%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white print:shadow-none print:border print:border-slate-200">
          <CardContent className="p-5">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-blue-100 text-sm">{language === 'ar' ? 'صافي الربح' : 'Profit Net (Est.)'}</p>
                <p className="text-2xl font-bold">{(totalProfit).toLocaleString()} DZD</p>
                <div className={`flex items-center gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">~40%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white print:shadow-none print:border print:border-slate-200">
          <CardContent className="p-5">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-amber-100 text-sm">{language === 'ar' ? 'هامش الربح' : 'Marge Bénéficiaire'}</p>
                <p className="text-2xl font-bold">{profitMargin}%</p>
                <div className={`flex items-center gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <PieChartIcon className="w-4 h-4" />
                  <span className="text-sm">Avg</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <PieChartIcon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="financial" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid print:hidden">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t.financial}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            {t.inventory}
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            {t.performance}
          </TabsTrigger>
        </TabsList>

        {/* Financial Reports */}
        <TabsContent value="financial" className="space-y-6">
          {/* Revenue Chart */}
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm print:shadow-none print:border">
            <CardHeader className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'الإيرادات والمصروفات' : 'Revenus et Dépenses'}
              </CardTitle>
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 print:hidden">
                {language === 'ar' ? '6 أشهر' : '6 mois'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v as number) / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                      name={language === 'ar' ? 'الإيرادات' : 'Revenus'}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f43f5e"
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      strokeWidth={2}
                      name={language === 'ar' ? 'المصروفات' : 'Dépenses'}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Service Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
              bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'توزيع الإيرادات حسب الخدمة' : 'Répartition des Revenus par Service'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {serviceData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {serviceData.map((item, index) => (
                    <div key={item.name} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                      <span className="text-sm font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
              bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'أداء طرق الدفع' : 'Performance des Paiements'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(financialData?.paymentMethods || {}).map(([method, amount]: [string, any], index) => {
                    const percent = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                    return (
                      <div key={method} className="space-y-1">
                        <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="capitalize">
                            {method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Espèces') :
                              method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Carte') :
                                method === 'credit' ? (language === 'ar' ? 'كريدي' : 'Crédit') :
                                  method}
                          </span>
                          <span className="font-bold">{Number(amount).toLocaleString()} DZD</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Reports */}
        <TabsContent value="inventory" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'مستويات المخزون' : 'Niveaux de Stock'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryData.map((item) => {
                  const percentage = item.minStock > 0 ? (item.stock / (item.minStock * 3)) * 100 : 50;
                  const isLow = item.stock <= item.minStock;
                  return (
                    <div key={item.name} className="space-y-2">
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="font-medium">{item.name}</span>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-sm text-slate-500">
                            {item.price} DZD
                          </span>
                          <Badge className={isLow
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}>
                            {item.stock} {language === 'ar' ? 'متبقي' : 'restants'}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Reports */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'أداء الموظفين' : 'Performance du Personnel'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffData.map((staff, index) => (
                  <div
                    key={staff.name}
                    className={`flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                      flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{staff.name}</p>
                      <div className={`flex items-center gap-4 mt-1 text-sm text-slate-500 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {staff.clients} {language === 'ar' ? 'عميل' : 'clients'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          {staff.transactions} trans.
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {(staff.revenue).toLocaleString()} DZD
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'ar' ? 'الإيرادات' : 'Revenus'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
