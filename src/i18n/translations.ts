import type { Localization } from '@/types';

export const translations: Record<'ar' | 'fr', Localization> = {
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    pos: 'نقطة البيع',
    appointments: 'المواعيد',
    clients: 'العملاء',
    services: 'الخدمات',
    staff: 'الموظفون',
    reports: 'التقارير',
    settings: 'الإعدادات',
    
    // Common
    search: 'بحث',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    close: 'إغلاق',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    viewAll: 'عرض الكل',
    saveChanges: 'حفظ التغييرات',
    
    // Dashboard
    revenue: 'الإيرادات',
    todayAppointments: 'مواعيد اليوم',
    activeCustomers: 'العملاء النشطون',
    occupancy: 'الإشغال',
    weeklyTrend: 'الاتجاه الأسبوعي',
    monthlyTrend: 'الاتجاه الشهري',
    alerts: 'التنبيهات',
    salonManagement: 'نظام إدارة الصالون',
    
    // POS
    cart: 'سلة المشتريات',
    checkout: 'الدفع',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    tax: 'الضريبة',
    total: 'المجموع',
    cash: 'نقداً',
    card: 'بطاقة',
    split: 'دفع مشترك',
    loyalty: 'نقاط الولاء',
    printReceipt: 'طباعة الفاتورة',
    lowStock: 'مخزون منخفض',
    payment: 'الدفع',
    change: 'الباقي',
    
    // Appointments
    calendar: 'التقويم',
    newAppointment: 'موعد جديد',
    confirmed: 'مؤكد',
    inProgress: 'قيد التنفيذ',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    noShow: 'لم يحضر',
    
    // Clients
    newClient: 'عميل جديد',
    clientHistory: 'سجل العميل',
    loyaltyPoints: 'نقاط الولاء',
    tier: 'الفئة',
    
    // Services
    serviceCatalog: 'كتالوج الخدمات',
    category: 'الفئة',
    price: 'السعر',
    duration: 'المدة',
    
    // Staff
    employees: 'الموظفون',
    commission: 'العمولة',
    salary: 'الراتب',
    schedule: 'الجدول',
    
    // Reports
    financial: 'مالي',
    inventory: 'المخزون',
    performance: 'الأداء',
    
    // Settings
    language: 'اللغة',
    currency: 'العملة',
    taxes: 'الضرائب',
    backup: 'النسخ الاحتياطي',
    security: 'الأمان',
  },
  
  fr: {
    // Navigation
    dashboard: 'Tableau de Bord',
    pos: 'Point de Vente',
    appointments: 'Rendez-vous',
    clients: 'Clients',
    services: 'Services',
    staff: 'Personnel',
    reports: 'Rapports',
    settings: 'Paramètres',
    
    // Common
    search: 'Rechercher',
    add: 'Ajouter',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    loading: 'Chargement...',
    noData: 'Aucune donnée',
    viewAll: 'Voir tout',
    saveChanges: 'Enregistrer les Modifications',
    
    // Dashboard
    revenue: 'Revenus',
    todayAppointments: 'Rendez-vous Aujourd\'hui',
    activeCustomers: 'Clients Actifs',
    occupancy: 'Occupation',
    weeklyTrend: 'Tendance Hebdomadaire',
    monthlyTrend: 'Tendance Mensuelle',
    alerts: 'Alertes',
    salonManagement: 'Système de Gestion de Salon',
    
    // POS
    cart: 'Panier',
    checkout: 'Paiement',
    subtotal: 'Sous-total',
    discount: 'Remise',
    tax: 'Taxe',
    total: 'Total',
    cash: 'Espèces',
    card: 'Carte',
    split: 'Paiement Partagé',
    loyalty: 'Points de Fidélité',
    printReceipt: 'Imprimer le Reçu',
    lowStock: 'Stock Faible',
    payment: 'Paiement',
    change: 'Monnaie',
    
    // Appointments
    calendar: 'Calendrier',
    newAppointment: 'Nouveau Rendez-vous',
    confirmed: 'Confirmé',
    inProgress: 'En Cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    noShow: 'Non Présent',
    
    // Clients
    newClient: 'Nouveau Client',
    clientHistory: 'Historique Client',
    loyaltyPoints: 'Points de Fidélité',
    tier: 'Niveau',
    
    // Services
    serviceCatalog: 'Catalogue des Services',
    category: 'Catégorie',
    price: 'Prix',
    duration: 'Durée',
    
    // Staff
    employees: 'Employés',
    commission: 'Commission',
    salary: 'Salaire',
    schedule: 'Planning',
    
    // Reports
    financial: 'Financier',
    inventory: 'Inventaire',
    performance: 'Performance',
    
    // Settings
    language: 'Langue',
    currency: 'Devise',
    taxes: 'Taxes',
    backup: 'Sauvegarde',
    security: 'Sécurité',
  },
};

export type TranslationKey = keyof Localization;
