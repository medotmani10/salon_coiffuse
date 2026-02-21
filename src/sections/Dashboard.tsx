import { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  Percent,
  AlertTriangle,
  CheckCircle,
  Package,
  Crown,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Sparkles,
  Plus,
  ChevronDown,
  Scissors,
  ShoppingBag,
  UserPlus,
  FileBarChart,
  CalendarPlus
} from 'lucide-react';
import { api } from '@/services/api';
import { amina, aiUtils } from '@/services/ai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Localization, Language, Alert, View } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardProps {
  t: Localization;
  language: Language;
  onNavigate: (view: View) => void;
}


export default function Dashboard({ t, language, onNavigate }: DashboardProps) {
  const isRTL = language === 'ar';
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    todayAppointments: 0,
    activeCustomers: 0,
    occupancy: 0,
    weeklyData: [] as any[],
    monthlyData: [] as any[],
    serviceDistribution: [] as any[],
    recentActivity: [] as any[]
  });

  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false);
  const [revenueFilter, setRevenueFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const handleGenerateInsight = async () => {
    setIsGeneratingInsight(true);
    const contextStr = `الإيرادات: ${stats.revenue} دج، مواعيد اليوم: ${stats.todayAppointments}، الإشغال: ${stats.occupancy}%`;
    const insight = await amina.getInsight(contextStr);
    if (insight) {
      setAlerts(prev => [{
        id: 'ai-insight-' + Date.now(),
        type: 'info',
        titleAr: 'نصيحة اليوم',
        titleFr: 'Conseil du Jour',
        messageAr: insight,
        messageFr: insight, // Fallback for now
        severity: 'info',
        isRead: false,
        createdAt: new Date()
      }, ...prev]);
    }
    setIsGeneratingInsight(false);
  };

  const handleAlertClick = (alert: Alert) => {
    if (alert.type === 'stock') onNavigate('inventory');
    if (alert.type === 'appointment') onNavigate('appointments');
    if (alert.type === 'info' || alert.type === 'goal') setIsRevenueDialogOpen(true);
  };

  useEffect(() => {
    if (isRevenueDialogOpen) {
      const fetchTransactions = async () => {
        setLoadingTransactions(true);
        const { data } = await api.transactions.getAll(revenueFilter);
        if (data) setTransactions(data);
        setLoadingTransactions(false);
      };
      fetchTransactions();
    }
  }, [isRevenueDialogOpen, revenueFilter]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, smartAlerts] = await Promise.all([
          api.appointments.getStats(),
          aiUtils.getSmartAlerts(),
        ]);

        if (statsRes.data) {
          // Add fallback colors for services that may not have one set
          const FALLBACK_COLORS = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'];
          const coloredDistribution = (statsRes.data.serviceDistribution || []).map(
            (s: { name: string; value: number; color?: string }, i: number) => ({
              ...s,
              color: s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            })
          );

          setStats({
            revenue: statsRes.data.totalRevenue,
            todayAppointments: statsRes.data.todayAppointments,
            activeCustomers: statsRes.data.totalClients,
            occupancy: statsRes.data.occupancy,
            weeklyData: statsRes.data.weeklyData,
            monthlyData: statsRes.data.monthlyData,
            serviceDistribution: coloredDistribution,
            recentActivity: statsRes.data.recentActivity
          });
        }

        if (smartAlerts.length > 0) {
          setAlerts(smartAlerts);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const kpiCards = [
    {
      title: t.revenue,
      value: `${stats.revenue.toLocaleString()} DZD`,
      change: '+12.5%', // Keep mock trend for now
      trend: 'up',
      icon: DollarSign,
      color: 'from-emerald-400 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      onClick: () => setIsRevenueDialogOpen(true)
    },
    {
      title: t.todayAppointments,
      value: stats.todayAppointments.toString(),
      change: '+8.2%',
      trend: 'up',
      icon: Calendar,
      color: 'from-rose-400 to-rose-600',
      bgColor: 'bg-rose-50 dark:bg-rose-900/20',
      onClick: () => onNavigate('appointments')
    },
    {
      title: t.activeCustomers,
      value: stats.activeCustomers.toString(),
      change: '+5.3%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: t.occupancy,
      value: `${stats.occupancy}%`,
      change: '-2.1%',
      trend: 'down',
      icon: Percent,
      color: 'from-amber-400 to-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'stock': return Package;
      case 'appointment': return Crown;
      case 'goal': return Target;
      case 'info': return Sparkles;
      default: return AlertTriangle;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';

      case 'info': return 'text-violet-500 bg-violet-50 dark:bg-violet-900/20';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className={`flex items-center justify-between flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {language === 'ar' ? 'مرحباً بعودتك!' : 'Bienvenue!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-200 dark:shadow-none gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إجراءات سريعة' : 'Actions Rapides'}
                <ChevronDown className="w-4 h-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
              {/* Appointments */}
              <DropdownMenuItem
                className="gap-3 cursor-pointer py-2.5"
                onClick={() => onNavigate('appointments')}
              >
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                  <CalendarPlus className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'ar' ? 'موعد جديد' : 'Nouveau RDV'}</p>
                  <p className="text-xs text-slate-400">{language === 'ar' ? 'إضافة حجز' : 'Ajouter un rendez-vous'}</p>
                </div>
              </DropdownMenuItem>

              {/* New Client */}
              <DropdownMenuItem
                className="gap-3 cursor-pointer py-2.5"
                onClick={() => onNavigate('clients')}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'ar' ? 'زبون جديد' : 'Nouveau Client'}</p>
                  <p className="text-xs text-slate-400">{language === 'ar' ? 'تسجيل زبون' : 'Enregistrer un client'}</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* POS Sale */}
              <DropdownMenuItem
                className="gap-3 cursor-pointer py-2.5"
                onClick={() => onNavigate('pos')}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'ar' ? 'بيع سريع' : 'Vente POS'}</p>
                  <p className="text-xs text-slate-400">{language === 'ar' ? 'فتح نقطة البيع' : 'Ouvrir la caisse'}</p>
                </div>
              </DropdownMenuItem>

              {/* New Service */}
              <DropdownMenuItem
                className="gap-3 cursor-pointer py-2.5"
                onClick={() => onNavigate('services')}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'ar' ? 'خدمة جديدة' : 'Nouveau Service'}</p>
                  <p className="text-xs text-slate-400">{language === 'ar' ? 'إضافة خدمة' : 'Ajouter un service'}</p>
                </div>
              </DropdownMenuItem>

              {/* Purchase / Inventory */}
              <DropdownMenuItem
                className="gap-3 cursor-pointer py-2.5"
                onClick={() => onNavigate('inventory')}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'ar' ? 'شراء جديد' : 'Nouvel Achat'}</p>
                  <p className="text-xs text-slate-400">{language === 'ar' ? 'إضافة مشتريات' : 'Ajouter au stock'}</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Reports */}
              <DropdownMenuItem
                className="gap-3 cursor-pointer py-2.5"
                onClick={() => onNavigate('reports')}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <FileBarChart className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'ar' ? 'التقارير' : 'Rapports'}</p>
                  <p className="text-xs text-slate-400">{language === 'ar' ? 'عرض الإحصائيات' : 'Voir les statistiques'}</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <Card
              key={index}
              className={`border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
              bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden 
              ${kpi.onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
              onClick={kpi.onClick}
            >
              <CardContent className="p-4 md:p-6">
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{kpi.title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpi.value}</h3>
                    <div className={`flex items-center gap-1 mt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <TrendIcon className={`w-4 h-4 ${kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`} />
                      <span className={`text-sm font-medium ${kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {kpi.change}
                      </span>
                      <span className="text-xs text-slate-400">
                        {language === 'ar' ? 'من الأسبوع الماضي' : 'vs semaine dernière'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} 
                    flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue Chart */}
        <Card className="lg:col-span-2 border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t.weeklyTrend}
            </CardTitle>
            <Badge variant="secondary" className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              {language === 'ar' ? 'هذا الأسبوع' : 'Cette Semaine'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-60 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#f43f5e' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {language === 'ar' ? 'توزيع الخدمات' : 'Distribution des Services'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stats.serviceDistribution.map((item) => (
                <div key={item.name} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{item.name}</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {t.alerts}
              <Badge className="bg-rose-500 text-white">{alerts.length}</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateInsight}
              disabled={isGeneratingInsight}
              className="text-violet-500 hover:text-violet-600 hover:bg-violet-50"
            >
              {isGeneratingInsight ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="ml-2 hidden sm:inline">
                {language === 'ar' ? 'تحليل ذكي' : 'Info IA'}
              </span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-xl ${getAlertColor(alert.severity)} 
                    transition-all hover:scale-[1.02] cursor-pointer`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${alert.type === 'info' ? 'bg-violet-100 dark:bg-violet-900/30' :
                      alert.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {language === 'ar' ? alert.titleAr : alert.titleFr}
                    </p>
                    <p className="text-xs opacity-80 line-clamp-2">
                      {language === 'ar' ? alert.messageAr : alert.messageFr}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t.monthlyTrend}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="url(#colorRevenue)"
                    radius={[6, 6, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {language === 'ar' ? 'النشاط الأخير' : 'Activité Récente'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${activity.type === 'payment' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                      activity.type === 'appointment' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                        activity.type === 'service' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                          'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}>
                    {activity.type === 'payment' ? <DollarSign className="w-4 h-4" /> :
                      activity.type === 'appointment' ? <Calendar className="w-4 h-4" /> :
                        activity.type === 'service' ? <CheckCircle className="w-4 h-4" /> :
                          <Users className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activity.client} • {activity.time}
                    </p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {activity.amount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Revenue Details Dialog */}
      <Dialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تفاصيل المبيعات' : 'Détails des Ventes'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Tabs value={revenueFilter} onValueChange={(v: any) => setRevenueFilter(v)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="today">{language === 'ar' ? 'اليوم' : 'Aujourd\'hui'}</TabsTrigger>
                <TabsTrigger value="week">{language === 'ar' ? 'أسبوع' : 'Semaine'}</TabsTrigger>
                <TabsTrigger value="month">{language === 'ar' ? 'شهر' : 'Mois'}</TabsTrigger>
                <TabsTrigger value="all">{language === 'ar' ? 'الكل' : 'Tout'}</TabsTrigger>
              </TabsList>
            </Tabs>

            {loadingTransactions ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className={`p-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className={`p-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'العميل' : 'Client'}</th>
                      <th className={`p-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الموظف' : 'Employé'}</th>
                      <th className={`p-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'طريقة الدفع' : 'Paiement'}</th>
                      <th className={`p-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                      <th className={`p-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'المبلغ' : 'Montant'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {language === 'ar' ? 'لا توجد بيانات' : 'Aucune donnée'}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 whitespace-nowrap font-medium">
                            {new Date(tx.date).toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3 whitespace-nowrap">{tx.clientName}</td>
                          <td className="p-3 whitespace-nowrap">{tx.staffName}</td>
                          <td className="p-3 whitespace-nowrap capitalize">{tx.paymentMethod}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                              ${tx.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-bold text-emerald-600">
                            {tx.total.toLocaleString()} DZD
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
