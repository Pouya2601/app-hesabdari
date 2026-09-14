import { useEffect, useState } from 'react'
import { jalaliToGregorian, toJalali, todayJalali, jalaliMonths } from '../lib/jalali'

export default function JalaliDateInput({
  valueISO, onChange, label,
}: { valueISO: string; onChange: (iso: string) => void; label?: string }) {
  const initial = valueISO ? toJalali(valueISO) : todayJalali()
  const [y, setY] = useState(initial.year)
  const [m, setM] = useState(initial.month)
  const [d, setD] = useState(initial.day)

  useEffect(() => {
    const iso = jalaliToGregorian(y, m, d)
    onChange(iso)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, m, d])

  const years = Array.from({ length: 12 }, (_, i) => todayJalali().year - 6 + i)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <div className="min-w-0">
      {label && <label className="text-xs text-slate-400 block mb-1">{label}</label>}
      <div className="grid grid-cols-3 gap-1.5">
        <select value={d} onChange={(e) => setD(Number(e.target.value))} className="min-w-0 w-full bg-slate-800 text-white rounded-lg p-1.5 text-xs sm:text-sm sm:p-2">
          {days.map((day) => <option key={day} value={day}>{day}</option>)}
        </select>
        <select value={m} onChange={(e) => setM(Number(e.target.value))} className="min-w-0 w-full bg-slate-800 text-white rounded-lg p-1.5 text-xs sm:text-sm sm:p-2">
          {jalaliMonths.map((name, idx) => <option key={idx} value={idx + 1}>{name}</option>)}
        </select>
        <select value={y} onChange={(e) => setY(Number(e.target.value))} className="min-w-0 w-full bg-slate-800 text-white rounded-lg p-1.5 text-xs sm:text-sm sm:p-2">
          {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
        </select>
      </div>
    </div>
  )
}
