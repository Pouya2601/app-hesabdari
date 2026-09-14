import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ProfileSetup({ userId, email, onDone }: { userId: string; email: string; onDone: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      business_name: businessName,
    })
    setLoading(false)
    if (error) setError('خطا در ثبت اطلاعات: ' + error.message)
    else onDone()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">تکمیل اطلاعات حساب</h2>
        <p className="text-slate-400 text-sm mb-6">قبل از شروع، لطفاً اطلاعات زیر را تکمیل کنید.</p>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="نام" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
          <input required placeholder="نام خانوادگی" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
          <input required placeholder="نام فروشگاه / موسسه / تعمیرگاه" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
            className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 font-medium disabled:opacity-50">
            {loading ? 'در حال ذخیره...' : 'شروع کار'}
          </button>
        </form>
      </div>
    </div>
  )
}
