import { createClient } from '@supabase/supabase-js'

const publicSupabaseUrl = 'https://smelioysnkmiiechqsmw.supabase.co'
const publicSupabaseKey = 'sb_publishable_4U09bH3RocQUO544510tMg_k-qJxE4v'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  publicSupabaseUrl
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  publicSupabaseKey
) as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null
