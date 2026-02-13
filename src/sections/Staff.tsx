import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Trash2,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Percent,
  Briefcase,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  User,
  X
} from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Localization, Language, Staff as StaffType } from '@/types';
import { api } from '@/services/api';

interface StaffProps {
  t: Localization;
  language: Language;
}

const specialtyLabels: Record<string, { ar: string; fr: string }> = {
  hair: { ar: 'شعر', fr: 'Cheveux' },
  coloring: { ar: 'صبغة', fr: 'Coloration' },
  keratin: { ar: 'كيراتين', fr: 'Kératine' },
  nails: { ar: 'أظافر', fr: 'Ongles' },
  manicure: { ar: 'مانيكير', fr: 'Manucure' },
  pedicure: { ar: 'باديكير', fr: 'Pédicure' },
  spa: { ar: 'سبا', fr: 'Spa' },
  massage: { ar: 'مساج', fr: 'Massage' },
  facial: { ar: 'عناية بالوجه', fr: 'Soin Visage' },
  makeup: { ar: 'مكياج', fr: 'Maquillage' },
  bridal: { ar: 'عروس', fr: 'Mariée' },
  evening: { ar: 'سهرة', fr: 'Soirée' },
  skincare: { ar: 'بشرة', fr: 'Peau' },
  acne: { ar: 'حب شباب', fr: 'Acné' },
};

