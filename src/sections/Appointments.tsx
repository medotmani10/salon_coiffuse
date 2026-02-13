import { useState, useEffect } from 'react';
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Scissors,
  Loader2,
  Edit,
  Trash2,
  Ban
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Localization, Language, Appointment, AppointmentStatus, Client, Staff, Service } from '@/types';
import { api } from '@/services/api';

interface AppointmentsProps {
  t: Localization;
  language: Language;
}

const STAFF_COLORS = ['#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

type WorkingHours = Record<string, { open: string; close: string; isOpen: boolean }>;

// Map JS getDay() (0=Sun) to our day keys
const DAY_INDEX_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function generateTimeSlots(open: string, close: string): string[] {
  const slots: string[] = [];
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  let h = openH, m = openM;
  while (h < closeH || (h === closeH && m < closeM)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

function isTimeInRange(time: string, open: string, close: string): boolean {
  return time >= open && time < close;
}

export default function Appointments({ t, language }: AppointmentsProps) {
  const isRTL = language === 'ar';
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffMembers, setStaffMembers] = useState<(Staff & { color: string, name: string })[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  // Working hours
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});

  // Edit state
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Delete confirm  
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const [newAppointmentData, setNewAppointmentData] = useState({
    clientId: '',
    staffId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    notes: ''
  });

  const [editData, setEditData] = useState({
    clientId: '',
    staffId: '',
    serviceId: '',
    date: '',
    startTime: '',
    notes: ''
  });

  // Get day key from a date
  const getDayKey = (date: Date) => DAY_INDEX_MAP[date.getDay()];

  // Compute dynamic time slots
  const selectedDayKey = getDayKey(selectedDate);
  const currentDayInfo = workingHours[selectedDayKey];
  const timeSlots = currentDayInfo?.isOpen
    ? generateTimeSlots(currentDayInfo.open, currentDayInfo.close)
    : [];

  // Fetch appointments for selected date
  const fetchAppointments = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data, error: fetchError } = await api.appointments.getByDate(dateStr);
    if (data) setAppointments(data);
    if (fetchError) setError(fetchError);
  };

  // Load static data + working hours
  useEffect(() => {
    const fetchStaticData = async () => {
      setLoading(true);
      try {
        const [clientRes, staffRes, serviceRes, hoursRes] = await Promise.all([
          api.clients.getAll(),
          api.staff.getAll(),
          api.services.getAll(),
          api.settings.get('working_hours')
        ]);

        if (clientRes.data) setClients(clientRes.data);
        if (serviceRes.data) setServices(serviceRes.data);
        if (hoursRes.data) setWorkingHours(hoursRes.data);

        if (staffRes.data) {
          const staffWithMeta = staffRes.data.map((s, i) => ({
            ...s,
            name: `${s.firstName} ${s.lastName}`,
            color: STAFF_COLORS[i % STAFF_COLORS.length]
          }));
          setStaffMembers(staffWithMeta);
          setNewAppointmentData(prev => ({ ...prev, staffId: staffWithMeta[0]?.id || '' }));
        }
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaticData();
  }, []);

  // Fetch appointments when date changes
  useEffect(() => {
    if (!loading) fetchAppointments();
  }, [selectedDate, workingHours, loading]);

  // Validate time is within working hours
  const validateWorkingHours = (date: string, startTime: string, endTime: string): string | null => {
    const d = new Date(date);
    const key = DAY_INDEX_MAP[d.getDay()];
    const hours = workingHours[key];

    if (!hours || !hours.isOpen) {
      return language === 'ar' ? 'المحل مغلق في هذا اليوم' : 'Le salon est fermé ce jour-là';
    }
    if (!isTimeInRange(startTime, hours.open, hours.close)) {
      return language === 'ar'
        ? `الوقت خارج ساعات العمل (${hours.open} - ${hours.close})`
        : `Heure en dehors des heures d'ouverture (${hours.open} - ${hours.close})`;
    }
    if (endTime > hours.close) {
      return language === 'ar'
        ? `الموعد يتجاوز وقت الإغلاق (${hours.close})`
        : `Le rendez-vous dépasse l'heure de fermeture (${hours.close})`;
    }
    return null;
  };

  // CREATE
  const handleCreateAppointment = async () => {
    if (!newAppointmentData.clientId || !newAppointmentData.date || !newAppointmentData.startTime || !newAppointmentData.serviceId) return;
    setOverlapError(null);
    setCreating(true);
    try {
      const selectedService = services.find(s => s.id === newAppointmentData.serviceId);
      const price = selectedService?.price || 0;
      const duration = selectedService?.duration || 60;

      const startDate = new Date(`2000-01-01T${newAppointmentData.startTime}`);
      const endDate = new Date(startDate.getTime() + duration * 60000);
      const endTime = endDate.toTimeString().slice(0, 5);

      // Validate working hours
      const hoursError = validateWorkingHours(newAppointmentData.date, newAppointmentData.startTime, endTime);
      if (hoursError) {
        setOverlapError(hoursError);
        setCreating(false);
        return;
      }

      // Check availability
      if (newAppointmentData.staffId) {
        const isAvailable = await api.appointments.checkAvailability(
          newAppointmentData.staffId,
          newAppointmentData.date,
          newAppointmentData.startTime,
          endTime
        );
        if (!isAvailable) {
          setOverlapError(language === 'ar' ? 'الموظف مشغول في هذا الوقت! يوجد تداخل مع موعد آخر.' : 'Ce créneau est déjà occupé ! Conflit avec un autre rendez-vous.');
          setCreating(false);
          return;
        }
      }

      const { data, error: createErr } = await api.appointments.create({
        clientId: newAppointmentData.clientId,
        staffId: newAppointmentData.staffId || undefined,
        date: newAppointmentData.date,
        startTime: newAppointmentData.startTime,
        endTime: endTime,
        status: 'confirmed',
        notes: newAppointmentData.notes,
        totalAmount: price,
        services: selectedService ? [{
          serviceId: selectedService.id,
          nameAr: selectedService.nameAr,
          nameFr: selectedService.nameFr,
          price: price,
          duration: duration
        }] : []
      } as any);

      if (createErr) {
        setOverlapError(createErr);
      }

      if (data) {
        await fetchAppointments();
        setShowNewAppointment(false);
        setOverlapError(null);
        setNewAppointmentData({
          clientId: '',
          staffId: staffMembers[0]?.id || '',
          serviceId: '',
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Failed to create', err);
    } finally {
      setCreating(false);
    }
  };

  // CANCEL
  const handleCancelAppointment = async (id: string) => {
    const { error: cancelErr } = await api.appointments.updateStatus(id, 'cancelled');
    if (!cancelErr) await fetchAppointments();
  };

  // COMPLETE
  const handleCompleteAppointment = async (id: string) => {
    const { error: completeErr } = await api.appointments.updateStatus(id, 'completed');
    if (!completeErr) await fetchAppointments();
  };

  // DELETE
  const handleDeleteAppointment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: delErr } = await api.appointments.delete(deleteTarget.id);
    if (!delErr) {
      await fetchAppointments();
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  // EDIT - Open dialog  
  const openEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    const serviceId = appointment.services?.[0]?.serviceId || '';
    setEditData({
      clientId: appointment.clientId,
      staffId: appointment.staffId,
      serviceId: serviceId,
      date: typeof appointment.date === 'string' ? appointment.date : new Date(appointment.date).toISOString().split('T')[0],
      startTime: appointment.startTime,
      notes: appointment.notes || ''
    });
    setOverlapError(null);
    setShowEditDialog(true);
  };

  // EDIT - Save
  const handleSaveEdit = async () => {
    if (!editingAppointment) return;
    setOverlapError(null);
    setCreating(true);

    try {
      const selectedService = services.find(s => s.id === editData.serviceId);
      const duration = selectedService?.duration || 60;
      const price = selectedService?.price || 0;

      const startDate = new Date(`2000-01-01T${editData.startTime}`);
      const endDate = new Date(startDate.getTime() + duration * 60000);
      const endTime = endDate.toTimeString().slice(0, 5);

      // Validate working hours
      const hoursError = validateWorkingHours(editData.date, editData.startTime, endTime);
      if (hoursError) {
        setOverlapError(hoursError);
        setCreating(false);
        return;
      }

      // Check availability (exclude current appointment)
      if (editData.staffId) {
        const isAvailable = await api.appointments.checkAvailability(
          editData.staffId,
          editData.date,
          editData.startTime,
          endTime,
          editingAppointment.id
        );
        if (!isAvailable) {
          setOverlapError(language === 'ar' ? 'الموظف مشغول في هذا الوقت!' : 'Ce créneau est déjà occupé !');
          setCreating(false);
          return;
        }
      }

      await api.appointments.update(editingAppointment.id, {
        clientId: editData.clientId,
        staffId: editData.staffId,
        date: editData.date as any,
        startTime: editData.startTime,
        endTime: endTime,
        totalAmount: price,
        notes: editData.notes
      });

      await fetchAppointments();
      setShowEditDialog(false);
      setEditingAppointment(null);
      setOverlapError(null);
    } catch (err) {
      console.error('Failed to update', err);
    } finally {
      setCreating(false);
    }
  };

  // Status helpers
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in-progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'no-show': return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'no-show': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return t.confirmed;
      case 'in-progress': return language === 'ar' ? 'قيد التنفيذ' : 'En Cours';
      case 'completed': return language === 'ar' ? 'مكتمل' : 'Terminé';
      case 'cancelled': return language === 'ar' ? 'ملغى' : 'Annulé';
      case 'no-show': return language === 'ar' ? 'لم يحضر' : 'Non Présent';
      default: return status;
    }
  };

  // Filter + search
  const filteredAppointments = appointments
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.clientName.toLowerCase().includes(q) ||
        a.services?.some(s => s.nameFr.toLowerCase().includes(q) || s.nameAr.toLowerCase().includes(q))
      );
    });

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
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
        <p>Error loading appointments: {error}</p>
      </div>
    );
  }

  // Shared form content for create/edit
  const renderAppointmentForm = (
    data: typeof newAppointmentData,
    setData: (d: typeof newAppointmentData) => void,
    onSubmit: () => void,
    isEdit: boolean
  ) => (
    <div className="space-y-4 py-4">
      {overlapError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {overlapError}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'ar' ? 'العميل' : 'Client'}</label>
        <div className="relative">
          <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <select
            className={`w-full h-10 rounded-md border border-input bg-background px-3 ${isRTL ? 'pr-10' : 'pl-10'}`}
            value={data.clientId}
            onChange={(e) => setData({ ...data, clientId: e.target.value })}
          >
            <option value="">{language === 'ar' ? 'اختر عميل...' : 'Sélectionner un client...'}</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'ar' ? 'الخدمة' : 'Service'}</label>
        <div className="relative">
          <Scissors className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <select
            className={`w-full h-10 rounded-md border border-input bg-background px-3 ${isRTL ? 'pr-10' : 'pl-10'}`}
            value={data.serviceId}
            onChange={(e) => setData({ ...data, serviceId: e.target.value })}
          >
            <option value="">{language === 'ar' ? 'اختر خدمة...' : 'Sélectionner un service...'}</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {language === 'ar' ? service.nameAr : service.nameFr} ({service.duration}min - {service.price} DZD)
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
          <Input
            type="date"
            value={data.date}
            onChange={(e) => setData({ ...data, date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{language === 'ar' ? 'الوقت' : 'Heure'}</label>
          <Input
            type="time"
            value={data.startTime}
            onChange={(e) => setData({ ...data, startTime: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'ar' ? 'الموظف' : 'Personnel'}</label>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3"
          value={data.staffId}
          onChange={(e) => setData({ ...data, staffId: e.target.value })}
        >
          {staffMembers.map(staff => (
            <option key={staff.id} value={staff.id}>{staff.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{language === 'ar' ? 'ملاحظات' : 'Notes'}</label>
        <Input
          placeholder={language === 'ar' ? 'ملاحظات اختيارية...' : 'Notes optionnelles...'}
          value={data.notes}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={() => {
          setShowNewAppointment(false);
          setShowEditDialog(false);
          setOverlapError(null);
        }}>
          {t.cancel}
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
          onClick={onSubmit}
          disabled={creating}
        >
          {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? (language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer') : t.confirm}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.appointments}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {selectedDate.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          {/* Date Navigation */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-xl">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-4 py-2 text-sm font-medium hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {language === 'ar' ? 'اليوم' : 'Aujourd\'hui'}
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* New Appointment Button */}
          <Button
            onClick={() => {
              setOverlapError(null);
              setNewAppointmentData(prev => ({
                ...prev,
                date: selectedDate.toISOString().split('T')[0]
              }));
              setShowNewAppointment(true);
            }}
            className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 w-full sm:w-auto"
            disabled={!currentDayInfo?.isOpen}
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'موعد جديد' : 'Nouveau RDV'}
          </Button>
        </div>
      </div>

      {/* Closed Day Warning */}
      {!currentDayInfo?.isOpen && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center gap-3">
          <Ban className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{language === 'ar' ? 'المحل مغلق في هذا اليوم' : 'Le salon est fermé ce jour'}</p>
            <p className="text-sm opacity-80">{language === 'ar' ? 'لا يمكن حجز مواعيد في أيام الإغلاق' : 'Impossible de prendre des rendez-vous les jours de fermeture'}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`flex flex-col md:flex-row items-start md:items-center gap-3 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className="relative w-full md:flex-1 md:max-w-sm">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 
            ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white/50 dark:bg-slate-800/50 w-full`}
          />
        </div>
        <div className="flex gap-2 w-full overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {(['all', 'confirmed', 'in-progress', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${filterStatus === status
                ? 'bg-rose-500 text-white'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-slate-700'
                }`}
            >
              {status === 'all'
                ? (language === 'ar' ? 'الكل' : 'Tout')
                : getStatusLabel(status as AppointmentStatus)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {currentDayInfo?.isOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Staff Column */}
          <Card className="lg:col-span-1 border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {language === 'ar' ? 'الموظفون' : 'Personnel'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: staff.color }}
                  >
                    {staff.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{staff.name}</p>
                    <p className="text-xs text-slate-500">
                      {appointments.filter(a => a.staffId === staff.id && a.status !== 'cancelled').length} {language === 'ar' ? 'مواعيد' : 'RDVs'}
                    </p>
                  </div>
                </div>
              ))}

              {/* Working Hours Info */}
              {currentDayInfo && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {language === 'ar' ? 'ساعات العمل' : 'Heures d\'ouverture'}
                  </p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300 mt-1">
                    {currentDayInfo.open} → {currentDayInfo.close}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Grid */}
          <Card className="lg:col-span-3 border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Time Header */}
                  <div className={`flex border-b border-rose-100 dark:border-slate-700 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-20 flex-shrink-0 p-3 text-xs font-medium text-slate-500 text-center">
                      {language === 'ar' ? 'الوقت' : 'Heure'}
                    </div>
                    {staffMembers.map((staff) => (
                      <div key={staff.id} className="flex-1 p-3 text-sm font-medium text-center border-l border-rose-100 dark:border-slate-700">
                        {staff.name}
                      </div>
                    ))}
                  </div>

                  {/* Time Slots */}
                  <div className="relative">
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className={`flex border-b border-rose-50 dark:border-slate-700/50 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                        style={{ height: '60px' }}
                      >
                        <div className="w-20 flex-shrink-0 p-2 text-xs text-slate-400 text-center border-l border-rose-100 dark:border-slate-700">
                          {time}
                        </div>
                        {staffMembers.map((staff) => (
                          <div
                            key={`${staff.id}-${time}`}
                            className="flex-1 border-l border-rose-50 dark:border-slate-700/50 relative hover:bg-rose-50/30 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            {filteredAppointments
                              .filter(a => a.staffId === staff.id && a.startTime === time)
                              .map((appointment) => (
                                <div
                                  key={appointment.id}
                                  className={`absolute inset-x-1 rounded-lg p-2 text-xs cursor-pointer
                                    hover:shadow-md transition-shadow ${getStatusColor(appointment.status)}`}
                                  style={{
                                    top: '2px',
                                    height: `${(parseInt(appointment.endTime.split(':')[0]) - parseInt(appointment.startTime.split(':')[0])) * 60 +
                                      (parseInt(appointment.endTime.split(':')[1]) - parseInt(appointment.startTime.split(':')[1]))}px`,
                                    zIndex: 10
                                  }}
                                  onClick={() => openEditDialog(appointment)}
                                >
                                  <div className={`flex items-center gap-1 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {getStatusIcon(appointment.status)}
                                    <span className="font-medium truncate">{appointment.clientName}</span>
                                  </div>
                                  <p className="opacity-80 truncate">
                                    {language === 'ar'
                                      ? (appointment.services?.[0]?.nameAr || 'خدمة عامة')
                                      : (appointment.services?.[0]?.nameFr || 'Service général')}
                                  </p>
                                  <p className="font-semibold mt-1">
                                    {appointment.totalAmount.toLocaleString()} DZD
                                  </p>
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Appointments List */}
      <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
        bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{language === 'ar' ? 'مواعيد اليوم' : 'Rendez-vous du Jour'}</span>
            <Badge variant="secondary">{filteredAppointments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{language === 'ar' ? 'لا توجد مواعيد' : 'Aucun rendez-vous'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 
                    hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-16 text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{appointment.startTime}</p>
                    <p className="text-xs text-slate-500">{appointment.endTime}</p>
                  </div>
                  <div className="w-px h-12 bg-rose-200 dark:bg-slate-600" />
                  <div className="flex-1">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{appointment.clientName}</span>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 text-sm text-slate-500 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Scissors className="w-4 h-4" />
                      <span>
                        {language === 'ar'
                          ? (appointment.services?.[0]?.nameAr || 'خدمة عامة')
                          : (appointment.services?.[0]?.nameFr || 'Service général')}
                      </span>
                      <span className="text-rose-500">•</span>
                      <span>{appointment.totalAmount.toLocaleString()} DZD</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusLabel(appointment.status)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(appointment)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'تعديل' : 'Modifier'}
                        </DropdownMenuItem>
                        {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => handleCompleteAppointment(appointment.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {language === 'ar' ? 'مكتمل' : 'Terminé'}
                          </DropdownMenuItem>
                        )}
                        {appointment.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => handleCancelAppointment(appointment.id)}>
                            <Ban className="w-4 h-4 mr-2" />
                            {language === 'ar' ? 'إلغاء' : 'Annuler'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setDeleteTarget(appointment);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'حذف' : 'Supprimer'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={(open) => { setShowNewAppointment(open); if (!open) setOverlapError(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Plus className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'موعد جديد' : 'Nouveau Rendez-vous'}
            </DialogTitle>
          </DialogHeader>
          {renderAppointmentForm(newAppointmentData, setNewAppointmentData, handleCreateAppointment, false)}
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setOverlapError(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Edit className="w-5 h-5 text-blue-500" />
              {language === 'ar' ? 'تعديل الموعد' : 'Modifier le Rendez-vous'}
            </DialogTitle>
          </DialogHeader>
          {renderAppointmentForm(editData, setEditData, handleSaveEdit, true)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-red-600 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Trash2 className="w-5 h-5" />
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirmer la Suppression'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 dark:text-slate-400">
              {language === 'ar'
                ? `هل أنت متأكد من حذف موعد ${deleteTarget?.clientName}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Êtes-vous sûr de vouloir supprimer le rendez-vous de ${deleteTarget?.clientName} ? Cette action est irréversible.`}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAppointment}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'حذف' : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
