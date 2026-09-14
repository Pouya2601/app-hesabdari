import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Sale, PaymentItem } from '../types'
import { formatJalali } from '../lib/jalali'
import JalaliDateInput from '../components/JalaliDateInput'

type Period = 'day' | 'week' | 'month' | 'year' | 'custom'

interface SettledItem extends PaymentItem {
sales?: { total_amount: number; profit_amount: number; sale_date: string; sale_shamsi?: string; customer_name: string; payment_type: string; down_payment: number }
}

function getTodayISO(): string {
const d = new Date()
return d.toISOString().slice(0, 10)
}

function subDaysISO(n: number): string {
const d = new Date()
d.setDate(d.getDate() - n)
return d.toISOString().slice(0, 10)
}

export default function ReportsTab({ userID }: { userID: string }) {
const [period, setPeriod] = useState<Period>('day')
const [fromDate, setFromDate] = useState(getTodayISO())
const [toDate, setToDate] = useState(getTodayISO())
const [sales, setSales] = useState<Sale[]>([])
const [settledItems, setSettledItems] = useState<SettledItem[]>([])

useEffect(() => {
const today = getTodayISO()
if (period === 'day') { setFromDate(today); setToDate(today) }
if (period === 'week') { setFromDate(subDaysISO(6)); setToDate(today) }
if (period === 'month') { setFromDate(subDaysISO(29)); setToDate(today) }
if (period === 'year') { setFromDate(subDaysISO(364)); setToDate(today) }
}, [period])

useEffect(() => {
const load = async () => {
const { data: s } = await supabase
.from('sales')
.select('*')
.eq('user_id', userID)
.gte('sale_date', fromDate)
.lte('sale_date', toDate)

setSales((s as Sale[]) || [])

const { data: items } = await supabase
.from('payment_items')
.select('*, sales(total_amount, profit_amount, sale_date, sale_shamsi, customer_name, payment_type, down_payment)')
.eq('user_id', userID)
.eq('is_archived', true)
.gte('settled_at', fromDate)
.lte('settled_at', toDate + 'T23:59:59')

setSettledItems((items as SettledItem[]) || [])
}
if (userID) {
load()
}
}, [userID, fromDate, toDate])

const totalInvoiced = sales.reduce((sum, s) => sum + s.total_amount, 0)
const totalProfitInvoiced = sales.reduce((sum, s) => sum + s.profit_amount, 0)

const cashInFromSales = sales.reduce((sum, s) => sum + (s.payment_type === 'cash' ? s.total_amount : s.down_payment), 0)
const cashInFromSettled = settledItems.reduce((sum, it) => sum + it.amount, 0)
const actualCashIn = cashInFromSales + cashInFromSettled

const profitInFromSales = sales.reduce((sum, s) => {
if (s.payment_type === 'cash') return sum + s.profit_amount
if (s.total_amount === 0) return sum
return sum + s.profit_amount * (s.down_payment / s.total_amount)
}, 0)

const profitInFromSettled = settledItems.reduce((sum, it) => {
const saleTotal = it.sales?.total_amount || 0
const saleProfit = it.sales?.profit_amount || 0
if (!saleTotal) return sum
return sum + saleProfit * (it.amount / saleTotal)
}, 0)

const actualProfitIn = profitInFromSales + profitInFromSettled

return (
<div className="space-y-6">
<div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
{(['day', 'week', 'month', 'year', 'custom'] as Period[]).map((p) => (
<button
key={p}
onClick={() => setPeriod(p)}
className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm truncate ${
period === p ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
}`}
>
{p === 'day' ? 'روزانه' : p === 'week' ? 'هفتگی' : p === 'month' ? 'ماهانه' : p === 'year' ? 'سالانه' : 'بازه دلخواه'}
</button>
))}
</div>

{period === 'custom' && (
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<JalaliDateInput valueISO={fromDate} onChange={(iso) => setFromDate(iso)} label="از تاریخ" />
<JalaliDateInput valueISO={toDate} onChange={(iso) => setToDate(iso)} label="تا تاریخ" />
</div>
)}

<p className="text-sm text-slate-400">بازه: {formatJalali(fromDate)} تا {formatJalali(toDate)}</p>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
<p className="text-xs text-slate-400 mb-1">مجموع فروش (فاکتور)</p>
<p className="text-white font-bold text-lg">{totalInvoiced.toLocaleString()} تومان</p>
</div>
<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
<p className="text-xs text-slate-400 mb-1">سود کل فاکتورشده</p>
<p className="text-emerald-400 font-bold text-lg">{totalProfitInvoiced.toLocaleString()} تومان</p>
</div>
<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 ring-1 ring-blue-500/40">
<p className="text-xs text-slate-400 mb-1">مبلغ دقیق دریافتی (نقد شده)</p>
<p className="text-blue-400 font-bold text-lg">{actualCashIn.toLocaleString()} تومان</p>
</div>
<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 ring-1 ring-emerald-500/40">
<p className="text-xs text-slate-400 mb-1">سود واقعی محقق‌شده</p>
<p className="text-emerald-400 font-bold text-lg">{Math.round(actualProfitIn).toLocaleString()} تومان</p>
</div>
</div>

<section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
<h2 className="text-white font-bold mb-4">تاریخچه فاکتورها و پرداختی‌های این بازه</h2>
<div className="overflow-x-auto">
<table className="w-full text-sm text-right">
<thead>
<tr className="text-slate-400 border-b border-slate-800">
<th className="p-2">تاریخ</th>
<th className="p-2">مشتری</th>
<th className="p-2">نوع</th>
<th className="p-2">مبلغ کل / قسط</th>
<th className="p-2">مبلغ دریافتی</th>
<th className="p-2">سود محقق‌شده</th>
</tr>
</thead>
<tbody>
{sales.map((s) => (
<tr key={`sale-${s.id}`} className="border-b border-slate-800/50">
<td className="p-2 text-slate-400 text-xs">{s.sale_shamsi || formatJalali(s.sale_date)}</td>
<td className="p-2 text-white">{s.customer_name}</td>
<td className="p-2 text-xs">
{s.payment_type === 'cash' && <span className="text-emerald-400">فاکتور نقدی</span>}
{s.payment_type === 'installment' && <span className="text-amber-400">فاکتور اقساطی</span>}
{s.payment_type === 'cheque' && <span className="text-blue-400">فاکتور چکی</span>}
</td>
<td className="p-2 text-slate-300">{s.total_amount.toLocaleString()}</td>
<td className="p-2 text-slate-300">{(s.payment_type === 'cash' ? s.total_amount : s.down_payment).toLocaleString()}</td>
<td className="p-2 text-emerald-400">{s.payment_type === 'cash' ? s.profit_amount.toLocaleString() : Math.round(s.profit_amount * (s.down_payment / (s.total_amount || 1))).toLocaleString()}</td>
</tr>
))}

{settledItems.map((it) => {
const saleTotal = it.sales?.total_amount || 1
const saleProfit = it.sales?.profit_amount || 0
const itemProfit = Math.round(saleProfit * (it.amount / saleTotal))
return (
<tr key={`settled-${it.id}`} className="border-b border-slate-800/50 bg-slate-800/20">
<td className="p-2 text-slate-400 text-xs">{it.settled_at ? formatJalali(it.settled_at.slice(0, 10)) : '-'}</td>
<td className="p-2 text-white">{it.sales?.customer_name || 'مشتری'}</td>
<td className="p-2 text-xs">
<span className="text-purple-400">{it.type === 'cheque' ? 'چک تسویه‌شده' : 'قسط تسویه‌شده'}</span>
</td>
<td className="p-2 text-slate-300">{saleTotal.toLocaleString()}</td>
<td className="p-2 text-blue-300 font-semibold">{it.amount.toLocaleString()}</td>
<td className="p-2 text-emerald-400">{itemProfit.toLocaleString()}</td>
</tr>
)
})}

{sales.length === 0 && settledItems.length === 0 && (
<tr>
<td colSpan={6} className="p-4 text-center text-slate-500">در این بازه فاکتور یا پرداختی ثبت نشده است</td>
</tr>
)}
</tbody>
</table>
</div>
</section>
</div>
)
}