const paymentTypeLabels: Record<string, { ar: string; fr: string; color: string }> = {
  salary: { ar: 'راتب', fr: 'Salaire', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  commission: { ar: 'عمولة', fr: 'Commission', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  advance: { ar: 'سلفة', fr: 'Avance', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  bonus: { ar: 'مكافأة', fr: 'Prime', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  deduction: { ar: 'خصم', fr: 'Déduction', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const SPECIALTIES_LIST = ['hair', 'coloring', 'keratin', 'nails', 'manicure', 'pedicure', 'spa', 'massage', 'facial', 'makeup', 'bridal', 'evening', 'skincare', 'acne'];

export default function Staff({ t, language }: StaffProps) {
  const isRTL = language === 'ar';
  const [staffMembers, setStaffMembers] = useState<StaffType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffType | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Detail dialog state
  const [payments, setPayments] = useState<any[]>([]);
  const [balance, setBalance] = useState({ totalDue: 0, totalPaid: 0, balance: 0 });
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ type: 'advance', amount: 0, description: '' });
  const [savingPayment, setSavingPayment] = useState(false);

  // New staff form
  const [newStaffData, setNewStaffData] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    salaryType: 'monthly' as 'monthly' | 'commission',
    baseSalary: 0, commissionRate: 0, specialty: [] as string[]
  });
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    const { data } = await api.staff.getAll();
    if (data) setStaffMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Load payments when staff detail opens
  useEffect(() => {
    if (selectedStaff) {
      setLoadingPayments(true);
      Promise.all([
        api.staff.getPayments(selectedStaff.id),
        api.staff.getBalance(selectedStaff.id)
      ]).then(([paymentsRes, balanceRes]) => {
        if (paymentsRes.data) setPayments(paymentsRes.data);
        setBalance(balanceRes);
      }).finally(() => setLoadingPayments(false));
    }
  }, [selectedStaff]);

  const handleToggleAvailability = async (e: React.MouseEvent, staff: StaffType) => {
    e.stopPropagation();
    const newStatus = !staff.isActive;
    await api.staff.toggleAvailability(staff.id, newStatus);
    setStaffMembers(prev => prev.map(s => s.id === staff.id ? { ...s, isActive: newStatus } : s));
  };

  const handleCreateStaff = async () => {
    if (!newStaffData.firstName || !newStaffData.lastName) return;
    setSaving(true);
    const { error } = await api.staff.create({
      firstName: newStaffData.firstName,
      lastName: newStaffData.lastName,
      phone: newStaffData.phone,
      email: newStaffData.email,
      specialty: newStaffData.specialty,
      salaryType: newStaffData.salaryType,
      baseSalary: newStaffData.salaryType === 'monthly' ? newStaffData.baseSalary : 0,
      commissionRate: newStaffData.salaryType === 'commission' ? newStaffData.commissionRate : 0,
      hireDate: new Date(),
      isActive: true,
      workingHours: {}
    } as any);

    if (!error) {
      await fetchStaff();
      setShowNewStaff(false);
      setNewStaffData({ firstName: '', lastName: '', phone: '', email: '', salaryType: 'monthly', baseSalary: 0, commissionRate: 0, specialty: [] });
    } else {
      alert(language === 'ar' ? 'خطأ: ' + error : 'Erreur: ' + error);
    }
    setSaving(false);
  };

  const handleDeleteStaff = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(language === 'ar' ? 'هل أنت متأكد؟' : 'Êtes-vous sûr ?')) return;
    await api.staff.delete(id);
    await fetchStaff();
  };

  const handleAddPayment = async () => {
    if (!selectedStaff || newPayment.amount <= 0) return;
    setSavingPayment(true);
    await api.staff.addPayment({
      staffId: selectedStaff.id,
      type: newPayment.type,
      amount: newPayment.amount,
      description: newPayment.description
    });
    // Refresh payments
    const [paymentsRes, balanceRes] = await Promise.all([
      api.staff.getPayments(selectedStaff.id),
      api.staff.getBalance(selectedStaff.id)
    ]);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    setBalance(balanceRes);
    setNewPayment({ type: 'advance', amount: 0, description: '' });
    setShowAddPayment(false);
    setSavingPayment(false);
  };

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch =
      staff.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && staff.isActive) ||
      (filterStatus === 'inactive' && !staff.isActive);
    return matchesSearch && matchesStatus;
  });

  const activeStaff = staffMembers.filter(s => s.isActive);
  const totalSalary = activeStaff.filter(s => s.salaryType === 'monthly').reduce((sum, s) => sum + s.baseSalary, 0);
  const commissionStaff = staffMembers.filter(s => s.salaryType === 'commission');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.staff}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {activeStaff.length} {language === 'ar' ? 'موظف نشط' : 'employés actifs'}
          </p>
        </div>
        <Button
          onClick={() => setShowNewStaff(true)}
          className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === 'ar' ? 'موظف جديد' : 'Nouvel Employé'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeStaff.length}</p>
                <p className="text-xs text-slate-500">{language === 'ar' ? 'موظف نشط' : 'Actifs'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{(totalSalary / 1000).toFixed(0)}k</p>
                <p className="text-xs text-slate-500">DZD/{language === 'ar' ? 'شهر' : 'mois'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{commissionStaff.length}</p>
                <p className="text-xs text-slate-500">{language === 'ar' ? 'بالعمولة' : 'Commission'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Percent className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{staffMembers.length}</p>
                <p className="text-xs text-slate-500">{language === 'ar' ? 'إجمالي' : 'Total'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-amber-600" />
              </div>
            </div>
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
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatus === status
                ? 'bg-rose-500 text-white'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-slate-700'
                }`}
            >
              {status === 'all' ? (language === 'ar' ? 'الكل' : 'Tout') :
                status === 'active' ? (language === 'ar' ? 'نشط' : 'Actif') :
                  (language === 'ar' ? 'غير نشط' : 'Inactif')}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => (
          <Card
            key={staff.id}
            className={`border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
              bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm cursor-pointer
              hover:shadow-xl transition-all ${!staff.isActive ? 'opacity-60' : ''}`}
            onClick={() => setSelectedStaff(staff)}
          >
            <CardContent className="p-3 md:p-5">
              <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                    flex items-center justify-center text-white text-lg md:text-xl font-bold">
                    {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      {staff.firstName} {staff.lastName}
                    </h3>
                    <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Badge className={staff.salaryType === 'commission'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}>
                        {staff.salaryType === 'commission'
                          ? (language === 'ar' ? 'عمولة' : 'Commission')
                          : (language === 'ar' ? 'شهري' : 'Mensuel')}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Availability Toggle */}
                  <button
                    onClick={(e) => handleToggleAvailability(e, staff)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title={staff.isActive ? (language === 'ar' ? 'متاح' : 'Disponible') : (language === 'ar' ? 'غير متاح' : 'Indisponible')}
                  >
                    {staff.isActive
                      ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                      : <ToggleLeft className="w-6 h-6 text-slate-400" />
                    }
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-600" onClick={(e) => handleDeleteStaff(e, staff.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'حذف' : 'Supprimer'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {(staff.specialty || []).slice(0, 3).map((spec, i) => (
                      <span key={i} className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded">
                        {language === 'ar' ? specialtyLabels[spec]?.ar : specialtyLabels[spec]?.fr}
                      </span>
                    ))}
                    {(staff.specialty || []).length > 3 && (
                      <span className="text-xs text-slate-500">+{staff.specialty.length - 3}</span>
                    )}
                  </div>
                </div>
                {staff.phone && (
                  <div className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{staff.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-rose-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {staff.salaryType === 'monthly'
                      ? (language === 'ar' ? 'الراتب' : 'Salaire')
                      : (language === 'ar' ? 'العمولة' : 'Commission')}
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {staff.salaryType === 'monthly'
                      ? `${staff.baseSalary.toLocaleString()} DZD`
                      : `${staff.commissionRate}%`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{language === 'ar' ? 'الحالة' : 'Statut'}</p>
                  <p className={`font-semibold ${staff.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {staff.isActive
                      ? (language === 'ar' ? 'متاح' : 'Disponible')
                      : (language === 'ar' ? 'غير متاح' : 'Indisponible')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ========== Staff Detail Dialog ========== */}
      <Dialog open={!!selectedStaff} onOpenChange={() => { setSelectedStaff(null); setShowAddPayment(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedStaff && (
            <>
              <DialogHeader>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 
                    flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {selectedStaff.firstName.charAt(0)}{selectedStaff.lastName.charAt(0)}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedStaff.firstName} {selectedStaff.lastName}
                    </DialogTitle>
                    <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Badge className={selectedStaff.isActive
                        ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {selectedStaff.isActive
                          ? (language === 'ar' ? 'متاح' : 'Disponible')
                          : (language === 'ar' ? 'غير متاح' : 'Indisponible')}
                      </Badge>
                      <Badge className={selectedStaff.salaryType === 'commission'
                        ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                        {selectedStaff.salaryType === 'commission'
                          ? (language === 'ar' ? 'عمولة' : 'Commission')
                          : (language === 'ar' ? 'شهري' : 'Mensuel')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="finances" className="mt-4 flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="finances">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {language === 'ar' ? 'المستحقات' : 'Finances'}
                  </TabsTrigger>
                  <TabsTrigger value="info">
                    <User className="w-4 h-4 mr-1" />
                    {language === 'ar' ? 'المعلومات' : 'Infos'}
                  </TabsTrigger>
                </TabsList>

                {/* ---- Finances Tab ---- */}
                <TabsContent value="finances" className="flex-1 overflow-auto space-y-4 mt-4">
                  {loadingPayments ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    </div>
                  ) : (
                    <>
                      {/* Balance Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                          <ArrowUpCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{balance.totalDue.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">{language === 'ar' ? 'المستحقات' : 'Dus'}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                          <ArrowDownCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{balance.totalPaid.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">{language === 'ar' ? 'المدفوع' : 'Payé'}</p>
                        </div>
                        <div className={`p-3 rounded-xl text-center ${balance.balance > 0
                          ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                          <CreditCard className={`w-5 h-5 mx-auto mb-1 ${balance.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                          <p className={`text-lg font-bold ${balance.balance > 0
                            ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {balance.balance.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">{language === 'ar' ? 'الرصيد' : 'Solde'}</p>
                        </div>
                      </div>

                      {/* Payment History */}
                      <div>
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2">
                          {language === 'ar' ? 'سجل المعاملات' : 'Historique'}
                        </h4>
                        <ScrollArea className="h-48">
                          {payments.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">
                              {language === 'ar' ? 'لا توجد معاملات' : 'Aucune transaction'}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {payments.map((p) => (
                                <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Badge className={paymentTypeLabels[p.type]?.color || 'bg-slate-100'}>
                                      {language === 'ar' ? paymentTypeLabels[p.type]?.ar : paymentTypeLabels[p.type]?.fr}
                                    </Badge>
                                    {p.description && (
                                      <span className="text-xs text-slate-500 truncate max-w-[120px]">{p.description}</span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-sm font-semibold ${p.type === 'advance' || p.type === 'deduction' ? 'text-red-600' : 'text-emerald-600'
                                      }`}>
                                      {p.type === 'advance' || p.type === 'deduction' ? '-' : '+'}{p.amount.toLocaleString()} DZD
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {new Date(p.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Add Payment Inline Form */}
                      {showAddPayment ? (
                        <div className="p-3 border border-rose-200 dark:border-slate-600 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{language === 'ar' ? 'تسجيل دفعة' : 'Enregistrer Paiement'}</h4>
                            <button onClick={() => setShowAddPayment(false)}>
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={newPayment.type}
                              onChange={(e) => setNewPayment(p => ({ ...p, type: e.target.value }))}
                              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm"
                            >
                              <option value="advance">{language === 'ar' ? 'سلفة' : 'Avance'}</option>
                              <option value="salary">{language === 'ar' ? 'راتب' : 'Salaire'}</option>
                              <option value="bonus">{language === 'ar' ? 'مكافأة' : 'Prime'}</option>
                              <option value="deduction">{language === 'ar' ? 'خصم' : 'Déduction'}</option>
                            </select>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={newPayment.amount || ''}
                              onChange={(e) => setNewPayment(p => ({ ...p, amount: Number(e.target.value) }))}
                            />
                          </div>
                          <Input
                            placeholder={language === 'ar' ? 'وصف (اختياري)' : 'Description (optionnel)'}
                            value={newPayment.description}
                            onChange={(e) => setNewPayment(p => ({ ...p, description: e.target.value }))}
                          />
                          <Button
                            onClick={handleAddPayment}
                            disabled={savingPayment || newPayment.amount <= 0}
                            className="w-full bg-gradient-to-r from-rose-500 to-pink-500"
                          >
                            {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'ar' ? 'تأكيد' : 'Confirmer')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowAddPayment(true)}
                          className="w-full bg-gradient-to-r from-rose-500 to-pink-500"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'تسجيل دفعة جديدة' : 'Enregistrer un Paiement'}
                        </Button>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* ---- Info Tab ---- */}
                <TabsContent value="info" className="flex-1 overflow-auto space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className={`flex items-center gap-2 text-slate-500 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Phone className="w-4 h-4" />
                        <span className="text-xs">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</span>
                      </div>
                      <p className="font-medium text-sm">{selectedStaff.phone || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className={`flex items-center gap-2 text-slate-500 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Mail className="w-4 h-4" />
                        <span className="text-xs">Email</span>
                      </div>
                      <p className="font-medium text-sm truncate">{selectedStaff.email || '-'}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className={`flex items-center gap-2 text-slate-500 mb-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">{language === 'ar' ? 'تاريخ التوظيف' : 'Date d\'embauche'}</span>
                    </div>
                    <p className="font-medium text-sm">
                      {selectedStaff.hireDate instanceof Date
                        ? selectedStaff.hireDate.toLocaleDateString()
                        : new Date(selectedStaff.hireDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-2">{language === 'ar' ? 'التخصصات' : 'Spécialités'}</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedStaff.specialty || []).map((spec, i) => (
                        <Badge key={i} variant="secondary">
                          {language === 'ar' ? specialtyLabels[spec]?.ar : specialtyLabels[spec]?.fr}
                        </Badge>
                      ))}
                      {(selectedStaff.specialty || []).length === 0 && (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedStaff.salaryType === 'monthly' ? (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'الراتب الشهري' : 'Salaire Mensuel'}
                        </p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          {selectedStaff.baseSalary.toLocaleString()} DZD
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {language === 'ar' ? 'نسبة العمولة' : 'Taux de Commission'}
                        </p>
                        <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                          {selectedStaff.commissionRate}%
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <p className="text-xs text-slate-500">
                        {language === 'ar' ? 'نوع الأجر' : 'Type de Salaire'}
                      </p>
                      <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                        {selectedStaff.salaryType === 'monthly'
                          ? (language === 'ar' ? 'شهري' : 'Mensuel')
                          : (language === 'ar' ? 'عمولة' : 'Commission')}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== New Staff Dialog ========== */}
      <Dialog open={showNewStaff} onOpenChange={setShowNewStaff}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Plus className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'موظف جديد' : 'Nouvel Employé'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'الاسم' : 'Prénom'}</label>
                <Input
                  value={newStaffData.firstName}
                  onChange={(e) => setNewStaffData(d => ({ ...d, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'اللقب' : 'Nom'}</label>
                <Input
                  value={newStaffData.lastName}
                  onChange={(e) => setNewStaffData(d => ({ ...d, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</label>
              <Input
                value={newStaffData.phone}
                onChange={(e) => setNewStaffData(d => ({ ...d, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newStaffData.email}
                onChange={(e) => setNewStaffData(d => ({ ...d, email: e.target.value }))}
              />
            </div>

            {/* Salary Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'نوع الأجر' : 'Type de Salaire'}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewStaffData(d => ({ ...d, salaryType: 'monthly' }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${newStaffData.salaryType === 'monthly'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-600'
                    }`}
                >
                  <DollarSign className={`w-5 h-5 mx-auto mb-1 ${newStaffData.salaryType === 'monthly' ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">{language === 'ar' ? 'راتب شهري' : 'Mensuel'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewStaffData(d => ({ ...d, salaryType: 'commission' }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${newStaffData.salaryType === 'commission'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-200 dark:border-slate-600'
                    }`}
                >
                  <Percent className={`w-5 h-5 mx-auto mb-1 ${newStaffData.salaryType === 'commission' ? 'text-purple-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">{language === 'ar' ? 'نسبة عمولة' : 'Commission'}</span>
                </button>
              </div>
            </div>

            {/* Conditional Salary / Commission Fields */}
            {newStaffData.salaryType === 'monthly' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'الراتب الشهري (DZD)' : 'Salaire Mensuel (DZD)'}</label>
                <Input
                  type="number"
                  value={newStaffData.baseSalary || ''}
                  onChange={(e) => setNewStaffData(d => ({ ...d, baseSalary: Number(e.target.value) }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'نسبة العمولة (%)' : 'Taux de Commission (%)'}</label>
                <Input
                  type="number"
                  value={newStaffData.commissionRate || ''}
                  onChange={(e) => setNewStaffData(d => ({ ...d, commissionRate: Number(e.target.value) }))}
                />
              </div>
            )}

            {/* Specialties */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'التخصصات' : 'Spécialités'}</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES_LIST.map(spec => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => {
                      setNewStaffData(d => ({
                        ...d,
                        specialty: d.specialty.includes(spec)
                          ? d.specialty.filter(s => s !== spec)
                          : [...d.specialty, spec]
                      }));
                    }}
                    className={`text-xs px-2 py-1 rounded-full transition-all ${newStaffData.specialty.includes(spec)
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    {language === 'ar' ? specialtyLabels[spec]?.ar : specialtyLabels[spec]?.fr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewStaff(false)}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                onClick={handleCreateStaff}
                disabled={saving || !newStaffData.firstName || !newStaffData.lastName}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
