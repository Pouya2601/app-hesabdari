import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Category, Product } from '../types'

type Scope = 'all' | 'category' | 'single'
type Direction = 'increase' | 'decrease'
type Mode = 'percent' | 'fixed'

export default function BulkPriceTab({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [scope, setScope] = useState<Scope>('all')
  const [categoryId, setCategoryId] = useState('')
  const [productId, setProductId] = useState('')
  const [direction, setDirection] = useState<Direction>('increase')
  const [mode, setMode] = useState<Mode>('percent')
  const [value, setValue] = useState('')
  const [applyBuy, setApplyBuy] = useState(false)
  const [applySell, setApplySell] = useState(true)
  const [message, setMessage] = useState('')
  const [editForm, setEditForm] = useState<Record<string, { buy: string; sell: string }>>({})

  const load = async () => {
    const { data: cats } = await supabase.from('categories').select('*').eq('user_id', userId).order('sort_order')
    const { data: prods } = await supabase.from('products').select('*').eq('user_id', userId).order('sort_order')
    setCategories((cats as Category[]) || [])
    setProducts((prods as Product[]) || [])
  }
  useEffect(() => { load() }, [userId])

  const lowStock = products.filter((p) => p.stock_qty <= p.low_stock_threshold)

  const affected = products.filter((p) => {
    if (scope === 'all') return true
    if (scope === 'category') return p.category_id === categoryId
    if (scope === 'single') return p.id === productId
    return false
  })

  const computeNew = (price: number) => {
    const v = Number(value) || 0
    if (mode === 'percent') {
      return direction === 'increase' ? Math.round(price * (1 + v / 100)) : Math.round(price * (1 - v / 100))
    }
    return direction === 'increase' ? price + v : price - v
  }

  const apply = async () => {
    setMessage('')
    if (!value) { setMessage('مقدار تغییر قیمت را وارد کنید.'); return }
    if (!applyBuy && !applySell) { setMessage('حداقل یکی از قیمت خرید یا فروش را انتخاب کنید.'); return }
    for (const p of affected) {
      const update: { buy_price?: number; sell_price?: number } = {}
      if (applyBuy) update.buy_price = Math.max(0, computeNew(p.buy_price))
      if (applySell) update.sell_price = Math.max(0, computeNew(p.sell_price))
      await supabase.from('products').update(update).eq('id', p.id)
    }
    setMessage(`قیمت ${affected.length} کالا با موفقیت به‌روزرسانی شد.`)
    load()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= products.length) return
    const a = products[index]; const b = products[newIndex]
    await supabase.from('products').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('products').update({ sort_order: a.sort_order }).eq('id', b.id)
    load()
  }

  const saveInline = async (id: string) => {
    const f = editForm[id]
    if (!f) return
    await supabase.from('products').update({ buy_price: Number(f.buy) || 0, sell_price: Number(f.sell) || 0 }).eq('id', id)
    load()
  }

  return (
    <div className="space-y-6">
      {lowStock.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium mb-2">هشدار کمبود موجودی ({lowStock.length} کالا)</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <span key={p.id} className="text-xs bg-red-500/10 text-red-300 px-2 py-1 rounded">{p.name}: {p.stock_qty}</span>
            ))}
          </div>
        </div>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-bold">تغییر قیمت دسته‌ای / گروهی</h2>
        {message && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3">{message}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="bg-slate-800 text-white rounded-lg p-2">
            <option value="all">همه کالاها</option>
            <option value="category">یک دسته‌بندی</option>
            <option value="single">یک کالای خاص</option>
          </select>
          {scope === 'category' && (
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2">
              <option value="">انتخاب دسته</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {scope === 'single' && (
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2">
              <option value="">انتخاب کالا</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className="bg-slate-800 text-white rounded-lg p-2">
            <option value="increase">افزایش</option>
            <option value="decrease">کاهش</option>
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="bg-slate-800 text-white rounded-lg p-2">
            <option value="percent">درصدی</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <input placeholder={mode === 'percent' ? 'درصد' : 'مبلغ (تومان)'} type="number" value={value} onChange={(e) => setValue(e.target.value)} className="bg-slate-800 text-white rounded-lg p-2" />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={applyBuy} onChange={(e) => setApplyBuy(e.target.checked)} /> اعمال روی قیمت خرید</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={applySell} onChange={(e) => setApplySell(e.target.checked)} /> اعمال روی قیمت فروش</label>
        </div>
        <p className="text-xs text-slate-500">{affected.length} کالا تحت تاثیر این تغییر قرار می‌گیرد.</p>
        <button onClick={apply} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm">اعمال تغییر قیمت</button>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">قیمت‌های فعلی (ویرایش تکی و ترتیب نمایش)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2">کالا</th><th className="p-2">قیمت خرید</th><th className="p-2">قیمت فروش</th><th className="p-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const f = editForm[p.id] || { buy: String(p.buy_price), sell: String(p.sell_price) }
                return (
                  <tr key={p.id} className="border-b border-slate-800/50">
                    <td className="p-2 text-white">{p.name}</td>
                    <td className="p-2">
                      <input value={f.buy} onChange={(e) => setEditForm({ ...editForm, [p.id]: { ...f, buy: e.target.value } })} className="bg-slate-800 text-white rounded-lg p-1 w-24" />
                    </td>
                    <td className="p-2">
                      <input value={f.sell} onChange={(e) => setEditForm({ ...editForm, [p.id]: { ...f, sell: e.target.value } })} className="bg-slate-800 text-white rounded-lg p-1 w-24" />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button onClick={() => move(i, -1)} className="text-slate-400 hover:text-white px-1">▲</button>
                        <button onClick={() => move(i, 1)} className="text-slate-400 hover:text-white px-1">▼</button>
                        <button onClick={() => saveInline(p.id)} className="text-blue-400 hover:text-blue-300 px-1 text-xs">ذخیره</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">کالایی موجود نیست.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
