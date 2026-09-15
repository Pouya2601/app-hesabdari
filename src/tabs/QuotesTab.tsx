import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Customer, Product, Quote, QuoteItem, PaymentType } from '../types'
import JalaliDateInput from '../components/JalaliDateInput'
import { formatJalali, addDaysISO } from '../lib/jalali'

const todayISO = new Date().toISOString().slice(0, 10)

type DraftItem = { product_id: string; product_name: string; quantity: number; unit_price: number; unit_cost: number }

export default function QuotesTab({ userId }: { userId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [showApproved, setShowApproved] = useState(false)

  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [pickProductId, setPickProductId] = useState('')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [profitPercent, setProfitPercent] = useState('0')
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [approvingQuote, setApprovingQuote] = useState<Quote | null>(null)
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [downPayment, setDownPayment] = useState('0')
  const [installmentCount, setInstallmentCount] = useState('1')
  const [intervalDays, setIntervalDays] = useState('30')
  const [chequeDueISO, setChequeDueISO] = useState(todayISO)
  const [bankName, setBankName] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [saleDateISO, setSaleDateISO] = useState(todayISO)

  const load = async () => {
    const { data: c } = await supabase.from('customers').select('*').eq('user_id', userId).order('sort_order')
    const { data: p } = await supabase.from('products').select('*').eq('user_id', userId).order('sort_order')
    setCustomers((c as Customer[]) || [])
    setProducts((p as Product[]) || [])
    const { data: q } = await supabase.from('quotes').select('*, quote_items(*)').eq('user_id', userId).order('created_at', { ascending: false })
    const list = (q || []).map((row: any) => ({ ...row, items: row.quote_items })) as Quote[]
    setQuotes(list)
  }
  useEffect(() => { load() }, [userId])

  const addItemRow = () => {
    const product = products.find((p) => p.id === pickProductId)
    if (!product) return
    setItems([...items, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.sell_price, unit_cost: product.buy_price }])
    setPickProductId('')
  }
  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems(items.map((it, i) => i === index ? { ...it, ...patch } : it))
  }
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0)
  const afterProfit = subtotal + subtotal * (Number(profitPercent) || 0) / 100
  const total = Math.round(afterProfit - afterProfit * (Number(discountPercent) || 0) / 100)

  const resetForm = () => {
    setCustomerId(''); setItems([]); setPickProductId('')
    setDiscountPercent('0'); setProfitPercent('0'); setEditingQuoteId(null)
  }

  const saveQuote = async () => {
    setError(''); setSuccess('')
    if (items.length === 0) { setError('حداقل یک کالا به پیش‌فاکتور اضافه کنید.'); return }
    const customer = customers.find((c) => c.id === customerId)
    const payload = {
      user_id: userId,
      customer_id: customerId || null,
      customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'مشتری متفرقه',
      status: 'pending' as const,
      discount_percent: Number(discountPercent) || 0,
      profit_percent: Number(profitPercent) || 0,
      subtotal,
      total_amount: total,
      quote_date: todayISO,
      quote_shamsi: formatJalali(todayISO),
    }

    if (editingQuoteId) {
      const { error } = await supabase.from('quotes').update(payload).eq('id', editingQuoteId)
      if (error) { setError(error.message); return }
      await supabase.from('quote_items').delete().eq('quote_id', editingQuoteId)
      await supabase.from('quote_items').insert(items.map((it) => ({
        quote_id: editingQuoteId, user_id: userId, product_id: it.product_id, product_name: it.product_name,
        quantity: it.quantity, unit_price: it.unit_price, unit_cost: it.unit_cost, line_total: it.unit_price * it.quantity,
      })))
    } else {
      const { data: quote, error } = await supabase.from('quotes').insert(payload).select().single()
      if (error || !quote) { setError('خطا در ثبت پیش‌فاکتور: ' + error?.message); return }
      await supabase.from('quote_items').insert(items.map((it) => ({
        quote_id: quote.id, user_id: userId, product_id: it.product_id, product_name: it.product_name,
        quantity: it.quantity, unit_price: it.unit_price, unit_cost: it.unit_cost, line_total: it.unit_price * it.quantity,
      })))
    }

    setSuccess('پیش‌فاکتور ذخیره شد.')
    resetForm()
    load()
  }

  const editQuote = (q: Quote) => {
    setEditingQuoteId(q.id)
    setCustomerId(q.customer_id || '')
    setDiscountPercent(String(q.discount_percent))
    setProfitPercent(String(q.profit_percent))
    setItems((q.items || []).map((it) => ({ product_id: it.product_id || '', product_name: it.product_name, quantity: it.quantity, unit_price: it.unit_price, unit_cost: it.unit_cost })))
  }

  const rejectQuote = async (id: string) => {
    if (!confirm('این پیش‌فاکتور کاملاً حذف شود؟')) return
    await supabase.from('quotes').delete().eq('id', id)
    load()
  }

  const startApprove = (q: Quote) => {
    setApprovingQuote(q)
    setPaymentType('cash'); setDownPayment(String(q.total_amount)); setInstallmentCount('1'); setIntervalDays('30')
    setChequeDueISO(todayISO); setBankName(''); setChequeNumber(''); setSaleDateISO(todayISO)
  }

  const confirmApprove = async () => {
    if (!approvingQuote) return
    const q = approvingQuote
    const items = q.items || []
    const totalCost = items.reduce((sum, it) => sum + it.unit_cost * it.quantity, 0)
    const totalQty = items.reduce((sum, it) => sum + it.quantity, 0)
    const profitAmount = q.total_amount - totalCost
    const productSummary = items.map((it) => `${it.product_name} × ${it.quantity}`).join('، ')
    const customer = customers.find((c) => c.id === q.customer_id)
    const dp = paymentType === 'cash' ? q.total_amount : Number(downPayment) || 0
    const remaining = q.total_amount - dp

    const { data: sale, error } = await supabase.from('sales').insert({
      user_id: userId,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      product_id: null,
      product_name: `پیش‌فاکتور: ${productSummary}`,
      quantity: totalQty,
      base_amount: q.subtotal,
      profit_percent: q.profit_percent,
      total_amount: q.total_amount,
      profit_amount: profitAmount,
      payment_type: paymentType,
      down_payment: dp,
      installment_count: paymentType === 'installment' ? Number(installmentCount) : null,
      installment_interval_days: paymentType === 'installment' ? Number(intervalDays) : null,
      cheque_bank_name: paymentType === 'cheque' ? bankName : null,
      cheque_number: paymentType === 'cheque' ? chequeNumber : null,
      cheque_due_date: paymentType === 'cheque' ? chequeDueISO : null,
      sale_date: saleDateISO,
      sale_shamsi: formatJalali(saleDateISO),
      quote_id: q.id,
    }).select().single()

    if (error || !sale) { setError('خطا در ثبت فروش از پیش‌فاکتور: ' + error?.message); return }

    for (const it of items) {
      if (!it.product_id) continue
      const { data: product } = await supabase.from('products').select('*').eq('id', it.product_id).maybeSingle()
      if (product) await supabase.from('products').update({ stock_qty: product.stock_qty - it.quantity }).eq('id', it.product_id)
    }

    if (customer && remaining > 0) {
      const currentDebt = customer.balance_type === 'debtor' ? customer.balance_amount : 0
      await supabase.from('customers').update({ balance_type: 'debtor', balance_amount: currentDebt + remaining }).eq('id', customer.id)
    }

    if (paymentType === 'installment') {
      const count = Number(installmentCount) || 1
      const interval = Number(intervalDays) || 30
      const per = Math.floor(remaining / count)
      const rows = Array.from({ length: count }, (_, i) => {
        const isLast = i === count - 1
        return {
          user_id: userId, sale_id: sale.id, type: 'installment' as const, sequence_no: i + 1,
          due_date: addDaysISO(saleDateISO, interval * (i + 1)), amount: isLast ? remaining - per * (count - 1) : per,
          bank_name: null, cheque_number: null, is_archived: false,
        }
      })
      await supabase.from('payment_items').insert(rows)
    } else if (paymentType === 'cheque') {
      await supabase.from('payment_items').insert({
        user_id: userId, sale_id: sale.id, type: 'cheque', sequence_no: 1, due_date: chequeDueISO,
        amount: remaining, bank_name: bankName, cheque_number: chequeNumber, is_archived: false,
      })
    }

    await supabase.from('quotes').update({ status: 'approved' }).eq('id', q.id)
    setApprovingQuote(null)
    setSuccess('پیش‌فاکتور تایید و به فروش تبدیل شد.')
    load()
  }

  const pending = quotes.filter((q) => q.status === 'pending')
  const approved = quotes.filter((q) => q.status === 'approved')

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3">{success}</div>}

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-bold">{editingQuoteId ? 'ویرایش پیش‌فاکتور' : 'ایجاد پیش‌فاکتور جدید'}</h2>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2 w-full">
          <option value="">مشتری متفرقه (بدون ثبت در دفتر)</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </select>

        <div className="flex gap-2">
          <select value={pickProductId} onChange={(e) => setPickProductId(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2 flex-1 min-w-0">
            <option value="">انتخاب کالا برای افزودن</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (موجودی: {p.stock_qty})</option>)}
          </select>
          <button type="button" onClick={addItemRow} className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm shrink-0">افزودن به لیست</button>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead><tr className="text-slate-400 border-b border-slate-800"><th className="p-2">کالا</th><th className="p-2">تعداد</th><th className="p-2">قیمت واحد</th><th className="p-2">جمع</th><th className="p-2"></th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="p-2 text-white">{it.product_name}</td>
                    <td className="p-2"><input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 1 })} className="bg-slate-800 text-white rounded-lg p-1 w-16" /></td>
                    <td className="p-2"><input type="number" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) || 0 })} className="bg-slate-800 text-white rounded-lg p-1 w-28" /></td>
                    <td className="p-2 text-slate-300">{(it.unit_price * it.quantity).toLocaleString()}</td>
                    <td className="p-2"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 text-xs">حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input type="number" placeholder="درصد سود اضافه" value={profitPercent} onChange={(e) => setProfitPercent(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
          <input type="number" placeholder="درصد تخفیف" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
        </div>

        {items.length > 0 && (
          <div className="bg-slate-800/60 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-300"><span>جمع اولیه اقلام</span><span>{subtotal.toLocaleString()} تومان</span></div>
            <div className="flex justify-between text-white font-bold"><span>مبلغ نهایی پیش‌فاکتور</span><span>{total.toLocaleString()} تومان</span></div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={saveQuote} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm">{editingQuoteId ? 'ذخیره تغییرات' : 'ثبت پیش‌فاکتور'}</button>
          {editingQuoteId && <button onClick={resetForm} className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm">انصراف</button>}
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={() => setShowApproved(false)} className={`px-4 py-2 rounded-lg text-sm ${!showApproved ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>در انتظار تایید ({pending.length})</button>
        <button onClick={() => setShowApproved(true)} className={`px-4 py-2 rounded-lg text-sm ${showApproved ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>تبدیل‌شده به فروش ({approved.length})</button>
      </div>

      <div className="space-y-3">
        {(showApproved ? approved : pending).map((q) => (
          <div key={q.id} className="bg-slate-800/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-white text-sm font-medium">{q.customer_name}</span>
                <span className="text-slate-500 text-xs mr-2">{q.quote_shamsi}</span>
              </div>
              <span className="text-white font-bold text-sm">{q.total_amount.toLocaleString()} تومان</span>
            </div>
            <div className="text-xs text-slate-400">
              {(q.items || []).map((it) => `${it.product_name} × ${it.quantity}`).join('، ')}
            </div>
            {!showApproved && (
              <div className="flex gap-2 flex-wrap pt-2">
                <button onClick={() => startApprove(q)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg">تایید و ثبت فروش</button>
                <button onClick={() => editQuote(q)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg">ویرایش</button>
                <button onClick={() => rejectQuote(q.id)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs px-3 py-2 rounded-lg">رد و حذف</button>
              </div>
            )}
          </div>
        ))}
        {(showApproved ? approved : pending).length === 0 && <p className="text-slate-500 text-sm">موردی موجود نیست.</p>}
      </div>

      {approvingQuote && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-white font-bold">تایید و ثبت فروش از پیش‌فاکتور</h3>
            <p className="text-sm text-slate-400">مبلغ کل: {approvingQuote.total_amount.toLocaleString()} تومان</p>
            <JalaliDateInput valueISO={saleDateISO} onChange={setSaleDateISO} label="تاریخ فروش" />
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'installment', 'cheque'] as PaymentType[]).map((pt) => (
                <button key={pt} type="button" onClick={() => setPaymentType(pt)} className={`py-2 rounded-lg text-xs sm:text-sm ${paymentType === pt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {pt === 'cash' ? 'نقدی' : pt === 'installment' ? 'اقساطی' : 'چکی'}
                </button>
              ))}
            </div>
            {paymentType !== 'cash' && (
              <input type="number" placeholder="پیش‌پرداخت" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg p-2" />
            )}
            {paymentType === 'installment' && (
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="تعداد اقساط" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
                <input type="number" placeholder="فاصله روزها" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
              </div>
            )}
            {paymentType === 'cheque' && (
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="نام بانک" value={bankName} onChange={(e) => setBankName(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
                <input placeholder="شماره چک" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
                <div className="col-span-2"><JalaliDateInput valueISO={chequeDueISO} onChange={setChequeDueISO} label="تاریخ سررسید چک" /></div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={confirmApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm">تایید نهایی</button>
              <button onClick={() => setApprovingQuote(null)} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
