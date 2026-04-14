#!/usr/bin/env node
// Preview veya silme. Kullanım:
//   node scripts/cleanup-kesin-ret.mjs          → sadece listele (dry run)
//   node scripts/cleanup-kesin-ret.mjs --apply  → gerçekten sil

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const apply = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await db
  .from('applications')
  .select('id, full_name, email, status, is_protected, submitted_at')
  .eq('status', 'kesin_ret')

if (error) { console.error('❌', error); process.exit(1) }

const protectedRows = (data || []).filter(r => r.is_protected)
const deletable = (data || []).filter(r => !r.is_protected)

console.log(`Toplam kesin_ret: ${data?.length}`)
console.log(`  Korumalı (ATLANACAK): ${protectedRows.length}`)
console.log(`  Silinecek: ${deletable.length}`)

if (deletable.length === 0) {
  console.log('Silinecek kayıt yok, çıkılıyor.')
  process.exit(0)
}

console.log('\nSilinecekler (ilk 15):')
for (const r of deletable.slice(0, 15)) {
  console.log(`  - ${r.full_name || '(boş)'} | ${r.email} | ${r.submitted_at?.slice(0,10) || '—'}`)
}

if (!apply) {
  console.log('\n[DRY RUN] Gerçekten silmek için: --apply flag ekle')
  process.exit(0)
}

const ids = deletable.map(r => r.id)
console.log('\nİlişkili tabloları temizleniyor...')

// İlişkili kayıtları sil
const relatedTables = ['task_completions', 'warnings', 'reminders', 'mail_logs', 'inventory_tests', 'audit_log']
for (const tbl of relatedTables) {
  const { error: e, count } = await db.from(tbl).delete({ count: 'exact' }).in('application_id', ids)
  if (e) console.log(`  ⚠️  ${tbl}: ${e.message}`)
  else console.log(`  ✅ ${tbl}: ${count || 0} kayıt silindi`)
}

// Son olarak applications
const { error: appErr, count: appCount } = await db
  .from('applications')
  .delete({ count: 'exact' })
  .in('id', ids)
  .eq('is_protected', false) // ikinci güvenlik kontrolü

if (appErr) {
  console.error(`\n❌ applications silme hatası: ${appErr.message}`)
  process.exit(1)
}

console.log(`\n✅ ${appCount} kesin_ret başvurusu tamamen silindi.`)
