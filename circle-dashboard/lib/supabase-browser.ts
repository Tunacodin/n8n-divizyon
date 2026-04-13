'use client'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let _browserClient: SupabaseClient | null = null

export function getBrowserClient(): SupabaseClient {
  if (_browserClient) return _browserClient
  _browserClient = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  })
  return _browserClient
}
