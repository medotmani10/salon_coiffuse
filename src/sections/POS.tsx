import { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  User,
  Loader2,
  Check,
  Banknote,
  AlertCircle
} from 'lucide-react';
import { api } from '@/services/api';
import type { Staff, Service } from '@/types';
import type { Client, Product, Localization, Language } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface POSProps {
  t?: Localization;
  language: Language;
}

// Local interface for CartItem
interface CartItem {
  id: string;
  nameAr: string;
  nameFr: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  quantity: number;
  itemType: 'product' | 'service';
}

const productCategories = [
  { id: 'all', nameAr: 'الكل', nameFr: 'Tout' },
  { id: 'hair', nameAr: 'شعر', nameFr: 'Cheveux' },
  { id: 'face', nameAr: 'وجه', nameFr: 'Visage' },
  { id: 'body', nameAr: 'جسم', nameFr: 'Corps' },
  { id: 'nails', nameAr: 'أظافر', nameFr: 'Ongles' },
];

export default function POS({ language }: POSProps) {
  const isRTL = language === 'ar';

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, servicesRes, clientsRes, staffRes] = await Promise.all([
          api.products.getAll(),
          api.services.getAll(),
          api.clients.getAll(),
          api.staff.getAll()
        ]);

        if (productsRes.data) {
          setProducts(productsRes.data);
        }
        if (servicesRes.data) {
          setServices(servicesRes.data);
        }
        if (clientsRes.data) {
          setClients(clientsRes.data);
        }
        if (staffRes.data) {
          setStaffMembers(staffRes.data.filter(s => s.isActive));
        }
      } catch (err) {
        console.error('Error fetching POS data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Products filtered by category + search
  const filteredProducts: CartItem[] = products
    .filter(p => {
      const matchesSearch =
        p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameFr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedProductCategory === 'all' || p.category === selectedProductCategory;
      return matchesSearch && matchesCategory;
    })
    .map(p => ({ ...p, itemType: 'product' as const, quantity: 0 }));

  // Services filtered by search
  const filteredServices: CartItem[] = services
    .filter(s =>
      s.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameFr.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map(s => ({
      id: s.id,
      nameAr: s.nameAr,
      nameFr: s.nameFr,
      category: s.category || 'service',
      price: s.price,
      stock: 999,
      minStock: 0,
      quantity: 0,
      itemType: 'service' as const,
    }));

  const currentItems = activeTab === 'products' ? filteredProducts : filteredServices;

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const key = `${item.itemType}-${item.id}`;
      const existing = prev.find(ci => `${ci.itemType}-${ci.id}` === key);
      if (existing) {
        return prev.map(ci =>
          `${ci.itemType}-${ci.id}` === key
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };



  const updateQuantity = (key: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (`${item.itemType}-${item.id}` === key) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const servicesTotal = cart.filter(i => i.itemType === 'service').reduce((sum, i) => sum + (i.price * i.quantity), 0);

  // Calculations
  const subtotal = cartTotal;
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  // Assuming tax is included or added? Let's say tax is 0 for simplicity or consistent with previous logic
  const tax = 0;
  const total = afterDiscount + tax;
  const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;
  const creditRemaining = paymentMethod === 'credit' ? Math.max(0, total - amountPaid) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    // Credit requires a client
    if (paymentMethod === 'credit' && !selectedClientId) {
      alert(language === 'ar' ? 'يجب اختيار زبون للدفع بالكريدي' : 'Sélectionnez un client pour le paiement à crédit');
      return;
    }
    setProcessing(true);

    try {
      const transaction = {
        clientId: selectedClientId || null,
        staffId: selectedStaffId || undefined,
        subtotal: subtotal,
        discount: discountAmount,
        tax: tax,
        totalAmount: total,
        paymentMethod: paymentMethod,
        items: cart
      };

      const { data: txData, error } = await api.transactions.create(transaction);

      if (error) {
        alert(language === 'ar' ? 'حدث خطأ أثناء الدفع' : 'Erreur lors du paiement');
      } else {
        // Auto-record commission for commission-based staff (services only)
        if (selectedStaffId && txData) {
          const staff = staffMembers.find(s => s.id === selectedStaffId);
          if (staff && staff.salaryType === 'commission' && staff.commissionRate > 0 && servicesTotal > 0) {
            const commissionAmount = servicesTotal * (staff.commissionRate / 100);
            await api.staff.addPayment({
              staffId: staff.id,
              type: 'commission',
              amount: commissionAmount,
              description: `POS #${txData.id?.slice(0, 8)} (${language === 'ar' ? 'خدمات' : 'Services'}: ${servicesTotal.toLocaleString()} DZD)`,
              referenceId: txData.id
            });
          }
        }

        // Handle credit payment — record debt to client
        if (paymentMethod === 'credit' && selectedClientId && creditRemaining > 0 && txData) {
          await api.clients.updateCreditBalance(selectedClientId, creditRemaining);
          await api.clients.addPayment({
            clientId: selectedClientId,
            type: 'credit',
            amount: creditRemaining,
            description: `POS #${txData.id?.slice(0, 8)} - ${language === 'ar' ? 'كريدي' : 'Crédit'}`,
            referenceId: txData.id
          });
          if (amountPaid > 0) {
            await api.clients.addPayment({
              clientId: selectedClientId,
              type: 'purchase',
              amount: amountPaid,
              description: `POS #${txData.id?.slice(0, 8)} - ${language === 'ar' ? 'دفع جزئي' : 'Paiement partiel'}`,
              referenceId: txData.id
            });
          }
        } else if (selectedClientId && txData) {
          // Full payment — record as purchase
          await api.clients.addPayment({
            clientId: selectedClientId,
            type: 'purchase',
            amount: total,
            description: `POS #${txData.id?.slice(0, 8)}`,
            referenceId: txData.id
          });
        }

        // Add loyalty points (1 DZD = 1 point) + auto-tier upgrade
        if (selectedClientId) {
          const paidAmount = paymentMethod === 'credit' ? amountPaid : total;
          if (paidAmount > 0) {
            await api.clients.addLoyaltyPoints(selectedClientId, Math.floor(paidAmount / 10), paidAmount);
          }
        }

        alert(language === 'ar' ? 'تم الدفع بنجاح!' : 'Paiement réussi!');
        setCart([]);
        setSelectedClientId('');
        setSelectedStaffId('');
        setShowCheckout(false);
        setCashReceived(0);
        setAmountPaid(0);
        setDiscount(0);
        // Refresh products to update stock
        const { data } = await api.products.getAll();
        if (data) setProducts(data);
        // Refresh clients to update credit balances
        const { data: cData } = await api.clients.getAll();
        if (cData) setClients(cData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-2 md:gap-6">
      {/* Left Side */}
      <div className="flex-1 flex flex-col gap-3 md:gap-4 min-w-0">

        {/* Tabs + Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm">
          {/* Products / Services Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 sm:w-36 px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'products'
                ? 'bg-rose-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500'
                }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {language === 'ar' ? 'المنتجات' : 'Produits'}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>{products.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 sm:w-36 px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'services'
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-purple-500'
                }`}
            >
              ✂️
              {language === 'ar' ? 'الخدمات' : 'Services'}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'services' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>{services.length}</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <Input
              placeholder={language === 'ar'
                ? (activeTab === 'products' ? 'بحث في المنتجات...' : 'بحث في الخدمات...')
                : (activeTab === 'products' ? 'Rechercher produit...' : 'Rechercher service...')}
              className={`${isRTL ? 'pr-9 text-right' : 'pl-9'} bg-slate-50 dark:bg-slate-900 border-none`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Product Sub-Categories (only on Products tab) */}
        {activeTab === 'products' && (
          <div className="w-full overflow-x-auto pb-1">
            <div className="flex gap-2 px-1 min-w-max">
              {productCategories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedProductCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedProductCategory(cat.id)}
                  className={`rounded-full px-4 text-xs ${selectedProductCategory === cat.id
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : 'border-slate-200 dark:border-slate-700'
                    }`}
                >
                  {isRTL ? cat.nameAr : cat.nameFr}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Items Grid */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <span className="text-4xl mb-3">{activeTab === 'products' ? '📦' : '✂️'}</span>
              <p className="text-sm">
                {language === 'ar'
                  ? (activeTab === 'products' ? 'لا توجد منتجات' : 'لا توجد خدمات')
                  : (activeTab === 'products' ? 'Aucun produit' : 'Aucun service')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 pb-4">
              {currentItems.map(item => (
                <Card
                  key={`${item.itemType}-${item.id}`}
                  className={`cursor-pointer group hover:shadow-lg transition-all border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 ${activeTab === 'services' ? 'ring-1 ring-purple-200 dark:ring-purple-800' : ''
                    } ${item.stock === 0 ? 'opacity-40 pointer-events-none' : ''}`}
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-2">
                    <div className={`aspect-square rounded-lg mb-2 relative overflow-hidden flex items-center justify-center ${activeTab === 'services'
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-300'
                      }`}>
                      <span className="text-2xl">{activeTab === 'services' ? '✂️' : '📦'}</span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="font-medium text-xs md:text-sm text-slate-800 dark:text-slate-200 truncate leading-tight">
                      {isRTL ? item.nameAr : item.nameFr}
                    </h3>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`font-bold text-xs md:text-sm ${activeTab === 'services' ? 'text-purple-500' : 'text-rose-500'
                        }`}>{item.price.toLocaleString()}</span>
                      {activeTab === 'products' && (
                        <span className={`text-[10px] ${item.stock > 5 ? 'text-slate-400' :
                          item.stock > 0 ? 'text-amber-500 font-bold' :
                            'text-red-500 font-bold'
                          }`}>
                          {item.stock === 0 ? (language === 'ar' ? 'نفد' : 'Épuisé') : item.stock}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Side - Cart */}
      <div className="hidden lg:flex w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex-col border border-slate-100 dark:border-slate-700">
        {/* Cart Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isRTL ? 'السلة الحالية' : 'Panier Actuel'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-xs font-bold px-2 py-1 rounded-full">
                {cart.length} {isRTL ? 'عناصر' : 'articles'}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCart([])} disabled={cart.length === 0}>
                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
              </Button>
            </div>
          </div>

          {/* Client Selector */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <select
              className="bg-transparent border-none text-sm w-full focus:outline-none dark:text-white dark:bg-slate-900"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">{language === 'ar' ? 'اختر عميل (اختياري)' : 'Choisir client (optionnel)'}</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {cart.map(item => {
              const key = `${item.itemType}-${item.id}`;
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${item.itemType === 'service' ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <ShoppingCart className={`w-6 h-6 ${item.itemType === 'service' ? 'text-purple-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {isRTL ? item.nameAr : item.nameFr}
                    </h4>
                    <p className="text-sm text-rose-500 font-semibold">
                      {item.price.toLocaleString()} DZD
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(key, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(key, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-500">
              <span>{isRTL ? 'المجموع الفرعي' : 'Sous-total'}</span>
              <span>{subtotal.toLocaleString()} DZD</span>
            </div>

            <div className="flex justify-between text-xl font-bold text-slate-800 dark:text-slate-100 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span>{isRTL ? 'المجموع' : 'Total'}</span>
              <span>{total.toLocaleString()} DZD</span>
            </div>
          </div>

          <Button
            className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => setShowCheckout(true)}
            disabled={cart.length === 0 || processing}
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CreditCard className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            )}
            {isRTL ? 'إتمام الدفع' : 'Payer Maintenant'}
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <CreditCard className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'الدفع' : 'Paiement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Staff Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === 'ar' ? 'الموظف' : 'Employé'}
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm"
              >
                <option value="">{language === 'ar' ? '-- بدون موظف --' : '-- Sans employé --'}</option>
                {staffMembers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} {s.salaryType === 'commission' ? `(${s.commissionRate}%)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                  }`}
              >
                <Banknote className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">{language === 'ar' ? 'نقد' : 'Espèces'}</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                  }`}
              >
                <CreditCard className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">{language === 'ar' ? 'بطاقة' : 'Carte'}</span>
              </button>
              <button
                onClick={() => setPaymentMethod('credit')}
                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'credit'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                  }`}
              >
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">{language === 'ar' ? 'كريدي' : 'Crédit'}</span>
              </button>
            </div>

            {/* Cash Payment Input */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'المبلغ المستلم' : 'Montant Reçu'}
                </label>
                <Input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  placeholder="0.00"
                  className="text-2xl font-bold text-center h-14"
                />
                {cashReceived > 0 && (
                  <div className={`flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-emerald-700 dark:text-emerald-400">{language === 'ar' ? 'الباقي' : 'Monnaie'}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {change.toLocaleString()} DZD
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Credit Payment Input */}
            {paymentMethod === 'credit' && (
              <div className="space-y-3">
                {!selectedClientId && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {language === 'ar' ? 'يجب اختيار زبون للدفع بالكريدي' : 'Sélectionnez un client pour le crédit'}
                  </div>
                )}
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'المبلغ المدفوع الآن' : 'Montant Payé Maintenant'}
                </label>
                <Input
                  type="number"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Math.min(Number(e.target.value), total))}
                  placeholder="0.00"
                  className="text-2xl font-bold text-center h-14"
                  max={total}
                />
                {creditRemaining > 0 && (
                  <div className={`flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-red-700 dark:text-red-400 font-medium">
                      {language === 'ar' ? 'الباقي (كريدي)' : 'Reste (Crédit)'}
                    </span>
                    <span className="font-bold text-red-700 dark:text-red-400">
                      {creditRemaining.toLocaleString()} DZD
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Total Display */}
            <div className={`flex justify-between items-center p-4 bg-rose-50 dark:bg-slate-700/50 rounded-xl ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="font-medium">{language === 'ar' ? 'المجموع' : 'Total'}</span>
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {total.toLocaleString()} DZD
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                onClick={handleCheckout}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {language === 'ar' ? 'تأكيد' : 'Confirmer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Cart Sheet - Reusing logic */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="lg:hidden fixed bottom-20 left-4 right-4 h-14 rounded-xl shadow-2xl bg-slate-900 text-white z-40 flex items-center justify-between px-6 hover:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="font-bold">{cart.length} {isRTL ? 'عناصر' : 'Items'}</span>
            </div>
            <span className="font-bold text-lg">{total.toLocaleString()} DZD</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl border-t-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Cart</SheetTitle>
          </SheetHeader>

          {/* Cart Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {isRTL ? 'السلة الحالية' : 'Panier Actuel'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-xs font-bold px-2 py-1 rounded-full">
                  {cart.length} {isRTL ? 'عناصر' : 'articles'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCart([])} disabled={cart.length === 0}>
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </Button>
              </div>
            </div>

            {/* Client Selector */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <select
                className="bg-transparent border-none text-sm w-full focus:outline-none dark:text-white dark:bg-slate-900"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">{language === 'ar' ? 'اختر عميل (اختياري)' : 'Choisir client (optionnel)'}</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {cart.map(item => {
                const key = `${item.itemType}-${item.id}`;
                return (
                  <div key={key} className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${item.itemType === 'service' ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                      <ShoppingCart className={`w-6 h-6 ${item.itemType === 'service' ? 'text-purple-400' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {isRTL ? item.nameAr : item.nameFr}
                      </h4>
                      <p className="text-sm text-rose-500 font-semibold">
                        {item.price.toLocaleString()} DZD
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(key, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(key, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-500">
                <span>{isRTL ? 'المجموع الفرعي' : 'Sous-total'}</span>
                <span>{subtotal.toLocaleString()} DZD</span>
              </div>

              <div className="flex justify-between text-xl font-bold text-slate-800 dark:text-slate-100 pt-3 border-t border-slate-200 dark:border-slate-700">
                <span>{isRTL ? 'المجموع' : 'Total'}</span>
                <span>{total.toLocaleString()} DZD</span>
              </div>
            </div>

            <Button
              className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200 dark:shadow-none transition-all"
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0 || processing}
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <CreditCard className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              )}
              {isRTL ? 'إتمام الدفع' : 'Payer Maintenant'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
