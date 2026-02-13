// ZenStyle - Salon Management System Types

export type Language = 'ar' | 'fr';
export type Direction = 'rtl' | 'ltr';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'receptionist' | 'manager';
  avatar?: string;
}

export interface Service {
  id: string;
  nameAr: string;
  nameFr: string;
  category: ServiceCategory;
  price: number;
  duration: number;
  descriptionAr?: string;
  descriptionFr?: string;
  color: string;
}

export type ServiceCategory =
  | 'hair'
  | 'nails'
  | 'spa'
  | 'skincare'
  | 'makeup'
  | 'massage';

export interface Product {
  id: string;
  nameAr: string;
  nameFr: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  expiryDate?: Date;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  birthDate?: Date;
  notes?: string;
  loyaltyPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  preferredStaff?: string;
  totalSpent: number;
  visitCount: number;
  lastVisit?: Date;
  avatar?: string;
  creditBalance: number;
}

export interface ClientPayment {
  id: string;
  clientId: string;
  type: 'purchase' | 'payment' | 'credit';
  amount: number;
  description?: string;
  referenceId?: string;
  createdAt: Date;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  specialty: string[];
  commissionRate: number;
  baseSalary: number;
  salaryType: 'monthly' | 'commission';
  hireDate: Date;
  avatar?: string;
  isActive: boolean;
  workingHours: WorkingHours;
}

export interface StaffPayment {
  id: string;
  staffId: string;
  type: 'salary' | 'commission' | 'advance' | 'bonus' | 'deduction';
  amount: number;
  description?: string;
  referenceId?: string;
  createdAt: Date;
}

export interface WorkingHours {
  [day: string]: {
    start: string;
    end: string;
    isWorking: boolean;
  };
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  services: AppointmentService[];
  date: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  totalAmount: number;
}

export interface AppointmentService {
  serviceId: string;
  nameAr: string;
  nameFr: string;
  price: number;
  duration: number;
}

export type AppointmentStatus =
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export interface Transaction {
  id: string;
  clientId?: string;
  clientName?: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  staffId: string;
  staffName: string;
}

export interface TransactionItem {
  id: string;
  type: 'service' | 'product';
  nameAr: string;
  nameFr: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'split' | 'loyalty';

export interface InventoryItem {
  id: string;
  nameAr: string;
  nameFr: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  maxStock: number;
  supplier?: string;
  lastRestocked?: Date;
  expiryDate?: Date;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  month: number;
  year: number;
  baseSalary: number;
  commissions: number;
  bonuses: number;
  deductions: number;
  totalPay: number;
  status: 'draft' | 'processed' | 'paid';
}

export interface Alert {
  id: string;
  type: 'stock' | 'appointment' | 'goal' | 'system';
  titleAr: string;
  titleFr: string;
  messageAr: string;
  messageFr: string;
  severity: 'info' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
}

export interface DashboardKPI {
  dailyRevenue: number;
  totalAppointments: number;
  activeClients: number;
  occupancyRate: number;
  revenueChange: number;
  appointmentsChange: number;
  clientsChange: number;
  occupancyChange: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface Localization {
  // Navigation
  dashboard: string;
  pos: string;
  appointments: string;
  clients: string;
  services: string;
  staff: string;
  reports: string;
  settings: string;

  // Common
  search: string;
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  confirm: string;
  close: string;
  back: string;
  next: string;
  previous: string;
  loading: string;
  noData: string;
  viewAll: string;
  saveChanges: string;

  // Dashboard
  revenue: string;
  todayAppointments: string;
  activeCustomers: string;
  occupancy: string;
  weeklyTrend: string;
  monthlyTrend: string;
  alerts: string;
  salonManagement: string;

  // POS
  cart: string;
  checkout: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  cash: string;
  card: string;
  split: string;
  loyalty: string;
  printReceipt: string;
  lowStock: string;
  payment: string;
  change: string;

  // Appointments
  calendar: string;
  newAppointment: string;
  confirmed: string;
  inProgress: string;
  completed: string;
  cancelled: string;
  noShow: string;

  // Clients
  newClient: string;
  clientHistory: string;
  loyaltyPoints: string;
  tier: string;

  // Services
  serviceCatalog: string;
  category: string;
  price: string;
  duration: string;

  // Staff
  employees: string;
  commission: string;
  salary: string;
  schedule: string;

  // Reports
  financial: string;
  inventory: string;
  performance: string;

  // Settings
  language: string;
  currency: string;
  taxes: string;
  backup: string;
  security: string;
}

export type View = 'dashboard' | 'pos' | 'appointments' | 'clients' | 'services' | 'staff' | 'inventory' | 'reports' | 'settings';
