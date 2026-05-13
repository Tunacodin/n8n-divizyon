import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  const base64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let key: Buffer
  try {
    key = Buffer.from(base64, 'base64')
  } catch {
    return false
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${payload}`
  const expected = crypto.createHmac('sha256', key).update(signedPayload).digest('base64')

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

  await prisma.mail_events.create({
    data: {
      resend_id: resendId,
      event_type: eventType,
      email_to: emailTo,
      payload: event as never,
    },
  })

  const newStatus = STATUS_MAP[eventType]
  if (!newStatus || !resendId) {
    return NextResponse.json({ ok: true, ignored: true, event_type: eventType })
  }

  const tsField = TIMESTAMP_FIELD[newStatus]
  const updates: Record<string, unknown> = {
    status: newStatus,
    last_event_at: new Date(),
  }
  if (tsField) updates[tsField] = new Date()
  if ((newStatus === 'failed' || newStatus === 'bounced') && errorMsg) {
    updates.error_message = errorMsg
  }

  const terminal = newStatus === 'bounced' || newStatus === 'complained' || newStatus === 'failed'

  // metadata->>'resend_id' filtresi için raw query
  const logs = await prisma.$queryRaw<Array<{ id: string; status: string | null }>>`
    SELECT id, status FROM mail_logs
    WHERE metadata->>'resend_id' = ${resendId}
    LIMIT 1
  `
  const log = logs[0]

  if (!log) {
    return NextResponse.json({ ok: true, no_log: true, resend_id: resendId, event_type: eventType })
  }

  const currentStatus = log.status || ''
  const shouldUpdate =
    terminal ||
    currentStatus === 'queued' ||
    currentStatus === 'sent' ||
    (currentStatus === 'delivered' && (newStatus === 'opened' || newStatus === 'clicked')) ||
    (currentStatus === 'opened' && newStatus === 'clicked')

  if (shouldUpdate) {
    await prisma.mail_logs.update({ where: { id: log.id }, data: updates as never })
  } else {
    const tsOnly: Record<string, unknown> = { last_event_at: updates.last_event_at }
    if (tsField) tsOnly[tsField] = updates[tsField]
    await prisma.mail_logs.update({ where: { id: log.id }, data: tsOnly as never })
  }

  return NextResponse.json({ ok: true, log_id: log.id, new_status: shouldUpdate ? newStatus : currentStatus })
}
