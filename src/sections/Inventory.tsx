import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  ShoppingCart,
  Truck,
  DollarSign,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  ArrowUpRight,
  Download,
  FileText,
  Package
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
import type { Localization, Language } from '@/types';
import { api } from '@/services/api';
import { supabase } from '@/lib/supabase';

interface InventoryProps {
  t: Localization;
  language: Language;
}

interface InventoryItem {
  id: string;
  nameAr: string;
  nameFr: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  expiryDate?: Date;
  sku: string;
  maxStock: number;
  unitPrice: number;
  quantity: number;
  supplierId?: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  isActive: boolean;
  totalOrders: number;
  totalSpent: number;
  balance?: number;
}



// Mock data removed. Using API data.

const categories = [
  { id: 'all', nameAr: 'الكل', nameFr: 'Tout' },
  { id: 'hair', nameAr: 'الشعر', nameFr: 'Cheveux' },
  { id: 'nails', nameAr: 'الأظافر', nameFr: 'Ongles' },
  { id: 'skincare', nameAr: 'العناية بالبشرة', nameFr: 'Soin de la Peau' },
  { id: 'makeup', nameAr: 'المكياج', nameFr: 'Maquillage' },
  { id: 'spa', nameAr: 'السبا', nameFr: 'Spa' },
];

