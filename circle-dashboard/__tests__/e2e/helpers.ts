import dotenv from 'dotenv'
import path from 'path'

// .env.local dosyasini yukle
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

export const TEST_EMAIL = 'tunabstncx@gmail.com'
export const TEST_USER = {
  email: TEST_EMAIL,
  full_name: 'Test Kullanici E2E',
  phone: '05551234567',
  created_by: 'e2e-test',
}

/**
 * API'ye fetch yapar, JSON doner
 */
export async function api<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<{ status: number; body: T }> {
  const url = `${BASE_URL}${endpoint}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body: body as T }
}

/**
 * Test sonrasi temizlik: test kullanicisinin tum verilerini sil
 */
export async function cleanupTestData(applicationId?: string) {
  if (!applicationId) return

  const { createClient } = await import('../../lib/supabase')
  const db = createClient()

  // Iliskili verileri sil (foreign key sirasi onemli)
  await db.from('mail_logs').delete().eq('application_id', applicationId)
  await db.from('warnings').delete().eq('application_id', applicationId)
  await db.from('evaluations').delete().eq('application_id', applicationId)
  await db.from('task_completions').delete().eq('application_id', applicationId)
  await db.from('application_snapshots').delete().eq('application_id', applicationId)
  await db.from('status_history').delete().eq('application_id', applicationId)
  await db.from('audit_log').delete().eq('entity_id', applicationId)
  // Son olarak application'i sil
  await db.from('applications').delete().eq('id', applicationId)
}

/**
 * Varolan test kullanicisini email ile bul ve temizle
 */
export async function cleanupByEmail(email: string) {
  const { createClient } = await import('../../lib/supabase')
  const db = createClient()

  const { data } = await db
    .from('applications')
    .select('id')
    .eq('email', email.toLowerCase().trim())

  if (data) {
    for (const app of data) {
      await cleanupTestData(app.id)
    }
  }

  // Test ile ilgili audit loglarini da temizle
  await db.from('audit_log').delete().eq('actor', 'e2e-test')
  // Test mail loglarini temizle
  await db.from('mail_logs').delete().eq('email_to', email.toLowerCase().trim())
}
