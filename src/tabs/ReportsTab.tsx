import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Sale, PaymentItem } from '../types'
import { formatJalali } from '../lib/jalali'
import JalaliDateInput from '../components/JalaliDateInput'

type Period = 'day' | 'week' | 'month' | 'year' | 'custom'
type SortField = 'sale_date' | 'customer_name' | 'product_name' | 'payment_type' | 'total_amount' | 'down_payment' | 'profit_amount'

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
        .from('sales').select('*').eq('user_id', userId)
        .gte('sale_date', fromDate).lte('sale_date', toDate)
      setSales((s as Sale[]) || [])

      const { data: items } = await supabase
        .from('payment_items').select('*, sales(total_amount, profit_amount)')
        .eq('user_id', userId).eq('is_archived', true)
        .gte('settled_at', fromDate).lte('settled_at', toDate + 'T23:59:59')
      setSettledItems((items as SettledItem[]) || [])
    }
    load()
  }, [userId, fromDate, toDate])

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

  const [sortField, setSortField] = useState<SortField>('sale_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }
  const sortedSales = [...sales].sort((a, b) => {
    const va = a[sortField]
    const vb = b[sortField]
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? cmp : -cmp
  })

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

      <section id="printable-report" className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h2 className="text-white font-bold">تاریخچه فاکتورهای فروش</h2>
          <button onClick={() => window.print()} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg">چاپ گزارش</button>
        </div>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; inset: 0; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                {([
                  ['sale_date', 'تاریخ'],
                  ['customer_name', 'مشتری'],
                  ['product_name', 'کالا'],
                  ['payment_type', 'نوع پرداخت'],
                  ['total_amount', 'مبلغ کل'],
                  ['down_payment', 'پیش‌پرداخت/دریافتی'],
                  ['profit_amount', 'سود فاکتور'],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th key={field} className="p-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(field)}>
                    {label} {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSales.map((s) => (
                <tr key={s.id} className="border-b border-slate-800/50">
                  <td className="p-2 text-slate-400 text-xs whitespace-nowrap">{s.sale_shamsi || formatJalali(s.sale_date)}</td>
                  <td className="p-2 text-white">{s.customer_name}</td>
                  <td className="p-2 text-slate-300">{s.product_name}{s.quantity > 1 ? ` × ${s.quantity}` : ''}</td>
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
              {sales.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-500">در این بازه فاکتوری ثبت نشده است.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
