#!/usr/bin/env node
// Admin ekle/güncelle. Kullanım:
//   node scripts/add-admin.mjs <email> <password>
// Örnek:
//   node scripts/add-admin.mjs tunabstncx@gmail.com MyPass123

import { createClient } from '@supabase/supabase-js'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env.local yükle
try {
  const envPath = resolve(__dirname, '..', '.env.local')
  const envText = readFileSync(envPath, 'utf8')
  for (const line of envText.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local)')
  process.exit(1)
}

const email = (process.argv[2] || '').trim().toLowerCase()
const password = process.argv[3] || ''

if (!email || !password) {
  console.error('❌ Kullanım: node scripts/add-admin.mjs <email> <password>')
  process.exit(1)
}

function b64url(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return Buffer.from(s, 'binary').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hashPassword(pw, salt) {
  const enc = new TextEncoder()
  const key = await webcrypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  )
  return b64url(new Uint8Array(bits))
}

const salt = b64url(webcrypto.getRandomValues(new Uint8Array(16)))
const hash = await hashPassword(password, salt)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const { data: existing } = await supabase
  .from('admin_users')
  .select('id')
  .eq('email', email)
  .maybeSingle()

if (existing) {
  const { error } = await supabase
    .from('admin_users')
    .update({ password_hash: hash, password_salt: salt })
    .eq('id', existing.id)
  if (error) { console.error('❌', error.message); process.exit(1) }
  console.log(`✅ Şifre güncellendi: ${email}`)
} else {
  const { error } = await supabase
    .from('admin_users')
    .insert({ email, password_hash: hash, password_salt: salt })
  if (error) { console.error('❌', error.message); process.exit(1) }
  console.log(`✅ Admin oluşturuldu: ${email}`)
}
