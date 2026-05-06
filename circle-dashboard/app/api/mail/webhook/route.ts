import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Resend webhook receiver. Resend'in webhook signing'i Svix ile yapilir
// (https://resend.com/docs/dashboard/webhooks/verify-webhook-requests).
//
// Endpoint URL'i Resend dashboard'una eklenir:
//   https://<domain>/api/mail/webhook
//
// RESEND_WEBHOOK_SECRET env'i Resend dashboard'undan alinir (whsec_...).

const STATUS_MAP: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.delivery_delayed': 'delivery_delayed',
  'email.failed': 'failed',
}

const TIMESTAMP_FIELD: Record<string, string> = {
  delivered: 'delivered_at',
  opened: 'opened_at',
  clicked: 'clicked_at',
  bounced: 'bounced_at',
  complained: 'complained_at',
  failed: 'failed_at',
}

function verifySvixSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): boolean {
  // Resend Svix secret format: "whsec_<base64>"
  const base64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let key: Buffer
  try {
    key = Buffer.from(base64, 'base64')
  } catch {
    return false
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${payload}`
  const expected = crypto.createHmac('sha256', key).update(signedPayload).digest('base64')

  // svix-signature: "v1,<sig> v1,<sig2>" formatinda olabilir; v1 imzasi varsa karsilastir
  const sigs = svixSignature.split(' ')
  for (const s of sigs) {
    const [version, sig] = s.split(',')
    if (version !== 'v1' || !sig) continue
    if (sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return true
    }
  }
  return false
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET eksik' }, { status: 500 })
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'svix headers eksik' }, { status: 400 })
  }

  const raw = await req.text()
  if (!verifySvixSignature(raw, svixId, svixTimestamp, svixSignature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const eventType = event.type || ''
  const data = event.data || {}
  const resendId = (data.email_id as string) || (data.id as string) || null
  const emailTo = Array.isArray(data.to) ? (data.to[0] as string) : (data.to as string) || null
  const errorMsg = (data as { error?: { message?: string } }).error?.message || null

  const db = createClient()

  // Ham event'i her zaman logla (replay/debug)
  await db.from('mail_events').insert({
    resend_id: resendId,
    event_type: eventType,
    email_to: emailTo,
    payload: event,
  })

  const newStatus = STATUS_MAP[eventType]
  if (!newStatus || !resendId) {
    return NextResponse.json({ ok: true, ignored: true, event_type: eventType })
  }

  // mail_logs guncelle: metadata->>'resend_id' uzerinden bul
  const tsField = TIMESTAMP_FIELD[newStatus]
  const updates: Record<string, unknown> = {
    status: newStatus,
    last_event_at: new Date().toISOString(),
  }
  if (tsField) updates[tsField] = new Date().toISOString()
  if (newStatus === 'failed' || newStatus === 'bounced') {
    if (errorMsg) updates.error_message = errorMsg
  }

  // Status precedence: delivered > opened > clicked, ama bounced/complained
  // gelirse her zaman uzerine yaz. Burada kucuk bir konservatif kural: terminal
  // event'ler (bounced/complained/failed) status'u her zaman override eder;
  // diger event'ler sadece status hala 'sent' veya 'queued' iken overrider.
  const terminal = newStatus === 'bounced' || newStatus === 'complained' || newStatus === 'failed'

  // Once bul
  const { data: log } = await db
    .from('mail_logs')
    .select('id, status')
    .filter('metadata->>resend_id', 'eq', resendId)
    .limit(1)
    .single()

  if (!log) {
    return NextResponse.json({ ok: true, no_log: true, resend_id: resendId, event_type: eventType })
  }

  const currentStatus = (log as { status: string }).status
  const shouldUpdate =
    terminal ||
    currentStatus === 'queued' ||
    currentStatus === 'sent' ||
    // delivered -> opened/clicked override edilir
    (currentStatus === 'delivered' && (newStatus === 'opened' || newStatus === 'clicked')) ||
    (currentStatus === 'opened' && newStatus === 'clicked')

  if (shouldUpdate) {
    await db.from('mail_logs').update(updates).eq('id', (log as { id: string }).id)
  } else {
    // Sadece timestamp ve last_event_at guncelle (status'u tutucu birak)
    const tsOnly: Record<string, unknown> = { last_event_at: updates.last_event_at }
    if (tsField) tsOnly[tsField] = updates[tsField]
    await db.from('mail_logs').update(tsOnly).eq('id', (log as { id: string }).id)
  }

  return NextResponse.json({ ok: true, log_id: (log as { id: string }).id, new_status: shouldUpdate ? newStatus : currentStatus })
}