export default function Inventory({ t, language }: InventoryProps) {
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // New Product Form State
  const [newByName, setNewByName] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [newCategory, setNewCategory] = useState('hair');

  // New Supplier Form State
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierCity, setNewSupplierCity] = useState('');

  // New Order Form State
  const [newOrderSupplierId, setNewOrderSupplierId] = useState('');
  // Removed unused newOrderDate, newOrderExpectedDate, etc.

  const [newOrderItems, setNewOrderItems] = useState<{
    productId?: string, // for existing
    nameAr: string,
    nameFr: string,
    category: string,
    quantity: number,
    unitPrice: number,
    isNew: boolean
  }[]>([]);
  // Removed unused newOrderNotes

  // Temp Order Item State

  // Temp Order Item State
  const [itemMode, setItemMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingProduct, setSelectedExistingProduct] = useState('');

  // Purchase Payment State
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'credit' | 'partial'>('credit');
  const [partialAmount, setPartialAmount] = useState('');

  // Supplier History State
  const [supplierHistory, setSupplierHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Transaction Details State
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    if (selectedSupplier) {
      fetchSupplierHistory(selectedSupplier.id);
    }
  }, [selectedSupplier]);

  const fetchSupplierHistory = async (supplierId: string) => {
    setLoadingHistory(true);
    console.log('Fetching history for supplier:', supplierId);
    const { data, error } = await api.suppliers.getHistory(supplierId);
    console.log('History data:', data);
    if (error) console.error('History error:', error);
    if (data) setSupplierHistory(data);
    setLoadingHistory(false);
  };

  const handleOrderClick = async (orderId: string) => {
    const { data } = await api.purchaseOrders.getById(orderId);
    if (data) {
      setSelectedOrder(data);
      setShowOrderDetails(true);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedSupplier || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    // 1. Create Payment Record
    await api.supplierPayments.create({
      supplierId: selectedSupplier.id,
      amount,
      date: new Date().toISOString(),
      notes: paymentNotes
    });

    // 2. Update Balance (Reduce Debt)
    // Note: Debt is positive balance. Payment reduces it.
    await api.suppliers.updateBalance(selectedSupplier.id, -amount);

    // 3. Refresh
    fetchSupplierHistory(selectedSupplier.id);
    fetchInventory(); // To refresh supplier list with new balance
    setPaymentAmount('');
    setPaymentNotes('');

    // Update local selected supplier balance for immediate UI feedback
    setSelectedSupplier(prev => prev ? ({ ...prev, balance: (prev.balance || 0) - amount }) : null);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const [productsRes, suppliersRes] = await Promise.all([
      api.products.getAll(),
      api.suppliers.getAll()
    ]);

    if (productsRes.data) {
      // Map API data to InventoryItem (filling in missing fields)
      const mapped: InventoryItem[] = productsRes.data.map((item: any) => ({
        id: item.id,
        nameAr: item.nameAr,
        nameFr: item.nameFr,
        category: item.category,
        price: item.price,
        stock: item.stock,
        minStock: item.minStock,
        expiryDate: item.expiryDate,
        quantity: item.stock,
        unitPrice: item.price,
        maxStock: 100, // default
        sku: item.id.slice(0, 8).toUpperCase(), // fake SKU
        supplierId: undefined
      }));
      setInventory(mapped);
    }

    if (suppliersRes.data) {
      setSuppliers(suppliersRes.data);
    }

    setLoading(false);
  };

  const handleAddBatchItem = () => {
    if (itemMode === 'new') {
      if (!newByName || newQuantity <= 0 || newPrice <= 0) {
        alert("Please fill all item fields");
        return;
      }
      setNewOrderItems([...newOrderItems, {
        nameAr: newByName,
        nameFr: newByName,
        category: newCategory,
        quantity: newQuantity,
        unitPrice: newPrice,
        isNew: true
      }]);
      // Reset item inputs
      setNewByName('');
      setNewQuantity(0);
      setNewPrice(0);
      setNewCategory('hair');
    } else {
      if (!selectedExistingProduct || newQuantity <= 0 || newPrice <= 0) {
        alert("Please select product and fill quantity/price");
        return;
      }
      const product = inventory.find(p => p.id === selectedExistingProduct);
      if (!product) return;

      setNewOrderItems([...newOrderItems, {
        productId: product.id,
        nameAr: product.nameAr,
        nameFr: product.nameFr,
        category: product.category,
        quantity: newQuantity,
        unitPrice: newPrice,
        isNew: false
      }]);
      setSelectedExistingProduct('');
      setNewQuantity(0);
      setNewPrice(0);
    }
  };

  const handleRemoveBatchItem = (index: number) => {
    const updated = [...newOrderItems];
    updated.splice(index, 1);
    setNewOrderItems(updated);
  };

  const handleCreateBatchPurchase = async () => {
    if (!newOrderSupplierId || newOrderItems.length === 0) return;

    // 1. Create Purchase Order
    const subtotal = newOrderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const tax = subtotal * 0.19;
    // Note: The UI displays total * 1.19, so we should allow that.
    // However, the calculation above: total = subtotal + tax = subtotal * 1.19.
    const total = subtotal + tax;

    const orderFn = async () => {
      const { data: order, error: orderError } = await api.purchaseOrders.create({
        supplierId: newOrderSupplierId,
        orderDate: new Date(),
        subtotal,
        tax,
        total,
        notes: 'Batch Import',
        items: [] // we will create items manually linked to new products
      });
      return { order, orderError };
    };

    const { order, orderError } = await orderFn();
    if (orderError) {
      alert('Error creating order');
      return;
    }

    // 2. Create Products and Order Items
    for (const item of newOrderItems) {
      let productId = item.productId;

      if (item.isNew) {
        // Create New Product
        const { data: product } = await api.products.create({
          nameAr: item.nameAr,
          nameFr: item.nameFr,
          category: item.category,
          price: item.unitPrice * 1.5, // Default Markup
          stock: item.quantity,
          minStock: 5,
          supplierId: newOrderSupplierId,
          unitPrice: item.unitPrice
        });
        if (product) productId = product.id;
      } else if (productId) {
        // Update Existing Product Stock & Price
        const existing = inventory.find(p => p.id === productId);
        if (existing) {
          await api.products.update(productId, {
            stock: (existing.stock || 0) + item.quantity,
            unitPrice: item.unitPrice // Update latest purchase price
          });
        }
      }

      if (productId) {
        // Create Order Item linked to product
        await supabase.from('purchase_order_items').insert({
          purchase_order_id: order.id,
          product_id: productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice
        });
      }
    }

    // 3. Handle Financials
    // A. Always add the full debt first (Order created)
    await api.suppliers.updateBalance(newOrderSupplierId, total);

    // B. Handle Payment if not 'credit'
    if (paymentStatus === 'paid' || paymentStatus === 'partial') {
      const amountPaid = paymentStatus === 'paid' ? total : (parseFloat(partialAmount) || 0);

      if (amountPaid > 0) {
        // Create Payment Record
        await api.supplierPayments.create({
          supplierId: newOrderSupplierId,
          amount: amountPaid,
          date: new Date().toISOString(),
          method: 'cash', // Default to cash for now
          notes: `Payment for Order #${order.id.slice(0, 8)}`
        });

        // Reduce Debt by paid amount
        await api.suppliers.updateBalance(newOrderSupplierId, -amountPaid);
      }
    }

    setShowNewProduct(false);
    setNewOrderItems([]);
    setNewOrderSupplierId('');
    setPaymentStatus('credit');
    setPartialAmount('');
    fetchInventory();
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.products.delete(id);
      fetchInventory();
      setSelectedProduct(null);
    }
  }

  const handleCreateSupplier = async () => {
    const supplier = {
      name: newSupplierName,
      contactPerson: newSupplierContact,
      phone: newSupplierPhone,
      email: newSupplierEmail,
      address: newSupplierAddress,
      city: newSupplierCity
    };
    const { error } = await api.suppliers.create(supplier);
    if (!error) {
      setShowNewSupplier(false);
      fetchInventory();
      // Reset form
      setNewSupplierName('');
      setNewSupplierContact('');
      setNewSupplierPhone('');
      setNewSupplierEmail('');
      setNewSupplierAddress('');
      setNewSupplierCity('');
    } else {
      alert('Error creating supplier');
    }
  };


  const filteredInventory = inventory.filter(item => {
    const matchesSearch = language === 'ar'
      ? item.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) || (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      : item.nameFr.toLowerCase().includes(searchQuery.toLowerCase()) || (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const activeSuppliers = suppliers.filter(s => s.isActive).length;

  const getStockStatus = (item: InventoryItem) => {
    const q = item.quantity || 0;
    if (q <= item.minStock) return { label: language === 'ar' ? 'منخفض' : 'Faible', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (q >= (item.maxStock || 100) * 0.8) return { label: language === 'ar' ? 'ممتلئ' : 'Plein', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    return { label: language === 'ar' ? 'جيد' : 'Bon', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {language === 'ar' ? 'إدارة المخزون' : 'Gestion des Stocks'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' ? 'تتبع المخزون، المشتريات والموردين' : 'Suivi des stocks, achats et fournisseurs'}
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <Button variant="outline" className="rounded-xl">
            <Download className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تصدير' : 'Exporter'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{inventory.length}</p>
                <p className="text-xs text-slate-500">{language === 'ar' ? 'منتجات' : 'Produits'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{(totalInventoryValue / 1000).toFixed(0)}k</p>
                <p className="text-xs text-slate-500">DZD</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockItems.length}</p>
                <p className="text-xs text-slate-500">{language === 'ar' ? 'مخزون منخفض' : 'Stock Faible'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeSuppliers}</p>
                <p className="text-xs text-slate-500">{language === 'ar' ? 'موردين نشطين' : 'Fournisseurs Actifs'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>{language === 'ar' ? 'المخزون' : 'Stock'}</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>{language === 'ar' ? 'الموردين' : 'Fournisseurs'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-6">
          {/* Filters */}
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white/50 dark:bg-slate-800/50`}
              />
            </div>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat.id
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-slate-700'
                    }`}
                >
                  {language === 'ar' ? cat.nameAr : cat.nameFr}
                </button>
              ))}
            </div>
            <Button onClick={() => setShowNewProduct(true)} className="bg-gradient-to-r from-rose-500 to-pink-500">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إضافة مشتريات' : 'Ajouter un Achat'}
            </Button>
          </div>

          {/* Stock Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <Package className="w-8 h-8 animate-bounce text-rose-500" />
              </div>
            ) : (
              filteredInventory.map((item) => {
                const status = getStockStatus(item);
                return (
                  <Card
                    key={item.id}
                    className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
                    bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm cursor-pointer
                    hover:shadow-xl transition-all"
                    onClick={() => setSelectedProduct(item)}
                  >
                    <CardContent className="p-3 md:p-5">
                      <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                            <Package className="w-5 h-5 md:w-6 md:h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                              {language === 'ar' ? item.nameAr : item.nameFr}
                            </h3>
                            <p className="text-xs text-slate-500">{item.sku}</p>
                          </div>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">{language === 'ar' ? 'الكمية' : 'Quantité'}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.quantity <= item.minStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min((item.quantity / item.maxStock) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="font-medium text-sm">{item.quantity}</span>
                          </div>
                        </div>
                        <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-slate-500">{language === 'ar' ? 'السعر' : 'Prix'}</span>
                          <span className="font-medium">{(item.unitPrice || 0).toLocaleString()} DZD</span>
                        </div>
                        {item.expiryDate && (
                          <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-slate-500">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiration'}</span>
                            <span className="text-amber-600 text-xs">{item.expiryDate.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Purchases Tab */}
        {/* Purchases Tab removed */}

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="relative max-w-md flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={language === 'ar' ? 'بحث في الموردين...' : 'Rechercher des fournisseurs...'}
                className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white/50 dark:bg-slate-800/50`}
              />
            </div>
            <Button onClick={() => setShowNewSupplier(true)} className="bg-gradient-to-r from-rose-500 to-pink-500">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'مورد جديد' : 'Nouveau Fournisseur'}
            </Button>
          </div>

          {/* Suppliers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <Card
                key={supplier.id}
                className={`border-0 shadow-lg shadow-rose-100/50 dark:shadow-slate-900/50 
                  bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm cursor-pointer
                  hover:shadow-xl transition-all ${!supplier.isActive ? 'opacity-60' : ''}`}
                onClick={() => setSelectedSupplier(supplier)}
              >
                <CardContent className="p-5">
                  <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{supplier.name}</h3>
                        <Badge className={supplier.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'}>
                          {supplier.isActive
                            ? (language === 'ar' ? 'نشط' : 'Actif')
                            : (language === 'ar' ? 'غير نشط' : 'Inactif')}
                        </Badge>
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
                          <Phone className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'اتصال' : 'Appeler'}
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
                      <User className="w-4 h-4" />
                      <span>{supplier.contactPerson}</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Phone className="w-4 h-4" />
                      <span>{supplier.phone}</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{supplier.city}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-rose-100 dark:border-slate-700 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{supplier.totalOrders}</p>
                      <p className="text-xs text-slate-500">{language === 'ar' ? 'طلبات' : 'Commandes'}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{(supplier.balance || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{language === 'ar' ? 'الديون' : 'Dettes'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Purchase/Batch Dialog */}
      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <ShoppingCart className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'إضافة مشتريات جديدة' : 'Nouvel Achat / Stock'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">

            {/* 1. Select Supplier */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'المورد' : 'Fournisseur'}</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={newOrderSupplierId}
                onChange={(e) => setNewOrderSupplierId(e.target.value)}
              >
                <option value="">{language === 'ar' ? 'اختر مورد...' : 'Choisir un fournisseur...'}</option>
                {suppliers.filter(s => s.isActive).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

            {/* 2. Add Item Form */}
            {/* 2. Add Item Form */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-4 border border-slate-100 dark:border-slate-700">
              <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${itemMode === 'new' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500'}`}
                  onClick={() => setItemMode('new')}
                >
                  {language === 'ar' ? 'منتج جديد' : 'Nouveau Produit'}
                </button>
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${itemMode === 'existing' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500'}`}
                  onClick={() => setItemMode('existing')}
                >
                  {language === 'ar' ? 'منتج موجود' : 'Produit Existant'}
                </button>
              </div>

              {itemMode === 'new' ? (
                <>
                  <h4 className="font-semibold text-sm">{language === 'ar' ? 'بيانات المنتج الجديد' : 'Détails du nouveau produit'}</h4>
                  <div className="space-y-2">
                    <Input
                      placeholder={language === 'ar' ? 'اسم المنتج' : 'Nom du produit'}
                      value={newByName}
                      onChange={(e) => setNewByName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      {categories.filter(c => c.id !== 'all').map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {language === 'ar' ? cat.nameAr : cat.nameFr}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="font-semibold text-sm">{language === 'ar' ? 'اختر منتج' : 'Choisir un produit'}</h4>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedExistingProduct}
                    onChange={(e) => setSelectedExistingProduct(e.target.value)}
                  >
                    <option value="">{language === 'ar' ? 'اختر منتج من القائمة...' : 'Sélectionner un produit...'}</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {language === 'ar' ? item.nameAr : item.nameFr} ({item.sku})
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">{language === 'ar' ? 'الكمية' : 'Quantité'}</label>
                  <Input type="number" placeholder="0" value={newQuantity || ''} onChange={(e) => setNewQuantity(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">{language === 'ar' ? 'سعر الشراء (للوحدة)' : 'Prix Achat (Unitaire)'}</label>
                  <Input type="number" placeholder="0.00" value={newPrice || ''} onChange={(e) => setNewPrice(Number(e.target.value))} />
                </div>
              </div>
              <Button variant="secondary" className="w-full" onClick={handleAddBatchItem}>
                <Plus className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إضافة للقائمة' : 'Ajouter à la liste'}
              </Button>
            </div>

            {/* 3. Items List */}
            {newOrderItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{language === 'ar' ? 'قائمة المنتجات' : 'Liste des produits'} ({newOrderItems.length})</h4>
                <div className="space-y-2">
                  {newOrderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div>
                        <p className="font-medium">{language === 'ar' ? item.nameAr : item.nameFr}</p>
                        <p className="text-xs text-slate-500">{item.quantity} x {item.unitPrice} DZD</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0" onClick={() => handleRemoveBatchItem(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span>{language === 'ar' ? 'المجموع' : 'Total'}</span>
                  <span>{newOrderItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toLocaleString()} DZD</span>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'حالة الدفع' : 'Statut de Paiement'}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentStatus"
                        value="credit"
                        checked={paymentStatus === 'credit'}
                        onChange={() => setPaymentStatus('credit')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm">{language === 'ar' ? 'على الحساب (دين)' : 'Crédit (Non payé)'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentStatus"
                        value="paid"
                        checked={paymentStatus === 'paid'}
                        onChange={() => setPaymentStatus('paid')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm">{language === 'ar' ? 'مدفوع بالكامل' : 'Payé'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentStatus"
                        value="partial"
                        checked={paymentStatus === 'partial'}
                        onChange={() => setPaymentStatus('partial')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{language === 'ar' ? 'دفع جزئي' : 'Partiel'}</span>
                    </label>
                  </div>

                  {paymentStatus === 'partial' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs text-slate-500 mb-1 block">
                        {language === 'ar' ? 'المبلغ المدفوع' : 'Montant Payé'}
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        className="max-w-[200px]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewProduct(false)}>
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                onClick={handleCreateBatchPurchase}
                disabled={newOrderItems.length === 0 || !newOrderSupplierId}
              >
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Supplier Dialog */}
      <Dialog open={showNewSupplier} onOpenChange={setShowNewSupplier}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Truck className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'مورد جديد' : 'Nouveau Fournisseur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'اسم الشركة' : 'Nom de l\'entreprise'}</label>
              <Input
                placeholder={language === 'ar' ? 'اسم الشركة' : 'Nom de l\'entreprise'}
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'الشخص المسؤول' : 'Contact'}</label>
              <div className="relative">
                <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  className={`${isRTL ? 'pr-10' : 'pl-10'}`}
                  placeholder={language === 'ar' ? 'الاسم الكامل' : 'Nom complet'}
                  value={newSupplierContact}
                  onChange={(e) => setNewSupplierContact(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</label>
                <Input
                  placeholder="023X XXX XXX"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@fournisseur.dz"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'العنوان' : 'Adresse'}</label>
              <div className="relative">
                <MapPin className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  className={`${isRTL ? 'pr-10' : 'pl-10'}`}
                  placeholder={language === 'ar' ? 'العنوان الكامل' : 'Adresse complète'}
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'ar' ? 'المدينة' : 'Ville'}</label>
              <Input
                placeholder="Alger"
                value={newSupplierCity}
                onChange={(e) => setNewSupplierCity(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewSupplier(false)}>
                {t.cancel}
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500" onClick={handleCreateSupplier}>
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Old New Order Dialog Removed */}

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Package className="w-5 h-5 text-rose-500" />
                  {language === 'ar' ? selectedProduct.nameAr : selectedProduct.nameFr}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">SKU</span>
                    <span className="font-medium">{selectedProduct.sku}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">{language === 'ar' ? 'الكمية الحالية' : 'Quantité Actuelle'}</span>
                    <span className={`font-bold ${selectedProduct.quantity <= selectedProduct.minStock ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedProduct.quantity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">{language === 'ar' ? 'الحد الأدنى' : 'Stock Min'}</span>
                    <span className="font-medium">{selectedProduct.minStock}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{language === 'ar' ? 'الحد الأقصى' : 'Stock Max'}</span>
                    <span className="font-medium">{selectedProduct.maxStock}</span>
                  </div>
                </div>

                {/* Removed Last Restocked and Supplier as they are not yet in DB */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  {/* Placeholder for future supplier info */}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{language === 'ar' ? 'سعر الشراء' : 'Prix Achat'}</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{(selectedProduct.unitPrice || 0).toLocaleString()} DZD</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <p className="text-sm text-blue-600 dark:text-blue-400">{language === 'ar' ? 'القيمة الإجمالية' : 'Valeur Totale'}</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{(selectedProduct.quantity * (selectedProduct.unitPrice || 0)).toLocaleString()} DZD</p>
                  </div>
                </div>

                {/* Removed lastRestocked block */}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedProduct(null)}>
                    {t.close}
                  </Button>
                  <Button className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'تجديد المخزون' : 'Réapprovisionner'}
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteProduct(selectedProduct.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedSupplier && (
            <>
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Truck className="w-5 h-5 text-rose-500" />
                  {selectedSupplier.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 h-[60vh] flex flex-col">
                {/* Compact Header */}
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{selectedSupplier.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{selectedSupplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="truncate max-w-[150px]">{selectedSupplier.city}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-red-600 font-bold">
                    <span>{language === 'ar' ? 'الدين:' : 'Dette:'}</span>
                    <span>{(selectedSupplier.balance || 0).toLocaleString()} DZD</span>
                  </div>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg border-slate-100 dark:border-slate-700">
                  <div className="sticky top-0 bg-slate-100 dark:bg-slate-800 p-2 text-xs font-semibold flex justify-between">
                    <span className="w-1/3">{language === 'ar' ? 'العملية' : 'Transaction'}</span>
                    <span className="w-1/3 text-center">{language === 'ar' ? 'المبلغ' : 'Montant'}</span>
                    <span className="w-1/3 text-end">{language === 'ar' ? 'التفاصيل' : 'Détails'}</span>
                  </div>
                  {loadingHistory ? (
                    <div className="flex justify-center p-4"><div className="animate-spin w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full" /></div>
                  ) : supplierHistory.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-8">No history found</p>
                  ) : (
                    supplierHistory.map((item, idx) => (
                      <div
                        key={`${item.type}-${item.id}-${idx}`}
                        className={`flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.type === 'order' ? 'cursor-pointer' : ''}`}
                        onClick={() => item.type === 'order' && handleOrderClick(item.id)}
                      >
                        <div className="w-1/3 flex items-start gap-2">
                          <div className={`mt-1 w-2 h-2 rounded-full ${item.type === 'order' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <div>
                            <p className="font-medium">
                              {item.type === 'order'
                                ? `Invoice #${item.id.slice(0, 6)}`
                                : (language === 'ar' ? 'دفعة مالية' : 'Paiement Recu')}
                            </p>
                            <p className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className={`w-1/3 text-center font-bold ${item.type === 'order' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {item.amount.toLocaleString()} DZD
                        </div>

                        <div className="w-1/3 text-end text-xs text-slate-500">
                          {item.type === 'order'
                            ? (language === 'ar' ? 'على الحساب' : 'Non Payé') // Defaulting to Credit view for now
                            : (language === 'ar' ? 'تم الدفع' : 'Payé')}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Payment Form (Collapsible) */}
                {showPaymentForm && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-rose-100 dark:border-slate-700 animate-in slide-in-from-bottom-2">
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium">{language === 'ar' ? 'المبلغ' : 'Montant'}</label>
                        <Input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="h-9"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex-[2] space-y-1">
                        <label className="text-xs font-medium">{language === 'ar' ? 'ملاحظة' : 'Note'}</label>
                        <Input
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          className="h-9"
                          placeholder="..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm(false)}>
                        {t.cancel}
                      </Button>
                      <Button size="sm" onClick={() => { handleAddPayment(); setShowPaymentForm(false); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {language === 'ar' ? 'تأكيد الدفع' : 'Confirmer Paiement'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-3 pt-2 mt-auto">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedSupplier(null)}>
                    {t.close}
                  </Button>
                  {!showPaymentForm && (
                    <Button
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                      onClick={() => setShowPaymentForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'إضافة دفع' : 'Ajouter un paiement'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <FileText className="w-5 h-5 text-rose-500" />
              {language === 'ar' ? 'تفاصيل الفاتورة' : 'Détails de la Facture'}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">{language === 'ar' ? 'رقم الفاتورة' : 'Numéro de Facture'}</p>
                  <p className="font-bold font-mono">#{selectedOrder.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                  <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border rounded-lg border-slate-100 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="p-3 font-medium">{language === 'ar' ? 'المنتج' : 'Produit'}</th>
                      <th className="p-3 font-medium text-center">{language === 'ar' ? 'الكمية' : 'Qté'}</th>
                      <th className="p-3 font-medium text-right">{language === 'ar' ? 'السعر' : 'Prix'}</th>
                      <th className="p-3 font-medium text-right">{language === 'ar' ? 'المجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {selectedOrder.purchase_order_items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <p className="font-medium">{language === 'ar' ? item.products?.name_ar : item.products?.name_fr}</p>
                        </td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">{item.unit_price.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold">{(item.quantity * item.unit_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl min-w-[200px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-rose-600/70 dark:text-rose-400/70">{language === 'ar' ? 'المجموع الكلي' : 'Total Général'}</span>
                    <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{selectedOrder.total.toLocaleString()} DZD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}
