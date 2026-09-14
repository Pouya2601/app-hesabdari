import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Customer, Product, PaymentType } from '../types'
import JalaliDateInput from '../components/JalaliDateInput'
import { formatJalali, addDaysISO } from '../lib/jalali'

export default function NewSaleTab({ userId }: { userId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')

  const todayISO = new Date().toISOString().slice(0, 10)
  const [saleDateISO, setSaleDateISO] = useState(todayISO)

  // فیلدهای اقساط
  const [downPayment, setDownPayment] = useState('0')
  const [profitPercent, setProfitPercent] = useState('0')
  const [installmentCount, setInstallmentCount] = useState('1')
  const [intervalDays, setIntervalDays] = useState('30')

  // فیلدهای چک
  const [chequeDueISO, setChequeDueISO] = useState(todayISO)
  const [bankName, setBankName] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')

  const [preview, setPreview] = useState<{ base: number; total: number; profit: number; remaining: number } | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const { data: c } = await supabase.from('customers').select('*').eq('user_id', userId).order('sort_order')
    const { data: p } = await supabase.from('products').select('*').eq('user_id', userId).order('sort_order')
    setCustomers((c as Customer[]) || [])
    setProducts((p as Product[]) || [])
  }
  useEffect(() => { load() }, [userId])

  const product = products.find((p) => p.id === productId)
  const qty = Number(quantity) || 0

  const calc = () => {
    setError('')
    if (!product) { setError('یک کالا انتخاب کنید.'); return }
    if (qty <= 0) { setError('تعداد باید بزرگتر از صفر باشد.'); return }
    const base = product.sell_price * qty
    if (paymentType === 'cash') {
      setPreview({ base, total: base, profit: (product.sell_price - product.buy_price) * qty, remaining: 0 })
    } else {
      const pct = Number(profitPercent) || 0
      const total = Math.round(base * (1 + pct / 100))
      const dp = Number(downPayment) || 0
      const remaining = total - dp
      const profit = total - product.buy_price * qty
      setPreview({ base, total, profit, remaining })
    }
  }

  const resetForm = () => {
    setCustomerId(''); setProductId(''); setQuantity('1'); setPaymentType('cash')
    setDownPayment('0'); setProfitPercent('0'); setInstallmentCount('1'); setIntervalDays('30')
    setBankName(''); setChequeNumber(''); setPreview(null)
    setSaleDateISO(todayISO); setChequeDueISO(todayISO)
  }

  const submit = async () => {
    if (!preview || !product) return
    setError(''); setSuccess(''); setSubmitting(true)
    const customer = customers.find((c) => c.id === customerId)
    const dp = paymentType === 'cash' ? preview.total : Number(downPayment) || 0

    const { data: sale, error: saleError } = await supabase.from('sales').insert({
      user_id: userId,
      customer_id: customerId || null,
      customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'مشتری متفرقه',
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      base_amount: preview.base,
      profit_percent: paymentType === 'cash' ? 0 : Number(profitPercent) || 0,
      total_amount: preview.total,
      profit_amount: preview.profit,
      payment_type: paymentType,
      down_payment: dp,
      installment_count: paymentType === 'installment' ? Number(installmentCount) : null,
      installment_interval_days: paymentType === 'installment' ? Number(intervalDays) : null,
      cheque_bank_name: paymentType === 'cheque' ? bankName : null,
      cheque_number: paymentType === 'cheque' ? chequeNumber : null,
      cheque_due_date: paymentType === 'cheque' ? chequeDueISO : null,
      sale_date: saleDateISO,
      sale_shamsi: formatJalali(saleDateISO),
    }).select().single()

    if (saleError || !sale) { setError('خطا در ثبت فاکتور: ' + saleError?.message); setSubmitting(false); return }

    // کاهش موجودی انبار
    await supabase.from('products').update({ stock_qty: product.stock_qty - qty }).eq('id', product.id)

    // ثبت بدهی مشتری در صورت وجود مانده
    if (customer && preview.remaining > 0) {
      const currentDebt = customer.balance_type === 'debtor' ? customer.balance_amount : 0
      await supabase.from('customers').update({
        balance_type: 'debtor',
        balance_amount: currentDebt + preview.remaining,
      }).eq('id', customer.id)
    }

    // ساخت اقساط یا سند چک
    if (paymentType === 'installment') {
      const count = Number(installmentCount) || 1
      const interval = Number(intervalDays) || 30
      const per = Math.floor(preview.remaining / count)
      const rows = Array.from({ length: count }, (_, i) => {
        const isLast = i === count - 1
        const amount = isLast ? preview.remaining - per * (count - 1) : per
        return {
          user_id: userId, sale_id: sale.id, type: 'installment' as const,
          sequence_no: i + 1, due_date: addDaysISO(saleDateISO, interval * (i + 1)),
          amount, bank_name: null, cheque_number: null, is_archived: false,
        }
      })
      await supabase.from('payment_items').insert(rows)
    } else if (paymentType === 'cheque') {
      await supabase.from('payment_items').insert({
        user_id: userId, sale_id: sale.id, type: 'cheque', sequence_no: 1,
        due_date: chequeDueISO, amount: preview.remaining, bank_name: bankName,
        cheque_number: chequeNumber, is_archived: false,
      })
    }

    setSuccess('فاکتور با موفقیت ثبت شد.')
    setSubmitting(false)
    resetForm()
    load()
  }

  return (
    <div className="max-w-2xl space-y-5">
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3">{success}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2">
            <option value="">مشتری متفرقه (بدون ثبت در دفتر)</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
          <select value={productId} onChange={(e) => { setProductId(e.target.value); setPreview(null) }} className="bg-slate-800 text-white rounded-lg p-2">
            <option value="">انتخاب کالا</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (موجودی: {p.stock_qty})</option>)}
          </select>
          <input type="number" min={1} placeholder="تعداد" value={quantity} onChange={(e) => { setQuantity(e.target.value); setPreview(null) }}
            className="bg-slate-800 text-white rounded-lg p-2" />
          <JalaliDateInput valueISO={saleDateISO} onChange={setSaleDateISO} label="تاریخ فروش" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['cash', 'installment', 'cheque'] as PaymentType[]).map((pt) => (
            <button key={pt} type="button" onClick={() => { setPaymentType(pt); setPreview(null) }}
              className={`min-w-0 py-2 px-1 rounded-lg text-xs sm:text-sm font-medium truncate ${paymentType === pt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {pt === 'cash' ? 'نقدی' : pt === 'installment' ? 'اقساطی' : 'چکی'}
            </button>
          ))}
        </div>

        {paymentType === 'installment' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="number" placeholder="پیش‌پرداخت" value={downPayment} onChange={(e) => { setDownPayment(e.target.value); setPreview(null) }} className="bg-slate-800 text-white rounded-lg p-2" />
            <input type="number" placeholder="درصد سود" value={profitPercent} onChange={(e) => { setProfitPercent(e.target.value); setPreview(null) }} className="bg-slate-800 text-white rounded-lg p-2" />
            <input type="number" placeholder="تعداد اقساط" value={installmentCount} onChange={(e) => { setInstallmentCount(e.target.value); setPreview(null) }} className="bg-slate-800 text-white rounded-lg p-2" />
            <input type="number" placeholder="فاصله روزهای پرداخت هر قسط" value={intervalDays} onChange={(e) => { setIntervalDays(e.target.value); setPreview(null) }} className="bg-slate-800 text-white rounded-lg p-2" />
          </div>
        )}

        {paymentType === 'cheque' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="number" placeholder="پیش‌پرداخت" value={downPayment} onChange={(e) => { setDownPayment(e.target.value); setPreview(null) }} className="bg-slate-800 text-white rounded-lg p-2" />
            <input type="number" placeholder="درصد سود" value={profitPercent} onChange={(e) => { setProfitPercent(e.target.value); setPreview(null) }} className="bg-slate-800 text-white rounded-lg p-2" />
            <input placeholder="نام بانک" value={bankName} onChange={(e) => setBankName(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
            <input placeholder="شماره چک" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
            <div className="col-span-2">
              <JalaliDateInput valueISO={chequeDueISO} onChange={setChequeDueISO} label="تاریخ سررسید چک" />
            </div>
          </div>
        )}

        <button type="button" onClick={calc} className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 text-sm">
          محاسبه مبلغ نهایی
        </button>

        {preview && (
          <div className="bg-slate-800/60 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-300"><span>مبلغ پایه</span><span>{preview.base.toLocaleString()} تومان</span></div>
            <div className="flex justify-between text-white font-bold"><span>مبلغ نهایی فاکتور</span><span>{preview.total.toLocaleString()} تومان</span></div>
            {paymentType !== 'cash' && <div className="flex justify-between text-slate-300"><span>باقی‌مانده پس از پیش‌پرداخت</span><span>{preview.remaining.toLocaleString()} تومان</span></div>}
            <div className="flex justify-between text-emerald-400"><span>سود این فاکتور</span><span>{preview.profit.toLocaleString()} تومان</span></div>
          </div>
        )}

        <button type="button" disabled={!preview || submitting} onClick={submit}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg py-3 font-medium">
          {submitting ? 'در حال ثبت...' : 'ثبت فاکتور'}
        </button>
      </div>
    </div>
  )
}
