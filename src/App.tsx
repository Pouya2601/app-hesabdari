import React, { useState, useMemo, useEffect } from 'react';

// ==========================================
// TYPES & INTERFACES
// ==========================================
export interface UserProfile {
email: string;
firstName: string;
lastName: string;
businessName: string;
isProfileComplete: boolean;
}

export interface Category {
id: string;
name: string;
parentId?: string | null;
}

export interface Product {
id: string;
name: string;
categoryId: string;
buyPrice: number;
sellPrice: number;
stock: number;
minStockAlert: number;
}

export interface Customer {
id: string;
name: string;
phone: string;
address: string;
}

export interface CartItem {
product: Product;
quantity: number;
}

export interface SaleTransaction {
id: string;
date: string; // ISO String or YYYY-MM-DD
shamsiDate: string;
customerName: string;
paymentType: 'cash' | 'cheque' | 'installment';
totalAmount: number; // مبلغ کل محاسباتی نهایی
baseAmount: number; // مبلغ پایه فاکتور
downPayment: number; // پیش‌پرداخت
profit: number; // سود محاسبه شده

// Cheque details
chequeNumber?: string;
bankName?: string;
dueDateShamsi?: string;

// Installment details
installmentMonths?: number;
interestPercent?: number;

status: 'pending' | 'settled' | 'archived';
settlingDate?: string;
canReArchive?: boolean;
}

// Helper function for Shamsi Date string
const getTodayShamsi = () => {
const d = new Date();
return new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(d);
};

