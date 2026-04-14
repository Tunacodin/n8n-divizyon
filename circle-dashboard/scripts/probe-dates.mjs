import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local','utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'')
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error, count } = await db.from('applications')
  .select('full_name, accepted_invitation_at, last_seen_at, updated_at, circle_id', { count: 'exact' })
  .eq('status','nihai_uye').eq('is_protected', true)
  .order('accepted_invitation_at', { ascending: false, nullsFirst: false })
  .limit(10)
console.log('Toplam:', count)
if (error) console.log('err', error)
for (const r of data || []) {
  console.log({
    name: r.full_name,
    accepted: r.accepted_invitation_at,
    joined: r.joined_at,
    last_seen: r.last_seen_at,
    circle_id: r.circle_id,
  })
}
const nullCount = (await db.from('applications').select('id', { count:'exact', head:true }).eq('status','nihai_uye').eq('is_protected',true).is('accepted_invitation_at', null)).count
console.log('accepted_invitation_at NULL olan:', nullCount)
