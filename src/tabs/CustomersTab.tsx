import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Customer, BalanceType } from '../types'

const emptyForm = { first_name: '', last_name: '', phone: '', address: '', balance_type: 'none' as BalanceType, balance_amount: '' }

export default function CustomersTab({ userId }: { userId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    const { data } = await supabase.from('customers').select('*').eq('user_id', userId).order('sort_order')
    setCustomers((data as Customer[]) || [])
  }

  useEffect(() => { load() }, [userId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim()) return
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      address: form.address,
      balance_type: form.balance_type,
      // با انتخاب «بدون بدهی/طلب» مبلغ همیشه صفر و حساب تسویه‌شده ثبت می‌شود
      balance_amount: form.balance_type === 'none' ? 0 : Number(form.balance_amount) || 0,
    }
    if (editingId) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editingId)
      if (error) { setError(error.message); return }
    } else {
      const { error } = await supabase.from('customers').insert({ ...payload, user_id: userId, sort_order: customers.length })
      if (error) { setError(error.message); return }
    }
    setForm(emptyForm); setEditingId(null); load()
  }

  const editRow = (c: Customer) => {
    setEditingId(c.id)
    setForm({
      first_name: c.first_name, last_name: c.last_name, phone: c.phone, address: c.address,
      balance_type: c.balance_type, balance_amount: String(c.balance_amount),
    })
  }

  const deleteRow = async (id: string) => {
    if (!confirm('این مشتری حذف شود؟')) return
    await supabase.from('customers').delete().eq('id', id)
    load()
  }

  const settleNow = async (id: string) => {
    await supabase.from('customers').update({ balance_type: 'none', balance_amount: 0 }).eq('id', id)
    load()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= customers.length) return
    const a = customers[index]; const b = customers[newIndex]
    await supabase.from('customers').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('customers').update({ sort_order: a.sort_order }).eq('id', b.id)
    load()
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">افزودن / ویرایش مشتری</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <input placeholder="نام" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="نام خانوادگی" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="شماره تماس" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="آدرس" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2" />
          <select value={form.balance_type} onChange={(e) => {
            const nextType = e.target.value as BalanceType
            setForm({ ...form, balance_type: nextType, balance_amount: nextType === 'none' ? '0' : form.balance_amount })
          }} className="bg-slate-800 text-white rounded-lg p-2">
            <option value="none">بدون بدهی/طلب (تسویه)</option>
            <option value="debtor">بدهکار</option>
            <option value="creditor">بستانکار</option>
          </select>
          {form.balance_type !== 'none' && (
            <input placeholder="مبلغ (تومان)" type="number" value={form.balance_amount} onChange={(e) => setForm({ ...form, balance_amount: e.target.value })}
              className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          )}
          <div className="sm:col-span-2 md:col-span-3 flex gap-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm">
              {editingId ? 'ذخیره ویرایش' : 'افزودن مشتری'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm">انصراف</button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">دفتر مشتریان</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2">نام</th><th className="p-2">تماس</th><th className="p-2">آدرس</th>
                <th className="p-2">وضعیت حساب</th><th className="p-2">مبلغ</th><th className="p-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className="border-b border-slate-800/50">
                  <td className="p-2 text-white">{c.first_name} {c.last_name}</td>
                  <td className="p-2 text-slate-300">{c.phone}</td>
                  <td className="p-2 text-slate-400">{c.address}</td>
                  <td className="p-2">
                    {c.balance_type === 'debtor' && <span className="text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded">بدهکار</span>}
                    {c.balance_type === 'creditor' && <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded">بستانکار</span>}
                    {c.balance_type === 'none' && <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded">تسویه‌شده</span>}
                  </td>
                  <td className="p-2 text-slate-300">{c.balance_amount ? c.balance_amount.toLocaleString() + ' تومان' : '-'}</td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => move(i, -1)} className="text-slate-400 hover:text-white px-1">▲</button>
                      <button onClick={() => move(i, 1)} className="text-slate-400 hover:text-white px-1">▼</button>
                      {c.balance_type !== 'none' && (
                        <button onClick={() => settleNow(c.id)} className="text-emerald-400 hover:text-emerald-300 px-1 text-xs">تسویه حساب</button>
                      )}
                      <button onClick={() => editRow(c)} className="text-blue-400 hover:text-blue-300 px-1 text-xs">ویرایش</button>
                      <button onClick={() => deleteRow(c.id)} className="text-red-400 hover:text-red-300 px-1 text-xs">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">هنوز مشتری‌ای ثبت نشده است.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
