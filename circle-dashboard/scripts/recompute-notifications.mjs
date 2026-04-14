#!/usr/bin/env node
// Stale (gerçeği yansıtmayan) bildirimleri anında çöz.
// /api/notifications endpoint'inin logic'ini tekrar çalıştırır, ama DB'ye direkt yazar.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const active = new Set()

// mail_bekleyen
const { count: mb } = await db.from('applications').select('*', { count: 'exact', head: true })
  .in('status', ['kesin_ret', 'yas_kucuk']).eq('mail_sent', false).neq('email', '')
if (mb) active.add('mail_bekleyen')

// kontrol_bekleyen
const oneDay = new Date(Date.now() - 86400000).toISOString()
const { count: kb } = await db.from('applications').select('*', { count: 'exact', head: true })
  .eq('status', 'kontrol').lt('created_at', oneDay)
if (kb) active.add('kontrol_bekleyen')

// oryantasyon_bekleyen
const { data: ok } = await db.from('applications').select('id').in('status', ['kesin_kabul', 'nihai_olmayan'])
if (ok && ok.length > 0) {
  const ids = ok.map(a => a.id)
  const { data: done } = await db.from('task_completions').select('application_id')
    .in('application_id', ids).eq('task_type', 'oryantasyon').eq('completed', true)
  const doneSet = new Set((done || []).map(t => t.application_id))
  if (ids.filter(id => !doneSet.has(id)).length > 0) active.add('oryantasyon_bekleyen')
}

const { data: openRows } = await db.from('notifications').select('id, type').is('resolved_at', null)
const now = new Date().toISOString()
let resolvedCount = 0
for (const r of openRows || []) {
  if (!active.has(r.type)) {
    await db.from('notifications').update({ resolved_at: now }).eq('id', r.id)
    console.log(`  ✓ Resolved: ${r.type}`)
    resolvedCount++
  }
}

console.log(`Aktif bildirim tipleri: ${[...active].join(', ') || '(yok)'}`)
console.log(`${resolvedCount} bildirim resolved olarak işaretlendi.`)
