import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Mode = 'login' | 'signup' | 'forgot'

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const resetMessages = () => {
    setError('')
    setMessage('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('ایمیل یا رمز عبور اشتباه است.')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()
    if (!passwordRule.test(password)) {
      setError('رمز عبور باید حداقل ۸ کاراکتر و شامل حروف بزرگ، حروف کوچک و عدد باشد.')
      return
    }
    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message.toLowerCase().includes('already') ? 'این ایمیل قبلاً ثبت شده است.' : 'خطا در ثبت‌نام: ' + error.message)
    } else {
      setMessage('ثبت‌نام با موفقیت انجام شد. اگر تایید ایمیل فعال باشد، لینک تایید برایتان ارسال شده است.')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) setError('خطا در ارسال ایمیل بازیابی: ' + error.message)
    else setMessage('لینک بازیابی رمز عبور به ایمیل شما ارسال شد.')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">جامع حسابداری فروشگاهی</h1>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <span>طراحی و توسعه</span>
            <a
              href="https://instagram.com/empty_aistudio"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              @empty_aistudio
            </a>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex gap-2 mb-6 bg-slate-800/50 rounded-xl p-1">
            <button
              onClick={() => { setMode('login'); resetMessages() }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              ورود
            </button>
            <button
              onClick={() => { setMode('signup'); resetMessages() }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              ثبت‌نام
            </button>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
          {message && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3 mb-4">{message}</div>}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" required placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="password" required placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 font-medium disabled:opacity-50">
                {loading ? 'در حال ورود...' : 'ورود'}
              </button>
              <button type="button" onClick={() => { setMode('forgot'); resetMessages() }} className="w-full text-center text-sm text-slate-400 hover:text-blue-400">
                رمز عبور را فراموش کرده‌ام
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <input type="email" required placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="password" required placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="password" required placeholder="تکرار رمز عبور" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-slate-500">رمز عبور باید حداقل ۸ کاراکتر و شامل حرف بزرگ، حرف کوچک و عدد باشد.</p>
              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 font-medium disabled:opacity-50">
                {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <input type="email" required placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 font-medium disabled:opacity-50">
                {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
              </button>
              <button type="button" onClick={() => { setMode('login'); resetMessages() }} className="w-full text-center text-sm text-slate-400 hover:text-blue-400">
                بازگشت به ورود
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
