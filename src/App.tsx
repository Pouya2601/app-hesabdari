import { FormEvent, useState } from 'react';
import { Eye, EyeOff, KeyRound, Store, Mail, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/hash';

type Mode = 'login' | 'signup';

type Shop = {
  id: string;
  store_name: string;
  password_hash: string;
  email: string;
};

function getPersianError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.';
  }
  if (normalized.includes('duplicate') || normalized.includes('already exists')) {
    return 'این نام فروشگاه قبلاً ثبت شده است. نام دیگری انتخاب کنید.';
  }
  return 'عملیات انجام نشد. لطفاً دوباره تلاش کنید.';
}

function App() {
  const [mode, setMode] = useState<Mode>('login');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loggedInShop, setLoggedInShop] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (storeName.trim().length < 2) {
      setError('نام فروشگاه باید حداقل ۲ کاراکتر باشد.');
      return;
    }
    if (password.length < 4) {
      setError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    if (isSignup && (!email.trim() || !email.includes('@'))) {
      setError('لطفاً یک ایمیل معتبر برای پشتیبانی و بازیابی رمز وارد کنید.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignup) {
        const hash = await hashPassword(password);
        const { error: insertError } = await supabase
          .from('shops')
          .insert({
            store_name: storeName.trim(),
            password_hash: hash,
            email: email.trim(),
          });

        if (insertError) {
          setError(getPersianError(insertError.message));
          return;
        }

        setSuccess('حساب فروشگاه شما ساخته شد. اکنون می‌توانید وارد شوید.');
        setMode('login');
        setPassword('');
      } else {
        const { data, error: selectError } = await supabase
          .from('shops')
          .select('id, store_name, password_hash, email')
          .eq('store_name', storeName.trim())
          .maybeSingle<Shop>();

        if (selectError) {
          setError(getPersianError(selectError.message));
          return;
        }

        if (!data) {
          setError('نام فروشگاه پیدا نشد. ابتدا ثبت‌نام کنید.');
          return;
        }

        const hash = await hashPassword(password);
        if (hash !== data.password_hash) {
          setError('رمز عبور اشتباه است.');
          return;
        }

        setLoggedInShop(data.store_name);
      }
    } catch {
      setError('خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loggedInShop) {
    return (
      <main className="min-h-screen bg-[#061417] px-5 py-10 text-white" dir="rtl">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 shadow-[0_0_40px_rgba(52,211,153,0.18)]">
            <ShieldCheck size={38} strokeWidth={1.6} />
          </div>
          <h1 className="mb-3 text-3xl font-bold">خوش آمدید</h1>
          <p className="mb-2 text-lg text-slate-300">ورود موفقیت‌آمیز بود</p>
          <p className="mb-8 text-sm text-slate-400">پنل فروشگاه <span className="font-bold text-cyan-300">{loggedInShop}</span></p>
          <button
            type="button"
            onClick={() => {
              setLoggedInShop(null);
              setStoreName('');
              setPassword('');
            }}
            className="rounded-xl border border-slate-600/50 bg-slate-800/40 px-6 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700/50"
          >
            خروج از حساب
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#061417] px-5 py-10 text-white" dir="rtl">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200 shadow-[0_0_35px_rgba(34,211,238,0.16)]">
            <Store size={29} strokeWidth={1.7} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">پنل فروشگاه</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">برای ورود به پنل خود، نام فروشگاه و رمز عبور را وارد کنید.</p>
        </header>

        <section className="rounded-[2rem] border border-cyan-300/20 bg-[#092124] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="mb-7 grid grid-cols-2 rounded-xl bg-black/20 p-1 text-sm">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-lg px-4 py-3 transition ${!isSignup ? 'bg-cyan-400 font-bold text-[#062025] shadow-lg shadow-cyan-400/10' : 'text-slate-400 hover:text-white'}`}
            >
              ورود
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`rounded-lg px-4 py-3 transition ${isSignup ? 'bg-cyan-400 font-bold text-[#062025] shadow-lg shadow-cyan-400/10' : 'text-slate-400 hover:text-white'}`}
            >
              ثبت‌نام
            </button>
          </div>

          <h2 className="mb-6 text-center text-2xl font-bold">{isSignup ? 'ساخت حساب فروشگاه' : 'ورود به پنل'}</h2>

          {error && (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-400/35 bg-red-950/35 p-4 text-sm leading-7 text-red-200" role="alert">
              <AlertCircle className="mt-1 shrink-0 text-red-300" size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 flex gap-3 rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-4 text-sm leading-7 text-emerald-200" role="status">
              <CheckCircle2 className="mt-1 shrink-0 text-emerald-300" size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">نام فروشگاه</span>
              <div className="relative">
                <Store className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="field pr-12"
                  placeholder="مثلاً تعمیرگاه رضایی"
                  autoComplete="organization"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">رمز عبور</span>
              <div className="relative">
                <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field px-12"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="رمز خود را وارد کنید"
                  dir="ltr"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-cyan-300"
                  aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {isSignup && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">ایمیل (پشتیبانی و بازیابی رمز)</span>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field pr-12"
                    type="email"
                    placeholder="name@example.com"
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
              </label>
            )}

            <button
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-4 font-bold text-[#062025] shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {isSubmitting ? 'در حال بررسی...' : isSignup ? 'ساخت حساب' : 'ورود'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isSignup ? 'حساب دارید؟' : 'حساب ندارید؟'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="font-bold text-cyan-300 hover:text-cyan-200"
            >
              {isSignup ? 'وارد شوید' : 'ثبت‌نام کنید'}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}

export default App;
