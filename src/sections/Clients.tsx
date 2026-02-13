import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Star,
  TrendingUp,
  History,
  MoreVertical,
  Crown,
  Award,
  Medal,
  Gem,
  Edit,
  Trash2,
  MessageSquare,
  Gift,
  Users,
  Loader2,
  Sparkles,
  Brain,
  Wallet,
  DollarSign,
  AlertCircle,
  Check
} from 'lucide-react';
import { api } from '@/services/api';
import { aiService } from '@/services/ai';
type AiInsight = { type: 'recommendation' | 'prediction' | 'warning'; message: string; confidence: number; action?: string; };
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Localization, Language, Client } from '@/types';

interface ClientsProps {
  t: Localization;
  language: Language;
}

// Client payment type
interface ClientPaymentRecord {
  id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: Date;
}

export default function Clients({ t, language }: ClientsProps) {
  const isRTL = language === 'ar';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI State
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<Client['tier'] | 'all'>('all');

  const [creating, setCreating] = useState(false);
  const [clientPayments, setClientPayments] = useState<ClientPaymentRecord[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    birthDate: ''
  });

  const handleCreateClient = async () => {
    if (!newClientData.firstName || !newClientData.lastName) return;

    setCreating(true);
    try {
      const { data, error } = await api.clients.create({
        firstName: newClientData.firstName,
        lastName: newClientData.lastName,
        phone: newClientData.phone,
        email: newClientData.email,
        birthDate: newClientData.birthDate ? new Date(newClientData.birthDate) : undefined,
        tier: 'bronze',
        loyaltyPoints: 0,
        totalSpent: 0,
        visitCount: 0
      } as any);

      if (data) {
        setClients([data, ...clients]);
        setShowNewClient(false);
        setNewClientData({ firstName: '', lastName: '', phone: '', email: '', birthDate: '' });
      } else if (error) {
        console.error('Failed to create client:', error);
      }
    } catch (err) {
      console.error('Error creating client:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedClient) return;
    setAnalyzing(true);
    setInsights([]); // Reset previous insights
    try {
      const results = await aiService.analyzeClient(selectedClient);
      setInsights(results);
    } catch (err) {
      console.error('AI Analysis failed', err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const { data, error } = await api.clients.getAll();
      if (error) {
        setError(error);
        console.error('Error fetching clients:', error);
      } else if (data) {
        setClients(data);
      }
      setLoading(false);
    };

    fetchClients();
  }, []);

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setClientPayments([]);
    const { data } = await api.clients.getPayments(client.id);
    if (data) setClientPayments(data);
  };

  const handleRecordPayment = async () => {
    if (!selectedClient || paymentAmount <= 0) return;
    setRecordingPayment(true);
    try {
      await api.clients.addPayment({
        clientId: selectedClient.id,
        type: 'payment',
        amount: paymentAmount,
        description: language === 'ar' ? 'دفع دين' : 'Paiement dette'
      });
      await api.clients.updateCreditBalance(selectedClient.id, -paymentAmount);
      // Refresh
      const { data: cData } = await api.clients.getAll();
      if (cData) {
        setClients(cData);
        const updated = cData.find(c => c.id === selectedClient.id);
        if (updated) setSelectedClient(updated);
      }
      const { data: pData } = await api.clients.getPayments(selectedClient.id);
      if (pData) setClientPayments(pData);
      setPaymentAmount(0);
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">
        <p>Error loading clients: {error}</p>
      </div>
    );
  }

  // Use getTierIcon, getTierColor, getTierLabel from props or define them here if not imported
  // For brevity, assuming they are defined as in original code

  // Helper functions (same as before)
  const getTierIcon = (tier: Client['tier']) => {
    switch (tier) {
      case 'platinum': return <Gem className="w-5 h-5" />;
      case 'gold': return <Crown className="w-5 h-5" />;
      case 'silver': return <Medal className="w-5 h-5" />;
      case 'bronze': return <Award className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  const getTierColor = (tier: Client['tier']) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800';
      case 'gold': return 'bg-gradient-to-r from-amber-300 to-amber-500 text-amber-900';
      case 'silver': return 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700';
      case 'bronze': return 'bg-gradient-to-r from-orange-300 to-orange-500 text-orange-900';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTierLabel = (tier: Client['tier']) => {
    switch (tier) {
      case 'platinum': return language === 'ar' ? 'بلاتيني' : 'Platine';
      case 'gold': return language === 'ar' ? 'ذهبي' : 'Or';
      case 'silver': return language === 'ar' ? 'فضي' : 'Argent';
      case 'bronze': return language === 'ar' ? 'برونزي' : 'Bronze';
      default: return tier;
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      (client.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (client.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (client.phone || '').includes(searchQuery);
    const matchesTier = filterTier === 'all' || client.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const stats = {
    total: clients.length,
    platinum: clients.filter(c => c.tier === 'platinum').length,
    gold: clients.filter(c => c.tier === 'gold').length,
    silver: clients.filter(c => c.tier === 'silver').length,
    bronze: clients.filter(c => c.tier === 'bronze').length,
    totalSpent: clients.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.clients}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {stats.total} {language === 'ar' ? 'عميل مسجل' : 'clients enregistrés'}
          </p>
        </div>
        <Button
          onClick={() => setShowNewClient(true)}
          className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === 'ar' ? 'عميل جديد' : 'Nouveau Client'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
            <p className="text-xs text-slate-500">{language === 'ar' ? 'الكل' : 'Total'}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{stats.platinum}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{getTierLabel('platinum')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.gold}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">{getTierLabel('gold')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.silver}</p>
            <p className="text-xs text-slate-500">{getTierLabel('silver')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.bronze}</p>
            <p className="text-xs text-orange-600 dark:text-orange-500">{getTierLabel('bronze')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {(stats.totalSpent / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">DZD</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 
            ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white/50 dark:bg-slate-800/50`}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'platinum', 'gold', 'silver', 'bronze'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterTier === tier
                ? 'bg-rose-500 text-white'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-slate-700'
                }`}
            >
              {tier === 'all' ? (language === 'ar' ? 'الكل' : 'Tout') : getTierLabel(tier)}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card
            key={client.id}
            className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
              bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm cursor-pointer
              hover:shadow-xl hover:shadow-rose-200/50 dark:hover:shadow-slate-800/50 transition-all"
            onClick={() => handleSelectClient(client)}
          >
            <CardContent className="p-3 md:p-5">
              <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                    flex items-center justify-center text-white text-lg md:text-xl font-bold relative">
                    {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                    {(client.creditBalance || 0) > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      {client.firstName} {client.lastName}
                    </h3>
                    <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Badge className={`${getTierColor(client.tier)} text-xs`}>
                        {getTierIcon(client.tier)}
                        <span className="ml-1">{getTierLabel(client.tier)}</span>
                      </Badge>
                      {(client.creditBalance || 0) > 0 && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                          {language === 'ar' ? 'دين' : 'Crédit'}: {client.creditBalance.toLocaleString()} DZD
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'تعديل' : 'Modifier'}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'إرسال رسالة' : 'Envoyer Message'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'حذف' : 'Supprimer'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 space-y-2">
                <div className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
                {client.email && (
                  <div className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-rose-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {client.loyaltyPoints}
                  </p>
                  <p className="text-xs text-slate-500">{t.loyaltyPoints}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {(client.totalSpent / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-slate-500">DZD</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {client.visitCount}
                  </p>
                  <p className="text-xs text-slate-500">{language === 'ar' ? 'زيارة' : 'Visites'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                    flex items-center justify-center text-white text-2xl font-bold">
                    {selectedClient.firstName.charAt(0)}{selectedClient.lastName.charAt(0)}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </DialogTitle>
                    <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Badge className={`${getTierColor(selectedClient.tier)}`}>
                        {getTierIcon(selectedClient.tier)}
                        <span className="ml-1">{getTierLabel(selectedClient.tier)}</span>
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {selectedClient.loyaltyPoints} {t.loyaltyPoints}
                      </Badge>
                    </div>
                    <div className={`mt-3 flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-2 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                        onClick={handleAnalyze}
                        disabled={analyzing}
                      >
                        {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {language === 'ar' ? 'تحليل الذكاء الاصطناعي' : 'Analyse IA'}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="info" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">{language === 'ar' ? 'المعلومات' : 'Infos'}</TabsTrigger>
                  <TabsTrigger value="finances">
                    <Wallet className="w-3 h-3 mr-1" />
                    {language === 'ar' ? 'المالية' : 'Finances'}
                  </TabsTrigger>
                  <TabsTrigger value="history">{language === 'ar' ? 'السجل' : 'Historique'}</TabsTrigger>
                  <TabsTrigger value="loyalty">{t.loyaltyPoints}</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  {insights.length > 0 && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/50">
                      <div className={`flex items-center gap-2 mb-3 text-purple-700 dark:text-purple-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Brain className="w-5 h-5" />
                        <h4 className="font-semibold">{language === 'ar' ? 'رؤى الذكاء الاصطناعي' : 'Insights IA'}</h4>
                      </div>
                      <div className="space-y-2">
                        {insights.map((insight, idx) => (
                          <div key={idx} className={`flex gap-3 text-sm p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="mt-1">
                              {insight.type === 'recommendation' ? (
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-700 dark:text-slate-300 font-medium">{insight.message}</p>
                              {insight.action && (
                                <button className="text-xs font-bold text-rose-500 hover:text-rose-600 mt-2 flex items-center gap-1 transition-colors">
                                  {insight.action} {isRTL ? '←' : '→'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className={`flex items-center gap-2 text-slate-500 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</span>
                      </div>
                      <p className="font-medium">{selectedClient.phone}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className={`flex items-center gap-2 text-slate-500 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">Email</span>
                      </div>
                      <p className="font-medium">{selectedClient.email || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className={`flex items-center gap-2 text-slate-500 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{language === 'ar' ? 'تاريخ الميلاد' : 'Date de Naissance'}</span>
                      </div>
                      <p className="font-medium">
                        {selectedClient.birthDate?.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR')}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className={`flex items-center gap-2 text-slate-500 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{language === 'ar' ? 'الموظف المفضل' : 'Employé Préféré'}</span>
                      </div>
                      <p className="font-medium">{selectedClient.preferredStaff || '-'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'إجمالي الإنفاق' : 'Total Dépensé'}
                        </p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                          {selectedClient.totalSpent.toLocaleString()} DZD
                        </p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-emerald-500" />
                    </div>
                  </div>
                </TabsContent>

                {/* Finances Tab */}
                <TabsContent value="finances" className="mt-4 space-y-4">
                  {/* Credit Balance Card */}
                  <div className={`p-4 rounded-xl ${(selectedClient.creditBalance || 0) > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div>
                        <p className={`text-sm ${(selectedClient.creditBalance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {language === 'ar' ? 'الدين الحالي' : 'Crédit Actuel'}
                        </p>
                        <p className={`text-2xl font-bold ${(selectedClient.creditBalance || 0) > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {(selectedClient.creditBalance || 0).toLocaleString()} DZD
                        </p>
                      </div>
                      {(selectedClient.creditBalance || 0) > 0 ? (
                        <AlertCircle className="w-10 h-10 text-red-500" />
                      ) : (
                        <DollarSign className="w-10 h-10 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* Record Payment */}
                  {(selectedClient.creditBalance || 0) > 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-3">
                      <h4 className="font-medium text-sm">
                        {language === 'ar' ? 'تسجيل دفع' : 'Enregistrer un Paiement'}
                      </h4>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={paymentAmount || ''}
                          onChange={(e) => setPaymentAmount(Math.min(Number(e.target.value), selectedClient.creditBalance || 0))}
                          placeholder="0.00"
                          className="flex-1"
                          max={selectedClient.creditBalance || 0}
                        />
                        <Button
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600"
                          onClick={handleRecordPayment}
                          disabled={recordingPayment || paymentAmount <= 0}
                        >
                          {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-slate-500">
                      {language === 'ar' ? 'سجل المعاملات' : 'Historique des Transactions'}
                    </h4>
                    {clientPayments.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        {language === 'ar' ? 'لا توجد معاملات' : 'Aucune transaction'}
                      </p>
                    ) : clientPayments.map(p => (
                      <div key={p.id} className={`flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.type === 'credit' ? 'bg-red-100 dark:bg-red-900/30' :
                            p.type === 'payment' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                              'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                            {p.type === 'credit' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                              p.type === 'payment' ? <DollarSign className="w-4 h-4 text-emerald-500" /> :
                                <History className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {p.type === 'credit' ? (language === 'ar' ? 'كريدي' : 'Crédit') :
                                p.type === 'payment' ? (language === 'ar' ? 'دفع' : 'Paiement') :
                                  (language === 'ar' ? 'شراء' : 'Achat')}
                            </p>
                            <p className="text-xs text-slate-400">{p.description || ''} • {p.createdAt.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR')}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${p.type === 'credit' ? 'text-red-600' :
                          p.type === 'payment' ? 'text-emerald-600' :
                            'text-blue-600'
                          }`}>
                          {p.type === 'payment' ? '-' : '+'}{p.amount.toLocaleString()} DZD
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="space-y-3">
                    {clientPayments.filter(p => p.type === 'purchase').length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">
                        {language === 'ar' ? 'لا توجد مشتريات' : 'Aucun achat'}
                      </p>
                    ) : clientPayments.filter(p => p.type === 'purchase').map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                          <History className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.description || (language === 'ar' ? 'شراء' : 'Achat')}</p>
                          <p className="text-sm text-slate-500">{item.createdAt.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR')}</p>
                        </div>
                        <p className="font-bold text-emerald-600">{item.amount.toLocaleString()} DZD</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="loyalty" className="mt-4">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                      flex items-center justify-center text-white mx-auto mb-4">
                      <Gift className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {selectedClient.loyaltyPoints}
                    </h3>
                    <p className="text-slate-500">{t.loyaltyPoints}</p>

                    {/* Tier Progress */}
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{getTierLabel(selectedClient.tier)}</span>
                        <span>
                          {selectedClient.tier === 'platinum' ? '⭐ Max' :
                            selectedClient.tier === 'gold' ? `${200000 - (selectedClient.totalSpent || 0)} DZD → Platine` :
                              selectedClient.tier === 'silver' ? `${100000 - (selectedClient.totalSpent || 0)} DZD → Or` :
                                `${50000 - (selectedClient.totalSpent || 0)} DZD → Argent`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
                          style={{
                            width: `${Math.min(100,
                              selectedClient.tier === 'platinum' ? 100 :
                                selectedClient.tier === 'gold' ? ((selectedClient.totalSpent || 0) / 200000) * 100 :
                                  selectedClient.tier === 'silver' ? ((selectedClient.totalSpent || 0) / 100000) * 100 :
                                    ((selectedClient.totalSpent || 0) / 50000) * 100
                            )}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        {language === 'ar'
                          ? `إجمالي الإنفاق: ${(selectedClient.totalSpent || 0).toLocaleString()} DZD`
                          : `Total dépensé: ${(selectedClient.totalSpent || 0).toLocaleString()} DZD`}
                      </p>
                    </div>

                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        {language === 'ar'
                          ? 'كل 10 د.ج = 1 نقطة وفاء • الترقية تلقائية'
                          : '10 DZD = 1 point • Montée de niveau automatique'}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Plus className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'عميل جديد' : 'Nouveau Client'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'الاسم' : 'Prénom'}</label>
                <Input
                  placeholder={language === 'ar' ? 'الاسم' : 'Prénom'}
                  value={newClientData.firstName}
                  onChange={(e) => setNewClientData({ ...newClientData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'اللقب' : 'Nom'}</label>
                <Input
                  placeholder={language === 'ar' ? 'اللقب' : 'Nom'}
                  value={newClientData.lastName}
                  onChange={(e) => setNewClientData({ ...newClientData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</label>
              <Input
                placeholder="05XX XXX XXX"
                value={newClientData.phone}
                onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={newClientData.email}
                onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'تاريخ الميلاد' : 'Date de Naissance'}</label>
              <Input
                type="date"
                value={newClientData.birthDate}
                onChange={(e) => setNewClientData({ ...newClientData, birthDate: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewClient(false)}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                onClick={handleCreateClient}
                disabled={creating}
              >
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
