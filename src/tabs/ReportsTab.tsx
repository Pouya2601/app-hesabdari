import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Sale, PaymentItem } from '../types'
import { formatJalali } from '../lib/jalali'
import JalaliDateInput from '../components/JalaliDateInput'

type Period = 'day' | 'week' | 'month' | 'year' | 'custom'

interface SettledItem extends PaymentItem {
  sales?: { total_amount: number; profit_amount: number }
}

function isoDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function ReportsTab({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>('day')
  const [fromDate, setFromDate] = useState(isoDaysAgo(0))
  const [toDate, setToDate] = useState(isoDaysAgo(0))
  const [sales, setSales] = useState<Sale[]>([])
  const [settledItems, setSettledItems] = useState<SettledItem[]>([])

  useEffect(() => {
    const today = isoDaysAgo(0)
    if (period === 'day') { setFromDate(today); setToDate(today) }
    if (period === 'week') { setFromDate(isoDaysAgo(6)); setToDate(today) }
    if (period === 'month') { setFromDate(isoDaysAgo(29)); setToDate(today) }
    if (period === 'year') { setFromDate(isoDaysAgo(364)); setToDate(today) }
  }, [period])

useEffect(() => {
const load = async () => {
const { data: s } = await supabase
.from('sales')
.select('*')
.eq('user_id', userID)
.gte('sale_date', fromDate)
.lte('sale_date', toDate);

setSales((s as Sale[]) || []);

const { data: items } = await supabase
.from('payment_items')
.select('*, sales(total_amount, profit_amount, sale_date, customer_name, payment_type, down_payment)')
.eq('user_id', userID)
.eq('is_archived', true)
.gte('settled_at', fromDate)
.lte('settled_at', toDate + 'T23:59:59');

setSettledItems((items as SettledItem[]) || []);
}
load()
}, [userID, fromDate, toDate]);

  const totalInvoiced = sales.reduce((sum, s) => sum + s.total_amount, 0)
  const totalProfitInvoiced = sales.reduce((sum, s) => sum + s.profit_amount, 0)

  // فقط پیش‌پرداخت فروش‌های چکی/اقساطی در محاسبه دریافتی روز لحاظ می‌شود، نه کل مبلغ فاکتور
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
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm truncate ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            {p === 'day' ? 'روزانه' : p === 'week' ? 'هفتگی' : p === 'month' ? 'ماهانه' : p === 'year' ? 'سالانه' : 'بازه دلخواه'}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <JalaliDateInput valueISO={fromDate} onChange={(iso) => setFromDate(iso < isoDaysAgo(365) ? isoDaysAgo(365) : iso)} label="از تاریخ (حداکثر تا یک سال قبل)" />
          <JalaliDateInput valueISO={toDate} onChange={(iso) => setToDate(iso > isoDaysAgo(0) ? isoDaysAgo(0) : iso)} label="تا تاریخ" />
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
        <h2 className="text-white font-bold mb-4">تاریخچه فاکتورهای فروش</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2">تاریخ</th><th className="p-2">مشتری</th><th className="p-2">نوع پرداخت</th>
                <th className="p-2">مبلغ کل</th><th className="p-2">پیش‌پرداخت/دریافتی</th><th className="p-2">سود فاکتور</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-slate-800/50">
                  <td className="p-2 text-slate-400 text-xs">{s.sale_shamsi || formatJalali(s.sale_date)}</td>
                  <td className="p-2 text-white">{s.customer_name}</td>
                  <td className="p-2 text-xs">
                    {s.payment_type === 'cash' && <span className="text-emerald-400">نقدی</span>}
                    {s.payment_type === 'installment' && <span className="text-amber-400">اقساطی</span>}
                    {s.payment_type === 'cheque' && <span className="text-blue-400">چکی</span>}
                  </td>
                  <td className="p-2 text-slate-300">{s.total_amount.toLocaleString()}</td>
                  <td className="p-2 text-slate-300">{(s.payment_type === 'cash' ? s.total_amount : s.down_payment).toLocaleString()}</td>
                  <td className="p-2 text-emerald-400">{s.profit_amount.toLocaleString()}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">در این بازه فاکتوری ثبت نشده است.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
