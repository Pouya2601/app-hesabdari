import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PaymentItem } from '../types'
import { formatJalali, formatJalaliDateTime } from '../lib/jalali'
import JalaliDateInput from '../components/JalaliDateInput'

const todayISO = new Date().toISOString().slice(0, 10)

export default function ChequesInstallmentsTab({ userId }: { userId: string }) {
  const [active, setActive] = useState<PaymentItem[]>([])
  const [archived, setArchived] = useState<PaymentItem[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [settleDate, setSettleDate] = useState(todayISO)
  const [settleTime, setSettleTime] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDue, setEditDue] = useState(todayISO)

  const load = async () => {
    const { data } = await supabase
      .from('payment_items')
      .select('*, sales(customer_id, customer_name, product_name)')
      .eq('user_id', userId)
      .order('due_date')
    const rows = (data || []).map((r: any) => ({
      ...r,
      customer_id: r.sales?.customer_id ?? null,
      customer_name: r.sales?.customer_name,
      product_name: r.sales?.product_name,
    })) as PaymentItem[]
    setActive(rows.filter((r) => !r.is_archived))
    setArchived(rows.filter((r) => r.is_archived))
  }

  useEffect(() => { load() }, [userId])

  const startSettle = (id: string) => {
    const now = new Date()
    setSettlingId(id)
    setSettleDate(now.toISOString().slice(0, 10))
    setSettleTime(now.toTimeString().slice(0, 5))
  }

  const confirmSettle = async () => {
    if (!settlingId) return
    const item = active.find((i) => i.id === settlingId)
    const settledAt = new Date(`${settleDate}T${settleTime || '00:00'}:00`).toISOString()
    await supabase.from('payment_items').update({ is_archived: true, settled_at: settledAt }).eq('id', settlingId)

    // کاهش بدهی مشتری به میزان مبلغ تسویه‌شده
    if (item?.customer_id) {
      const { data: customer } = await supabase.from('customers').select('*').eq('id', item.customer_id).maybeSingle()
      if (customer && customer.balance_type === 'debtor') {
        const remaining = Math.max(0, (customer.balance_amount || 0) - item.amount)
        await supabase.from('customers').update({
          balance_amount: remaining,
          balance_type: remaining <= 0 ? 'none' : 'debtor',
        }).eq('id', item.customer_id)
      }
    }

    setSettlingId(null)
    load()
  }

  // امکان خروج از بایگانی؛ چون فقط یک فلگ بولی است، بعد از خروج، بایگانی مجدد هم به‌طور طبیعی امکان‌پذیر است.
  const unarchive = async (id: string) => {
    const item = [...active, ...archived].find((i) => i.id === id)
    await supabase.from('payment_items').update({ is_archived: false, settled_at: null }).eq('id', id)

    // بازگرداندن بدهی مشتری به میزان مبلغی که قبلاً موقع تسویه کم شده بود
    if (item?.customer_id) {
      const { data: customer } = await supabase.from('customers').select('*').eq('id', item.customer_id).maybeSingle()
      if (customer) {
        const currentDebt = customer.balance_type === 'debtor' ? customer.balance_amount || 0 : 0
        await supabase.from('customers').update({
          balance_amount: currentDebt + item.amount,
          balance_type: 'debtor',
        }).eq('id', item.customer_id)
      }
    }

    load()
  }

  const remove = async (id: string) => {
    if (!confirm('این سند حذف شود؟')) return
    await supabase.from('payment_items').delete().eq('id', id)
    load()
  }

  const startEdit = (item: PaymentItem) => {
    setEditingId(item.id); setEditAmount(String(item.amount)); setEditDue(item.due_date)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await supabase.from('payment_items').update({ amount: Number(editAmount), due_date: editDue }).eq('id', editingId)
    setEditingId(null)
    load()
  }

  const renderRow = (item: PaymentItem, isArchivedRow: boolean) => (
    <div key={item.id} className="bg-slate-800/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded ${item.type === 'cheque' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {item.type === 'cheque' ? 'چک' : `قسط #${item.sequence_no}`}
          </span>
          <span className="text-white text-sm font-medium">{item.customer_name}</span>
          <span className="text-slate-500 text-xs">{item.product_name}</span>
        </div>
        <div className="text-xs text-slate-400 flex gap-3 flex-wrap">
          <span>سررسید: {formatJalali(item.due_date)}</span>
          <span>مبلغ: {item.amount.toLocaleString()} تومان</span>
          {item.bank_name && <span>بانک: {item.bank_name}</span>}
          {item.cheque_number && <span>شماره چک: {item.cheque_number}</span>}
          {item.settled_at && <span>تسویه: {formatJalaliDateTime(item.settled_at)}</span>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {!isArchivedRow ? (
          <>
            <button onClick={() => startSettle(item.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg">تسویه و بایگانی</button>
            <button onClick={() => startEdit(item)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg">ویرایش</button>
          </>
        ) : (
          <button onClick={() => unarchive(item.id)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg">خروج از بایگانی</button>
        )}
        <button onClick={() => remove(item.id)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs px-3 py-2 rounded-lg">حذف</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setShowArchived(false)} className={`px-4 py-2 rounded-lg text-sm ${!showArchived ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>در انتظار ({active.length})</button>
        <button onClick={() => setShowArchived(true)} className={`px-4 py-2 rounded-lg text-sm ${showArchived ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>بایگانی‌شده ({archived.length})</button>
      </div>

      <div className="space-y-3">
        {!showArchived && active.map((i) => renderRow(i, false))}
        {!showArchived && active.length === 0 && <p className="text-slate-500 text-sm">هیچ چک یا قسط در انتظاری موجود نیست.</p>}
        {showArchived && archived.map((i) => renderRow(i, true))}
        {showArchived && archived.length === 0 && <p className="text-slate-500 text-sm">بایگانی خالی است.</p>}
      </div>

      {settlingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-bold">ثبت تاریخ و ساعت تسویه</h3>
            <JalaliDateInput valueISO={settleDate} onChange={setSettleDate} label="تاریخ تسویه" />
            <div>
              <label className="text-xs text-slate-400 block mb-1">ساعت تسویه</label>
              <input type="time" value={settleTime} onChange={(e) => setSettleTime(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg p-2" />
            </div>
            <div className="flex gap-3">
              <button onClick={confirmSettle} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm">تایید و بایگانی</button>
              <button onClick={() => setSettlingId(null)} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-bold">ویرایش سند</h3>
            <input type="number" placeholder="مبلغ" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg p-2" />
            <JalaliDateInput valueISO={editDue} onChange={setEditDue} label="تاریخ سررسید" />
            <div className="flex gap-3">
              <button onClick={saveEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm">ذخیره</button>
              <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
