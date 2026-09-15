import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import AuthScreen from './components/AuthScreen'
import ProfileSetup from './components/ProfileSetup'
import { Profile } from './types'
import InventoryTab from './tabs/InventoryTab'
import CustomersTab from './tabs/CustomersTab'
import NewSaleTab from './tabs/NewSaleTab'
import ChequesInstallmentsTab from './tabs/ChequesInstallmentsTab'
import BulkPriceTab from './tabs/BulkPriceTab'
import ReportsTab from './tabs/ReportsTab'

type TabKey = 'sale' | 'cheques' | 'price' | 'customers' | 'inventory' | 'reports'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'inventory', label: 'مدیریت انبار' },
  { key: 'customers', label: 'دفتر مشتریان' },
  { key: 'sale', label: 'ثبت فروش' },
  { key: 'cheques', label: 'چک‌ها و اقساط' },
  { key: 'price', label: 'تغییر قیمت دسته‌ای' },
  { key: 'reports', label: 'گزارش سود و زیان' },
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkedProfile, setCheckedProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('inventory')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setCheckedProfile(false)
      return
    }
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      setProfile(data as Profile | null)
      setCheckedProfile(true)
    })
  }, [session])

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">در حال بارگذاری...</div>
  }

  if (!session) return <AuthScreen />

  if (!checkedProfile) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">در حال بارگذاری...</div>
  }

  if (!profile) {
    return (
      <ProfileSetup
        userId={session.user.id}
        email={session.user.email || ''}
        onDone={() => {
          supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(({ data }) => setProfile(data as Profile))
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950" dir="rtl">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">سیستم جامع حسابداری</h1>
            <p className="text-xs text-slate-400">{profile.business_name} — {profile.first_name} {profile.last_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://instagram.com/empty_aistudio" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">@empty_aistudio</a>
            <button onClick={() => supabase.auth.signOut()} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg">
              خروج
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition truncate ${activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'inventory' && <InventoryTab userId={session.user.id} />}
        {activeTab === 'customers' && <CustomersTab userId={session.user.id} />}
        {activeTab === 'sale' && <NewSaleTab userId={session.user.id} />}
        {activeTab === 'cheques' && <ChequesInstallmentsTab userId={session.user.id} />}
        {activeTab === 'price' && <BulkPriceTab userId={session.user.id} />}
        {activeTab === 'reports' && <ReportsTab userId={session.user.id} />}
      </main>
    </div>
  )
}
