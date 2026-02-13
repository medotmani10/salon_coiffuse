import { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  DollarSign,
  Scissors,
  Palette,
  Hand,
  Droplets,
  Sun,
  Check,
  Loader2
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
import type { Localization, Language, Service, ServiceCategory } from '@/types';
import { api } from '@/services/api';

interface ServicesProps {
  t: Localization;
  language: Language;
}

const categoryIcons: Record<ServiceCategory, React.ElementType> = {
  hair: Scissors,
  nails: Hand,
  spa: Droplets,
  skincare: Sun,
  makeup: Palette,
  massage: Sparkles,
};

const categoryColors: Record<ServiceCategory, string> = {
  hair: 'from-rose-400 to-pink-500',
  nails: 'from-purple-400 to-violet-500',
  spa: 'from-cyan-400 to-blue-500',
  skincare: 'from-emerald-400 to-green-500',
  makeup: 'from-amber-400 to-orange-500',
  massage: 'from-teal-400 to-cyan-500',
};

const categoryLabels: Record<ServiceCategory, { ar: string; fr: string }> = {
  hair: { ar: 'الشعر', fr: 'Cheveux' },
  nails: { ar: 'الأظافر', fr: 'Ongles' },
  spa: { ar: 'السبا', fr: 'Spa' },
  skincare: { ar: 'العناية بالبشرة', fr: 'Soin de la Peau' },
  makeup: { ar: 'المكياج', fr: 'Maquillage' },
  massage: { ar: 'المساج', fr: 'Massage' },
};

export default function Services({ t, language }: ServicesProps) {
  const isRTL = language === 'ar';
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [showNewService, setShowNewService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [newServiceData, setNewServiceData] = useState({
    nameAr: '',
    nameFr: '',
    category: 'hair' as ServiceCategory,
    price: '',
    duration: '',
    descriptionAr: '',
    descriptionFr: '',
    color: '#f43f5e'
  });

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const { data, error } = await api.services.getAll();
      if (data) setServices(data);
      if (error) console.error(error);
      setLoading(false);
    };
    fetchServices();
  }, []);

  const handleCreateService = async () => {
    if (!newServiceData.nameAr || !newServiceData.nameFr || !newServiceData.price || !newServiceData.duration) return;

    setCreating(true);
    try {
      const { data } = await api.services.create({
        nameAr: newServiceData.nameAr,
        nameFr: newServiceData.nameFr,
        category: newServiceData.category,
        price: parseFloat(newServiceData.price),
        duration: parseInt(newServiceData.duration),
        descriptionAr: newServiceData.descriptionAr,
        descriptionFr: newServiceData.descriptionFr,
        color: categoryColors[newServiceData.category].split(' ')[1].replace('to-', '#') // Hacky color derived or just generic
      });

      if (data) {
        setServices(prev => [data, ...prev]);
        setShowNewService(false);
        setNewServiceData({
          nameAr: '',
          nameFr: '',
          category: 'hair',
          price: '',
          duration: '',
          descriptionAr: '',
          descriptionFr: '',
          color: '#f43f5e'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = language === 'ar'
      ? service.nameAr.toLowerCase().includes(searchQuery.toLowerCase())
      : service.nameFr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<ServiceCategory, Service[]>);

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
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.services}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {services.length} {language === 'ar' ? 'خدمة متاحة' : 'services disponibles'}
          </p>
        </div>
        <Button
          onClick={() => setShowNewService(true)}
          className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === 'ar' ? 'خدمة جديدة' : 'Nouveau Service'}
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`p-4 rounded-xl transition-all ${selectedCategory === 'all'
            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
            : 'bg-white/80 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-slate-700'
            }`}
        >
          <Sparkles className={`w-6 h-6 mb-2 ${selectedCategory === 'all' ? 'text-white' : 'text-rose-500'}`} />
          <p className={`font-medium text-sm ${selectedCategory === 'all' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
            {language === 'ar' ? 'الكل' : 'Tout'}
          </p>
          <p className={`text-xs ${selectedCategory === 'all' ? 'text-white/80' : 'text-slate-500'}`}>
            {services.length} {language === 'ar' ? 'خدمة' : 'services'}
          </p>
        </button>

        {(Object.keys(categoryLabels) as ServiceCategory[]).map((category) => {
          const Icon = categoryIcons[category];
          const count = servicesByCategory[category]?.length || 0;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`p-4 rounded-xl transition-all ${selectedCategory === category
                ? `bg-gradient-to-r ${categoryColors[category]} text-white shadow-lg`
                : 'bg-white/80 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-slate-700'
                }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${selectedCategory === category ? 'text-white' : 'text-slate-500'}`} />
              <p className={`font-medium text-sm ${selectedCategory === category ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {language === 'ar' ? categoryLabels[category].ar : categoryLabels[category].fr}
              </p>
              <p className={`text-xs ${selectedCategory === category ? 'text-white/80' : 'text-slate-500'}`}>
                {count} {language === 'ar' ? 'خدمة' : 'services'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400
          ${isRTL ? 'right-3' : 'left-3'}`} />
        <Input
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white/50 dark:bg-slate-800/50`}
        />
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredServices.map((service) => {
          const Icon = categoryIcons[service.category];
          return (
            <Card
              key={service.id}
              className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50
                bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden group"
            >
              <div
                className="h-2"
                style={{ backgroundColor: service.color }}
              />
              <CardContent className="p-3 md:p-5">
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${service.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: service.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {language === 'ar' ? service.nameAr : service.nameFr}
                      </h3>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {language === 'ar' ? categoryLabels[service.category].ar : categoryLabels[service.category].fr}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingService(service)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'تعديل' : 'Modifier'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'حذف' : 'Supprimer'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                  {language === 'ar' ? service.descriptionAr : service.descriptionFr}
                </p>

                <div className={`flex items-center justify-between mt-4 pt-4 border-t border-rose-100 dark:border-slate-700 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex items-center gap-1 text-slate-600 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{service.duration} {language === 'ar' ? 'دقيقة' : 'min'}</span>
                  </div>
                  <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {service.price.toLocaleString()} DZD
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New/Edit Service Dialog */}
      <Dialog open={showNewService || !!editingService} onOpenChange={() => { setShowNewService(false); setEditingService(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Sparkles className="w-5 h-5 text-rose-500" />
              {editingService
                ? (language === 'ar' ? 'تعديل الخدمة' : 'Modifier le Service')
                : (language === 'ar' ? 'خدمة جديدة' : 'Nouveau Service')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'الاسم (عربي)' : 'Nom (Arabe)'}</label>
                <Input placeholder={language === 'ar' ? 'اسم الخدمة' : 'Nom du service'}
                  value={newServiceData.nameAr}
                  onChange={(e) => setNewServiceData({ ...newServiceData, nameAr: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'الاسم (فرنسي)' : 'Nom (Français)'}</label>
                <Input placeholder={language === 'ar' ? 'Nom du service' : 'Nom du service'}
                  value={newServiceData.nameFr}
                  onChange={(e) => setNewServiceData({ ...newServiceData, nameFr: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الفئة' : 'Catégorie'}</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={newServiceData.category}
                onChange={(e) => setNewServiceData({ ...newServiceData, category: e.target.value as ServiceCategory })}
              >
                {(Object.keys(categoryLabels) as ServiceCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {language === 'ar' ? categoryLabels[cat].ar : categoryLabels[cat].fr}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.price}</label>
                <Input type="number" placeholder="0.00"
                  value={newServiceData.price}
                  onChange={(e) => setNewServiceData({ ...newServiceData, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.duration} ({language === 'ar' ? 'دقيقة' : 'min'})</label>
                <Input type="number" placeholder="30"
                  value={newServiceData.duration}
                  onChange={(e) => setNewServiceData({ ...newServiceData, duration: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNewService(false); setEditingService(null); }}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                onClick={handleCreateService}
                disabled={creating}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
