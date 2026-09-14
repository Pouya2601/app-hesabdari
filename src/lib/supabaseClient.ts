import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error('متغیرهای محیطی Supabase تنظیم نشده‌اند. فایل .env را بررسی کنید (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
