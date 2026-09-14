// تبدیل دقیق تاریخ میلادی به شمسی و برعکس با استفاده از موتور تقویم داخلی مرورگر (Intl)
// این روش نیازی به کتابخانه خارجی ندارد و همیشه با قوانین رسمی تقویم هجری شمسی هماهنگ است.

export interface JalaliDate {
  year: number
  month: number
  day: number
}

function partsFor(date: Date): JalaliDate {
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const parts = fmt.formatToParts(date)
  const y = Number(parts.find((p) => p.type === 'year')!.value)
  const m = Number(parts.find((p) => p.type === 'month')!.value)
  const d = Number(parts.find((p) => p.type === 'day')!.value)
  return { year: y, month: m, day: d }
}

// تاریخ میلادی به فرم yyyy-mm-dd -> اجزای شمسی
export function toJalali(isoDate: string): JalaliDate {
  const date = new Date(isoDate + 'T00:00:00Z')
  return partsFor(date)
}

// نمایش رشته شمسی مثل ۱۴۰۴/۰۶/۱۹
export function formatJalali(isoDate: string | null | undefined): string {
  if (!isoDate) return '-'
  const j = toJalali(isoDate)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${j.year}/${p(j.month)}/${p(j.day)}`
}

// اجزای شمسی -> تاریخ میلادی به فرم yyyy-mm-dd (با جستجوی دقیق روز به روز، بدون خطا)
export function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  let guess = new Date(Date.UTC(jy + 621, 2, 21))
  for (let i = 0; i < 400; i++) {
    const p = partsFor(guess)
    if (p.year === jy && p.month === jm && p.day === jd) {
      return guess.toISOString().slice(0, 10)
    }
    const curIdx = p.year * 400 + p.month * 31 + p.day
    const targetIdx = jy * 400 + jm * 31 + jd
    if (curIdx < targetIdx) {
      guess = new Date(guess.getTime() + 86400000)
    } else {
      guess = new Date(guess.getTime() - 86400000)
    }
  }
  return guess.toISOString().slice(0, 10)
}

export function todayJalali(): JalaliDate {
  return partsFor(new Date())
}

// نسخه محلی (بدون فرض UTC) برای لحظه‌های دقیق زمانی مثل تاریخ/ساعت تسویه
function partsForLocal(date: Date): JalaliDate {
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const parts = fmt.formatToParts(date)
  const y = Number(parts.find((p) => p.type === 'year')!.value)
  const m = Number(parts.find((p) => p.type === 'month')!.value)
  const d = Number(parts.find((p) => p.type === 'day')!.value)
  return { year: y, month: m, day: d }
}

// نمایش تاریخ و ساعت شمسی برای یک timestamp دقیق (مثل تاریخ تسویه چک/قسط)
export function formatJalaliDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '-'
  const d = new Date(isoDateTime)
  const j = partsForLocal(d)
  const p = (n: number) => String(n).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${j.year}/${p(j.month)}/${p(j.day)} - ${hh}:${mm}`
}

export const jalaliMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