export default function App() {
// 1. Auth States
const [currentUser, setCurrentUser] = useState<UserProfile | null>({
email: 'user@example.com',
firstName: 'محمدپویا',
lastName: 'توکلیان',
businessName: 'فروشگاه نمونه',
isProfileComplete: true,
});

const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
const [authEmail, setAuthEmail] = useState('');
const [authPassword, setAuthPassword] = useState('');
const [forgotSent, setForgotSent] = useState(false);

const [profFirstName, setProfFirstName] = useState('');
const [profLastName, setProfLastName] = useState('');
const [profBusinessName, setProfBusinessName] = useState('');

// 2. Navigation & Tabs
const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'sales' | 'cheques' | 'bulk_price' | 'reports'>('inventory');

// 3. Category & Inventory States
const [categories, setCategories] = useState<Category[]>([
{ id: '1', name: 'قطعات موتوری', parentId: null },
{ id: '2', name: 'لوازم مصرفی', parentId: null },
]);
const [catName, setCatName] = useState('');
const [parentCatId, setParentCatId] = useState<string>('');
const [editingCatId, setEditingCatId] = useState<string | null>(null);
const [editingCatName, setEditingCatName] = useState('');

const [products, setProducts] = useState<Product[]>([]);
const [prodName, setProdName] = useState('');
const [prodCatId, setProdCatId] = useState('');
const [prodBuyPrice, setProdBuyPrice] = useState<number | ''>('');
const [prodSellPrice, setProdSellPrice] = useState<number | ''>('');
const [prodStock, setProdStock] = useState<number | ''>('');
const [prodAlert, setProdAlert] = useState<number | ''>('');
const [prodSortBy, setProdSortBy] = useState<'name' | 'stock' | 'price'>('name');

// 4. Customers States
const [customers, setCustomers] = useState<Customer[]>([
{ id: 'c1', name: 'کریم ادیمی', phone: '09120000000', address: 'تهران' }
]);
const [custName, setCustName] = useState('');
const [custPhone, setCustPhone] = useState('');
const [custAddress, setCustAddress] = useState('');
const [custSortBy, setCustSortBy] = useState<'name'>('name');

// 5. Sales & Cart States
const [cart, setCart] = useState<CartItem[]>([]);
const [selectedCustomerId, setSelectedCustomerId] = useState<string>('c1');
const [paymentType, setPaymentType] = useState<'cash' | 'cheque' | 'installment'>('cash');

// Cheque Sale Inputs
const [chequeDownPayment, setChequeDownPayment] = useState<number | ''>('');
const [chequeBank, setChequeBank] = useState('');
const [chequeNumber, setChequeNumber] = useState('');
const [chequeInterestPercent, setChequeInterestPercent] = useState<number | ''>('');
const [chequeYear, setChequeYear] = useState('1405');
const [chequeMonth, setChequeMonth] = useState('06');
const [chequeDay, setChequeDay] = useState('19');

// Installment Sale Inputs
const [instDownPayment, setInstDownPayment] = useState<number | ''>('');
const [instMonths, setInstMonths] = useState<number | ''>(2);
const [instInterestPercent, setInstInterestPercent] = useState<number | ''>(20);

const [sales, setSales] = useState<SaleTransaction[]>([]);

// 6. Cheques & Installments Filter
const [chequeSubTab, setChequeSubTab] = useState<'active' | 'archived'>('active');

// 7. Bulk Price Adjustment
const [bulkCatId, setBulkCatId] = useState<string>('all');
const [adjustType, setAdjustType] = useState<'percent' | 'amount'>('percent');
const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase');
const [adjustValue, setAdjustValue] = useState<number | ''>('');

// 8. Reports Filter
const [reportRange, setReportRange] = useState<'day' | 'week' | 'month' | 'custom'>('day');
const [customDays, setCustomDays] = useState<number | ''>(90);

// ==========================================
// HANDLERS & LOGIC
// ==========================================

// Categories Handlers
const handleAddCategory = (e: React.FormEvent) => {
e.preventDefault();
if (!catName.trim()) return;
const newCat: Category = {
id: Date.now().toString(),
name: catName.trim(),
parentId: parentCatId || null
};
setCategories([...categories, newCat]);
setCatName('');
setParentCatId('');
};

const handleEditCategory = (cat: Category) => {
setEditingCatId(cat.id);
setEditingCatName(cat.name);
};

const handleSaveCategoryEdit = (id: string) => {
if (!editingCatName.trim()) return;
setCategories(categories.map(c => c.id === id ? { ...c, name: editingCatName.trim() } : c));
setEditingCatId(null);
setEditingCatName('');
};

const handleDeleteCategory = (id: string) => {
if (confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) {
setCategories(categories.filter(c => c.id !== id));
}
};

// Product Handlers
const handleAddProduct = (e: React.FormEvent) => {
e.preventDefault();
if (!prodName.trim() || !prodCatId) return;
const newProd: Product = {
id: Date.now().toString(),
name: prodName.trim(),
categoryId: prodCatId,
buyPrice: Number(prodBuyPrice) || 0,
sellPrice: Number(prodSellPrice) || 0,
stock: Number(prodStock) || 0,
minStockAlert: Number(prodAlert) || 0,
};
setProducts([...products, newProd]);
setProdName('');
setProdBuyPrice('');
setProdSellPrice('');
setProdStock('');
setProdAlert('');
};

// Customer Handlers
const handleAddCustomer = (e: React.FormEvent) => {
e.preventDefault();
if (!custName.trim()) return;
const newC: Customer = {
id: Date.now().toString(),
name: custName.trim(),
phone: custPhone,
address: custAddress
};
setCustomers([...customers, newC]);
setCustName('');
setCustPhone('');
setCustAddress('');
};

// Cart & Sales Handlers
const addToCart = (product: Product) => {
const existing = cart.find(item => item.product.id === product.id);
if (existing) {
setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
} else {
setCart([...cart, { product, quantity: 1 }]);
}
};

const removeFromCart = (productId: string) => {
setCart(cart.filter(item => item.product.id !== productId));
};

// Calculations for Sales
const cartBaseTotal = useMemo(() => {
return cart.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
}, [cart]);

const cartBuyTotal = useMemo(() => {
return cart.reduce((sum, item) => sum + (item.product.buyPrice * item.quantity), 0);
}, [cart]);

// Total invoice calculation after interest
const calculatedInvoiceTotal = useMemo(() => {
if (paymentType === 'cheque') {
const interest = Number(chequeInterestPercent) || 0;
return cartBaseTotal + (cartBaseTotal * (interest / 100));
} else if (paymentType === 'installment') {
const interest = Number(instInterestPercent) || 0;
return cartBaseTotal + (cartBaseTotal * (interest / 100));
}
return cartBaseTotal;
}, [cartBaseTotal, paymentType, chequeInterestPercent, instInterestPercent]);

const handleCompleteSale = () => {
if (cart.length === 0) return;
const customer = customers.find(c => c.id === selectedCustomerId);
const customerName = customer ? customer.name : 'مشتری موردی';

let downPaymentVal = 0;
if (paymentType === 'cheque') {
downPaymentVal = Number(chequeDownPayment) || 0;
} else if (paymentType === 'installment') {
downPaymentVal = Number(instDownPayment) || 0;
} else {
downPaymentVal = calculatedInvoiceTotal;
}

const baseProfit = cartBaseTotal - cartBuyTotal;
const interestProfit = calculatedInvoiceTotal - cartBaseTotal;
const totalProfit = baseProfit + interestProfit;

const newSale: SaleTransaction = {
id: Date.now().toString(),
date: new Date().toISOString().split('T')[0],
shamsiDate: getTodayShamsi(),
customerName,
paymentType,
totalAmount: calculatedInvoiceTotal,
baseAmount: cartBaseTotal,
downPayment: downPaymentVal,
profit: totalProfit,
status: 'pending',
bankName: paymentType === 'cheque' ? chequeBank : undefined,
chequeNumber: paymentType === 'cheque' ? chequeNumber : undefined,
dueDateShamsi: paymentType === 'cheque' ? `${chequeYear}/${chequeMonth}/${chequeDay}` : undefined,
installmentMonths: paymentType === 'installment' ? (Number(instMonths) || 1) : undefined,
interestPercent: paymentType === 'cheque' ? (Number(chequeInterestPercent) || 0) : (paymentType === 'installment' ? (Number(instInterestPercent) || 0) : 0)
};

setSales([newSale, ...sales]);

// Update product stock
setProducts(products.map(p => {
const inCart = cart.find(c => c.product.id === p.id);
if (inCart) {
return { ...p, stock: Math.max(0, p.stock - inCart.quantity) };
}
return p;
}));

// Reset Cart
setCart([]);
alert('فاکتور با موفقیت ثبت گردید.');
};

// Cheque & Archive Status Handlers
const handleSettleAndArchive = (id: string) => {
setSales(sales.map(s => {
if (s.id === id) {
return {
...s,
status: 'archived',
settlingDate: `${getTodayShamsi()} (${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })})`
};
}
return s;
}));
};

const handleUnarchive = (id: string) => {
setSales(sales.map(s => {
if (s.id === id) {
return {
...s,
status: 'pending',
canReArchive: true
};
}
return s;
}));
};

// Bulk Price Handlers
const handleApplyBulkPrice = (e: React.FormEvent) => {
e.preventDefault();
const val = Number(adjustValue);
if (!val) return;

setProducts(products.map(p => {
if (bulkCatId === 'all' || p.categoryId === bulkCatId) {
let newSell = p.sellPrice;
if (adjustType === 'percent') {
const diff = (p.sellPrice * val) / 100;
newSell = adjustDirection === 'increase' ? p.sellPrice + diff : p.sellPrice - diff;
} else {
newSell = adjustDirection === 'increase' ? p.sellPrice + val : p.sellPrice - val;
}
return { ...p, sellPrice: Math.max(0, newSell) };
}
return p;
}));

alert('تغییر قیمت دسته‌ای با موفقیت اعمال گردید.');
setAdjustValue('');
};

// Sorted Lists & Filtered Data
const sortedProducts = useMemo(() => {
return [...products].sort((a, b) => {
if (prodSortBy === 'stock') return b.stock - a.stock;
if (prodSortBy === 'price') return b.sellPrice - a.sellPrice;
return a.name.localeCompare(b.name, 'fa');
});
}, [products, prodSortBy]);

const filteredSales = useMemo(() => {
const today = new Date().toISOString().split('T')[0];
const now = new Date();

return sales.filter(s => {
if (reportRange === 'day') {
return s.date === today;
}
let limitDays = 1;
if (reportRange === 'week') limitDays = 7;
if (reportRange === 'month') limitDays = 30;
if (reportRange === 'custom') limitDays = Number(customDays) || 90;

const cutoffTime = now.getTime() - (limitDays * 24 * 60 * 60 * 1000);
return new Date(s.date).getTime() >= cutoffTime;
});
}, [sales, reportRange, customDays]);

// Report Metrics (DownPayment Only for Cheque/Installment on same-day profit display)
const totalSalesAmount = useMemo(() => {
return filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
}, [filteredSales]);

const totalNetProfit = useMemo(() => {
return filteredSales.reduce((acc, s) => {
if (s.paymentType === 'cash') {
return acc + s.profit;
} else {
// For Cheque & Installment, reflect downpayment ratio in profit calculation for accurate daily cashflow
const profitRatio = s.totalAmount > 0 ? (s.profit / s.totalAmount) : 0;
const dailyProfitFromDownpayment = s.downPayment * profitRatio;
return acc + dailyProfitFromDownpayment;
}
}, 0);
}, [filteredSales]);

// Auth Guard
if (!currentUser) {
return (
<div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 dir-rtl" dir="rtl">
<div className="text-center mb-8">
<h1 className="text-3xl font-extrabold text-blue-400 mb-2">برنامه جامع حسابداری فروشگاهی</h1>
<div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-800 rounded-full text-slate-300">
<span>طراحی و توسعه:</span>
<span className="font-bold text-amber-400">@empty_aistudio</span>
</div>
</div>

<div className="w-full max-w-md bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
{authMode === 'login' && (
<form onSubmit={(e) => { e.preventDefault(); setCurrentUser({ email: authEmail, firstName: 'کاربر', lastName: 'نمونه', businessName: 'فروشگاه نمونه', isProfileComplete: true }); }} className="space-y-4">
<h2 className="text-xl font-bold text-center border-b border-slate-700 pb-3">ورود به سامانه شخصی</h2>
<div>
<label className="block text-sm mb-1 text-slate-300">ایمیل</label>
<input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
</div>
<div>
<label className="block text-sm mb-1 text-slate-300">رمز عبور</label>
<input required type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
</div>
<button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-colors">ورود</button>
<button
type="button"
onClick={() => setAuthMode('register')}
className="w-full mt-3 text-center text-sm text-blue-400 hover:underline"
>
حساب کاربری ندارید؟ ثبت‌نام کنید
</button>
</form>
)}
</div>
</div>
);
}

// Dashboard Layout
return (
<div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col dir-rtl font-sans" dir="rtl">
{/* Top Header */}
<header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30">
<div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
<div>
<h1 className="text-xl font-bold text-blue-400">برنامه جامع حسابداری فروشگاهی</h1>
<p className="text-xs text-slate-400">{currentUser.businessName} - {currentUser.firstName} {currentUser.lastName}</p>
</div>

<div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50 text-xs">
<span className="text-slate-400">توسعه:</span>
<span className="font-bold text-amber-400">@empty_aistudio</span>
</div>

<button onClick={() => setCurrentUser(null)} className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-900/40">
خروج
</button>
</div>

{/* Tabs */}
<nav className="max-w-7xl mx-auto flex gap-2 mt-4 overflow-x-auto pb-1">
<button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
مدیریت انبار
</button>
<button onClick={() => setActiveTab('customers')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'customers' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
دفتر مشتریان
</button>
<button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'sales' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
ثبت فروش
</button>
<button onClick={() => setActiveTab('cheques')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'cheques' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
چک‌ها و اقساط
</button>
<button onClick={() => setActiveTab('bulk_price')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'bulk_price' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
تغییر قیمت دسته‌ای
</button>
<button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
گزارش سود و زیان
</button>
</nav>
</header>

{/* Main Content Area */}
<main className="max-w-7xl mx-auto p-4 md:p-6 flex-1 w-full">
{/* TAB 1: INVENTORY MANAGEMENT */}
{activeTab === 'inventory' && (
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div className="space-y-6">
{/* Category Section with Edit/Delete */}
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
<h3 className="text-md font-bold text-blue-400 border-b border-slate-800 pb-2">افزودن دسته اصلی / زیردسته</h3>
<form onSubmit={handleAddCategory} className="space-y-3">
<input type="text" placeholder="نام دسته (مثلاً قطعات)" value={catName} onChange={e => setCatName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
<select value={parentCatId} onChange={e => setParentCatId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
<option value="">دسته اصلی (بدون والد)</option>
{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
</select>
<button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold">ثبت دسته</button>
</form>

{/* Category List with Edit/Delete capabilities */}
<div className="mt-4 pt-4 border-t border-slate-800">
<h4 className="text-xs font-bold text-slate-400 mb-2">مدیریت دسته‌بندی‌های ثبت شده</h4>
<div className="space-y-2 max-h-48 overflow-y-auto">
{categories.map(cat => (
<div key={cat.id} className="flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs">
{editingCatId === cat.id ? (
<div className="flex items-center gap-2 w-full">
<input type="text" value={editingCatName} onChange={e => setEditingCatName(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white w-full" />
<button onClick={() => handleSaveCategoryEdit(cat.id)} className="text-emerald-400 font-bold px-1">ذخیره</button>
<button onClick={() => setEditingCatId(null)} className="text-slate-400 px-1">انصراف</button>
</div>
) : (
<>
<span className="text-slate-200">{cat.name}</span>
<div className="flex gap-2">
<button onClick={() => handleEditCategory(cat)} className="text-amber-400 hover:underline">ویرایش</button>
<button onClick={() => handleDeleteCategory(cat.id)} className="text-rose-400 hover:underline">حذف</button>
</div>
</>
)}
</div>
))}
</div>
</div>
</div>

{/* Add Product Section */}
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
<h3 className="text-md font-bold text-emerald-400 border-b border-slate-800 pb-2">ثبت کالای جدید در انبار</h3>
<form onSubmit={handleAddProduct} className="space-y-3">
<input required type="text" placeholder="نام کالا" value={prodName} onChange={e => setProdName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
<select required value={prodCatId} onChange={e => setProdCatId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
<option value="">انتخاب دسته‌بندی</option>
{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
</select>
<div className="grid grid-cols-2 gap-2">
<input required type="number" placeholder="قیمت خرید (تومان)" value={prodBuyPrice} onChange={e => setProdBuyPrice(e.target.value ? Number(e.target.value) : '')} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
<input required type="number" placeholder="قیمت فروش (تومان)" value={prodSellPrice} onChange={e => setProdSellPrice(e.target.value ? Number(e.target.value) : '')} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
</div>
<div className="grid grid-cols-2 gap-2">
<input required type="number" placeholder="موجودی اولیه" value={prodStock} onChange={e => setProdStock(e.target.value ? Number(e.target.value) : '')} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
<input type="number" placeholder="حد هشدار کمبود" value={prodAlert} onChange={e => setProdAlert(e.target.value ? Number(e.target.value) : '')} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
</div>
<button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold">افزودن به انبار</button>
</form>
</div>
</div>

{/* Product List Table */}
<div className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col">
<div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
<h3 className="text-md font-bold text-slate-200">موجودی کالاها</h3>
<div className="flex items-center gap-2">
<span className="text-xs text-slate-400">مرتب‌سازی:</span>
<select value={prodSortBy} onChange={e => setProdSortBy(e.target.value as any)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
<option value="name">نام کالا</option>
<option value="stock">موجودی</option>
<option value="price">قیمت فروش</option>
</select>
</div>
</div>

<div className="overflow-x-auto flex-1">
<table className="w-full text-right text-sm text-slate-300">
<thead className="bg-slate-800 text-xs text-slate-400">
<tr>
<th className="p-3">نام کالا</th>
<th className="p-3">دسته</th>
<th className="p-3">خرید</th>
<th className="p-3">فروش</th>
<th className="p-3">موجودی</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-800">
{sortedProducts.map(p => {
const cat = categories.find(c => c.id === p.categoryId);
const isLow = p.stock <= p.minStockAlert;
return (
<tr key={p.id} className="hover:bg-slate-800/40">
<td className="p-3 font-medium text-white">{p.name}</td>
<td className="p-3 text-xs text-slate-400">{cat?.name || '-'}</td>
<td className="p-3">{p.buyPrice.toLocaleString()}</td>
<td className="p-3 text-emerald-400">{p.sellPrice.toLocaleString()}</td>
<td className="p-3">
<span className={`px-2 py-0.5 rounded-md text-xs font-bold ${isLow ? 'bg-rose-950 text-rose-400 border border-rose-800/60' : 'bg-slate-800 text-slate-300'}`}>
{p.stock}
</span>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
</div>
</div>
)}

{/* TAB 2: CUSTOMERS */}
{activeTab === 'customers' && (
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
<h3 className="text-md font-bold text-blue-400 border-b border-slate-800 pb-2">ثبت خریدار جدید</h3>
<form onSubmit={handleAddCustomer} className="space-y-3">
<input required type="text" placeholder="نام و نام خانوادگی" value={custName} onChange={e => setCustName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
<input type="text" placeholder="شماره تماس" value={custPhone} onChange={e => setCustPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
<textarea placeholder="آدرس" value={custAddress} onChange={e => setCustAddress(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white h-20" />
<button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold">ثبت خریدار</button>
</form>
</div>

<div className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800">
<h3 className="text-md font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4">لیست خریداران</h3>
<table className="w-full text-right text-sm text-slate-300">
<thead className="bg-slate-800 text-xs text-slate-400">
<tr>
<th className="p-3">نام خریدار</th>
<th className="p-3">شماره تماس</th>
<th className="p-3">آدرس</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-800">
{customers.map(c => (
<tr key={c.id}>
<td className="p-3 font-medium text-white">{c.name}</td>
<td className="p-3 text-xs text-slate-400">{c.phone || '-'}</td>
<td className="p-3 text-xs text-slate-400">{c.address || '-'}</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)}

{/* TAB 3: SALES */}
{activeTab === 'sales' && (
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div className="lg:col-span-2 space-y-6">
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
<h3 className="text-md font-bold text-slate-200 mb-3">انتخاب کالاها برای فاکتور</h3>
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
{products.map(p => (
<button key={p.id} onClick={() => addToCart(p)} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700/60 text-right space-y-1 transition-all">
<p className="font-bold text-sm text-white">{p.name}</p>
<p className="text-xs text-emerald-400">{p.sellPrice.toLocaleString()} تومان</p>
<p className="text-[10px] text-slate-400">موجودی: {p.stock}</p>
</button>
))}
</div>
</div>
</div>

{/* Cart & Checkout */}
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
<h3 className="text-md font-bold text-blue-400 border-b border-slate-800 pb-2">سبد خرید و تنظیمات پرداخت</h3>

{/* Items List */}
<div className="space-y-2 max-h-40 overflow-y-auto">
{cart.map(item => (
<div key={item.product.id} className="flex justify-between items-center bg-slate-800 p-2 rounded-xl text-xs">
<div>
<p className="font-bold text-white">{item.product.name}</p>
<p className="text-slate-400">{item.quantity} عدد × {item.product.sellPrice.toLocaleString()}</p>
</div>
<button onClick={() => removeFromCart(item.product.id)} className="text-rose-400 font-bold px-2">✕</button>
</div>
))}
</div>

{/* Customer Select */}
<div>
<label className="block text-xs text-slate-400 mb-1">انتخاب خریدار</label>
<select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
</select>
</div>

{/* Payment Type */}
<div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl">
<button onClick={() => setPaymentType('cash')} className={`py-1.5 text-xs font-bold rounded-lg ${paymentType === 'cash' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>نقدی</button>
<button onClick={() => setPaymentType('installment')} className={`py-1.5 text-xs font-bold rounded-lg ${paymentType === 'installment' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>اقساطی</button>
<button onClick={() => setPaymentType('cheque')} className={`py-1.5 text-xs font-bold rounded-lg ${paymentType === 'cheque' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>چکی</button>
</div>

{/* Cheque Specific Inputs */}
{paymentType === 'cheque' && (
<div className="space-y-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
<input type="number" placeholder="مبلغ پیش‌پرداخت (تومان)" value={chequeDownPayment} onChange={e => setChequeDownPayment(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
<input type="text" placeholder="نام بانک" value={chequeBank} onChange={e => setChequeBank(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
<input type="text" placeholder="شماره صیادی / چک" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
<input type="number" placeholder="درصد سود / افزایش قیمت" value={chequeInterestPercent} onChange={e => setChequeInterestPercent(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />

{/* Shamsi Date Inputs */}
<div className="space-y-1">
<label className="block text-[11px] text-amber-400">تاریخ سررسید چک (شمسی):</label>
<div className="grid grid-cols-3 gap-1">
<input type="text" placeholder="سال (۱۴۰۵)" value={chequeYear} onChange={e => setChequeYear(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center" />
<input type="text" placeholder="ماه (۰۶)" value={chequeMonth} onChange={e => setChequeMonth(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center" />
<input type="text" placeholder="روز (۱۹)" value={chequeDay} onChange={e => setChequeDay(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-center" />
</div>
</div>
</div>
)}

{/* Installment Specific Inputs */}
{paymentType === 'installment' && (
<div className="space-y-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
<input type="number" placeholder="مبلغ پیش‌پرداخت (تومان)" value={instDownPayment} onChange={e => setInstDownPayment(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
<div className="grid grid-cols-2 gap-2">
<input type="number" placeholder="تعداد اقساط (ماه)" value={instMonths} onChange={e => setInstMonths(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
<input type="number" placeholder="درصد سود" value={instInterestPercent} onChange={e => setInstInterestPercent(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
</div>
</div>
)}

{/* Total Calculation Display */}
<div className="border-t border-slate-800 pt-3 space-y-1">
<div className="flex justify-between text-xs text-slate-400">
<span>جمع اولیه:</span>
<span>{cartBaseTotal.toLocaleString()} تومان</span>
</div>
<div className="flex justify-between text-sm font-bold text-emerald-400">
<span>جمع نهایی فاکتور:</span>
<span>{calculatedInvoiceTotal.toLocaleString()} تومان</span>
</div>
</div>

<button onClick={handleCompleteSale} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white transition-colors">
ثبت نهایی فاکتور فروش
</button>
</div>
</div>
)}

{/* TAB 4: CHEQUES & INSTALLMENTS */}
{activeTab === 'cheques' && (
<div className="space-y-4">
<div className="flex gap-2 border-b border-slate-800 pb-3">
<button onClick={() => setChequeSubTab('active')} className={`px-4 py-1.5 rounded-xl text-xs font-bold ${chequeSubTab === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
موارد فعال (سررسید نزدیک)
</button>
<button onClick={() => setChequeSubTab('archived')} className={`px-4 py-1.5 rounded-xl text-xs font-bold ${chequeSubTab === 'archived' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
بخش بایگانی
</button>
</div>

<div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
<table className="w-full text-right text-sm text-slate-300">
<thead className="bg-slate-800 text-xs text-slate-400">
<tr>
<th className="p-3">مبلغ</th>
<th className="p-3">تاریخ سررسید</th>
<th className="p-3">مشخصات بانک / صیادی</th>
<th className="p-3">وضعیت / تاریخ تسویه</th>
<th className="p-3">عملیات</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-800">
{sales.filter(s => s.paymentType !== 'cash' && (chequeSubTab === 'active' ? s.status !== 'archived' : s.status === 'archived')).map(s => (
<tr key={s.id}>
<td className="p-3 font-bold text-emerald-400">{s.totalAmount.toLocaleString()} تومان</td>
<td className="p-3">{s.dueDateShamsi || s.shamsiDate}</td>
<td className="p-3 text-xs text-slate-400">{s.bankName ? `${s.bankName} (${s.chequeNumber || '-'})` : '-'}</td>
<td className="p-3 text-xs">
{s.status === 'archived' ? (
<span className="text-emerald-400 font-bold">تسویه شده ({s.settlingDate})</span>
) : (
<span className="text-amber-400 font-bold">در انتظار پرداخت</span>
)}
</td>
<td className="p-3">
{s.status !== 'archived' ? (
<button onClick={() => handleSettleAndArchive(s.id)} className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-600/40 rounded-lg text-xs font-bold">
تسویه و بایگانی
</button>
) : (
<button onClick={() => handleUnarchive(s.id)} className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-700">
خروج از بایگانی
</button>
)}
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)}

{/* TAB 5: BULK PRICE ADJUSTMENT */}
{activeTab === 'bulk_price' && (
<div className="max-w-xl mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
<h3 className="text-md font-bold text-amber-400 border-b border-slate-800 pb-3">تغییر قیمت دسته‌ای محصولات</h3>
<form onSubmit={handleApplyBulkPrice} className="space-y-4">
<div>
<label className="block text-xs text-slate-400 mb-1">انتخاب دسته‌بندی</label>
<select value={bulkCatId} onChange={e => setBulkCatId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
<option value="all">همه دسته‌ها</option>
{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
</select>
</div>

<div className="grid grid-cols-2 gap-2">
<div>
<label className="block text-xs text-slate-400 mb-1">نوع تغییر</label>
<select value={adjustType} onChange={e => setAdjustType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
<option value="percent">درصدی (%)</option>
<option value="amount">مبلغ ثابت (تومان)</option>
</select>
</div>
<div>
<label className="block text-xs text-slate-400 mb-1">جهت تغییر</label>
<select value={adjustDirection} onChange={e => setAdjustDirection(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
<option value="increase">افزایش قیمت</option>
<option value="decrease">کاهش قیمت</option>
</select>
</div>
</div>

<div>
<label className="block text-xs text-slate-400 mb-1">مقدار تغییر</label>
<input required type="number" placeholder="مثلاً ۲۰" value={adjustValue} onChange={e => setAdjustValue(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
</div>

<button type="submit" className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-white transition-colors">
اعمال تغییر قیمت
</button>
</form>
</div>
)}

{/* TAB 6: REPORTS */}
{activeTab === 'reports' && (
<div className="space-y-6">
<div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
<h3 className="text-md font-bold text-slate-200">گزارشات کامل مالی، فروش و سود و زیان</h3>
<div className="flex items-center gap-2">
<button onClick={() => setReportRange('day')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${reportRange === 'day' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>روزانه</button>
<button onClick={() => setReportRange('week')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${reportRange === 'week' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>هفتگی</button>
<button onClick={() => setReportRange('month')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${reportRange === 'month' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>ماهانه</button>
<button onClick={() => setReportRange('custom')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${reportRange === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>بازه‌ی دلخواه</button>
</div>
</div>

{/* Metrics */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
<p className="text-xs text-slate-400 mb-1">مجموع کل فروش</p>
<p className="text-2xl font-black text-emerald-400">{totalSalesAmount.toLocaleString()} تومان</p>
</div>
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
<p className="text-xs text-slate-400 mb-1">سود خالص کل (بر اساس ورودی واقعی روز)</p>
<p className="text-2xl font-black text-blue-400">{totalNetProfit.toLocaleString()} تومان</p>
</div>
</div>

{/* Transactions History Table */}
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
<h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-800 pb-2">تاریخچه فاکتورهای فروش</h4>
<table className="w-full text-right text-sm text-slate-300">
<thead className="bg-slate-800 text-xs text-slate-400">
<tr>
<th className="p-3">تاریخ</th>
<th className="p-3">نام خریدار</th>
<th className="p-3">نوع پرداخت</th>
<th className="p-3">مبلغ کل</th>
<th className="p-3">سود فاکتور</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-800">
{filteredSales.map(s => (
<tr key={s.id}>
<td className="p-3 text-xs text-slate-400">{s.shamsiDate}</td>
<td className="p-3 font-medium text-white">{s.customerName}</td>
<td className="p-3 text-xs">
{s.paymentType === 'cash' && <span className="text-emerald-400">نقدی</span>}
{s.paymentType === 'installment' && <span className="text-amber-400">اقساطی</span>}
{s.paymentType === 'cheque' && <span className="text-blue-400">چکی</span>}
</td>
<td className="p-3">{s.totalAmount.toLocaleString()} تومان</td>
<td className="p-3 text-emerald-400">{s.profit.toLocaleString()} تومان</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)}
</main>
</div>
);
}
