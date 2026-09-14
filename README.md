# شروع تمیز از صفر — جامع حسابداری فروشگاهی

این یه پروژه‌ی کامل و خودکفاست (Vite + React + TypeScript + Tailwind + Supabase)
بدون هیچ فایل اضافی از ابزارهای قبلی (bolt.new و غیره). هدف اینه که ریپازیتوری گیت‌هاب
و سایت Netlify رو کاملاً پاک کنیم و همین رو جایگزین کنیم تا دیگه هیچ تداخلی نباشه.

## ⚠️ قبل از شروع
این کار **همه‌چیز** تو ریپازیتوری فعلی گیت‌هاب‌تون رو پاک و جایگزین می‌کنه (از جمله
پوشه‌ی `.bolt`، `src-tauri`، و هر چیز دیگه‌ای که قبلاً اونجا بوده). اگه چیز خاصی از
اون‌ها می‌خواید نگه دارید (مثلاً تنظیمات Tauri برای exe ویندوز)، بگید تا جدا قبل از پاک کردن
براتون کنار بذاریم.

## مرحله ۱: پاک کردن کامل پروژه در Codespace
تو ترمینال Codespace:
```
cd /workspaces/app-hesabdari
rm -rf $(ls -A | grep -v '^\.git$')
```
این دستور همه‌چیز رو پاک می‌کنه **به‌جز** پوشه‌ی `.git` (تاریخچه گیت‌تون سالم می‌مونه).

## مرحله ۲: آپلود فایل‌های جدید
فایل `fresh-app.zip` رو دانلود و از حالت فشرده خارج کنید. تمام فایل‌ها و پوشه‌های
داخل پوشه‌ی `fresh-app` (نه خود پوشه‌ی fresh-app!) رو بکشید و داخل ریشه‌ی پروژه در
Codespace رها کنید — یعنی بعدش باید `src`, `public`, `package.json`, `index.html`
و بقیه مستقیم کنار `.git` باشن.

اگه کشیدن‌ و رهاکردن سخته، از طریق ترمینال (بعد از آپلود خود zip):
```
unzip -o fresh-app.zip -d temp_extract
cp -r temp_extract/fresh-app/. .
rm -rf temp_extract fresh-app.zip
```

## مرحله ۳: فایل .env بسازید
```
cp .env.example .env
```
بعد فایل `.env` رو باز کنید و این دو مقدار رو از پنل Supabase (Project Settings → API) پر کنید:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## مرحله ۴: دیتابیس Supabase
اگه قبلاً `supabase-schema.sql` رو اجرا کرده بودید و جدول‌ها ساخته شدن، نیازی به تکرار نیست.
اگه مطمئن نیستید یا پروژه Supabase جدیدیه، محتوای `supabase-schema.sql` رو تو SQL Editor
پروژه Supabase‌تون کامل اجرا کنید.

## مرحله ۵: نصب و تست محلی
```
npm install
npm run dev -- --host
```
از تب Ports، پورت 5173 رو باز کنید و مطمئن بشید صفحه‌ی ورود واقعی میاد.

## مرحله ۶: ارسال به گیت‌هاب
```
git add -A
git commit -m "reset to clean working version"
git push
```

## مرحله ۷: تنظیمات Netlify
1. برید app.netlify.com → پروژه `mpout.ir` (یا `hesabdariemp`).
2. **Site configuration → Build & deploy → Build settings** رو چک کنید:
   - Build command: `npm run build`
   - Publish directory: `dist`
   (فایل `netlify.toml` که تو پروژه گذاشتم خودش این‌ها رو تنظیم می‌کنه.)
3. **Site configuration → Environment variables**: دو متغیر رو اضافه کنید:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (همون مقادیری که تو `.env` خودتون گذاشتید.)
4. برید تب **Deploys** → **Trigger deploy → Deploy site** تا با تنظیمات جدید دوباره build بشه.

## اگه بازم Deploy failed داد
تو صفحه‌ی Deploy log، دنبال خط‌هایی که با `error` یا `Error` شروع می‌شن بگردید (نه فقط
پیام کلی «Deploy logs are currently unavailable» — گاهی چند ثانیه بعد لاگ واقعی لود می‌شه،
صفحه رو Refresh کنید). عکس همون خطای دقیق قرمز رو برام بفرستید.
