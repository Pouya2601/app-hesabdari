import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Category, Product } from '../types'

export default function InventoryTab({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [catName, setCatName] = useState('')
  const [catParent, setCatParent] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)

  const emptyProdForm = { name: '', category_id: '', buy_price: '', sell_price: '', stock_qty: '', low_stock_threshold: '' }
  const [prodForm, setProdForm] = useState(emptyProdForm)
  const [editingProdId, setEditingProdId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    const { data: cats } = await supabase.from('categories').select('*').eq('user_id', userId).order('sort_order')
    const { data: prods } = await supabase.from('products').select('*').eq('user_id', userId).order('sort_order')
    setCategories((cats as Category[]) || [])
    setProducts((prods as Product[]) || [])
  }

  useEffect(() => { load() }, [userId])

  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!catName.trim()) return
    if (editingCatId) {
      const { error } = await supabase.from('categories').update({ name: catName, parent_id: catParent || null }).eq('id', editingCatId)
      if (error) { setError(error.message); return }
    } else {
      const sort_order = categories.length
      const { error } = await supabase.from('categories').insert({ user_id: userId, name: catName, parent_id: catParent || null, sort_order })
      if (error) { setError(error.message); return }
    }
    setCatName(''); setCatParent(''); setEditingCatId(null)
    load()
  }

  const editCategory = (c: Category) => {
    setEditingCatId(c.id); setCatName(c.name); setCatParent(c.parent_id || '')
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('این دسته‌بندی حذف شود؟ کالاهای مرتبط بدون دسته باقی می‌مانند.')) return
    await supabase.from('categories').delete().eq('id', id)
    load()
  }

  const moveCategory = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= categories.length) return
    const a = categories[index]
    const b = categories[newIndex]
    await supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id)
    load()
  }

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!prodForm.name.trim()) return
    const payload = {
      name: prodForm.name,
      category_id: prodForm.category_id || null,
      buy_price: Number(prodForm.buy_price) || 0,
      sell_price: Number(prodForm.sell_price) || 0,
      stock_qty: Number(prodForm.stock_qty) || 0,
      low_stock_threshold: Number(prodForm.low_stock_threshold) || 0,
    }
    if (editingProdId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingProdId)
      if (error) { setError(error.message); return }
    } else {
      const sort_order = products.length
      const { error } = await supabase.from('products').insert({ ...payload, user_id: userId, sort_order })
      if (error) { setError(error.message); return }
    }
    setProdForm(emptyProdForm)
    setEditingProdId(null)
    load()
  }

  const editProduct = (p: Product) => {
    setEditingProdId(p.id)
    setProdForm({
      name: p.name, category_id: p.category_id || '',
      buy_price: String(p.buy_price), sell_price: String(p.sell_price),
      stock_qty: String(p.stock_qty), low_stock_threshold: String(p.low_stock_threshold),
    })
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('این کالا حذف شود؟')) return
    await supabase.from('products').delete().eq('id', id)
    load()
  }

  const moveProduct = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= products.length) return
    const a = products[index]
    const b = products[newIndex]
    await supabase.from('products').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('products').update({ sort_order: a.sort_order }).eq('id', b.id)
    load()
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name || '-'

  return (
    <div className="space-y-8">
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}

      {/* دسته‌بندی‌ها */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">دسته‌بندی کالاها</h2>
        <form onSubmit={submitCategory} className="flex flex-wrap gap-3 mb-4">
          <input placeholder="نام دسته‌بندی" value={catName} onChange={(e) => setCatName(e.target.value)}
            className="bg-slate-800 text-white rounded-lg p-2 flex-1 min-w-[160px] outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={catParent} onChange={(e) => setCatParent(e.target.value)}
            className="bg-slate-800 text-white rounded-lg p-2 min-w-[160px]">
            <option value="">بدون دسته والد (دسته اصلی)</option>
            {categories.filter((c) => c.id !== editingCatId).map((c) => (
              <option key={c.id} value={c.id}>زیرمجموعه‌ی: {c.name}</option>
            ))}
          </select>
          <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm">
            {editingCatId ? 'ذخیره ویرایش' : 'افزودن دسته'}
          </button>
          {editingCatId && (
            <button type="button" onClick={() => { setEditingCatId(null); setCatName(''); setCatParent('') }}
              className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm">انصراف</button>
          )}
        </form>
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
              <div className="text-sm text-white">
                {c.parent_id && <span className="text-slate-500">↳ </span>}
                {c.name}
                {c.parent_id && <span className="text-slate-500 text-xs"> (زیرمجموعه {categoryName(c.parent_id)})</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => moveCategory(i, -1)} className="text-slate-400 hover:text-white px-2">▲</button>
                <button onClick={() => moveCategory(i, 1)} className="text-slate-400 hover:text-white px-2">▼</button>
                <button onClick={() => editCategory(c)} className="text-blue-400 hover:text-blue-300 px-2 text-xs">ویرایش</button>
                <button onClick={() => deleteCategory(c.id)} className="text-red-400 hover:text-red-300 px-2 text-xs">حذف</button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-slate-500 text-sm">هنوز دسته‌بندی‌ای ثبت نشده است.</p>}
        </div>
      </section>

      {/* کالاها */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">کالاها</h2>
        <form onSubmit={submitProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <input placeholder="نام کالا" value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={prodForm.category_id} onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2">
            <option value="">بدون دسته</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="قیمت خرید" type="number" value={prodForm.buy_price} onChange={(e) => setProdForm({ ...prodForm, buy_price: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="قیمت فروش" type="number" value={prodForm.sell_price} onChange={(e) => setProdForm({ ...prodForm, sell_price: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="موجودی انبار" type="number" value={prodForm.stock_qty} onChange={(e) => setProdForm({ ...prodForm, stock_qty: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="حد نصاب هشدار کمبود" type="number" value={prodForm.low_stock_threshold} onChange={(e) => setProdForm({ ...prodForm, low_stock_threshold: e.target.value })}
            className="bg-slate-800 text-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="col-span-2 md:col-span-3 flex gap-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm">
              {editingProdId ? 'ذخیره ویرایش' : 'افزودن کالا'}
            </button>
            {editingProdId && (
              <button type="button" onClick={() => { setEditingProdId(null); setProdForm(emptyProdForm) }}
                className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm">انصراف</button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2">نام کالا</th>
                <th className="p-2">دسته‌بندی</th>
                <th className="p-2">قیمت خرید</th>
                <th className="p-2">قیمت فروش</th>
                <th className="p-2">موجودی</th>
                <th className="p-2">وضعیت</th>
                <th className="p-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className="border-b border-slate-800/50">
                  <td className="p-2 text-white">{p.name}</td>
                  <td className="p-2 text-slate-400">{categoryName(p.category_id)}</td>
                  <td className="p-2 text-slate-300">{p.buy_price.toLocaleString()}</td>
                  <td className="p-2 text-slate-300">{p.sell_price.toLocaleString()}</td>
                  <td className="p-2 text-slate-300">{p.stock_qty}</td>
                  <td className="p-2">
                    {p.stock_qty <= p.low_stock_threshold
                      ? <span className="text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded">کمبود موجودی</span>
                      : <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded">مناسب</span>}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <button onClick={() => moveProduct(i, -1)} className="text-slate-400 hover:text-white px-1">▲</button>
                      <button onClick={() => moveProduct(i, 1)} className="text-slate-400 hover:text-white px-1">▼</button>
                      <button onClick={() => editProduct(p)} className="text-blue-400 hover:text-blue-300 px-1 text-xs">ویرایش</button>
                      <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 px-1 text-xs">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-slate-500">هنوز کالایی ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
