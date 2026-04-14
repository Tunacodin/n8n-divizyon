import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local','utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'')
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Sadece is_protected=true ve nihai_uye olan — mevcut sorting logic'inin döneceği ilk 10
const { data } = await db.from('applications')
  .select('full_name, accepted_invitation_at, last_seen_at, updated_at, is_protected')
  .eq('status','nihai_uye').eq('is_protected', true)

// Exactly the same sort as NihaiAgUyesiContent
const ts = (r) => Math.max(
  r.accepted_invitation_at ? new Date(r.accepted_invitation_at).getTime() : 0,
  r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0,
)
const sorted = [...data].sort((a,b) => ts(b) - ts(a))

console.log('--- İlk 10 (sort logic uygulanmış) ---')
for (const r of sorted.slice(0, 10)) {
  console.log(`  ${r.full_name?.padEnd(28)} | accept=${r.accepted_invitation_at?.slice(0,10)} | last_seen=${r.last_seen_at?.slice(0,10)}`)
}
