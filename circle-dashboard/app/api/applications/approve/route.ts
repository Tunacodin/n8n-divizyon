import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { n8nClient } from '@/lib/n8n'
import crypto from 'crypto'

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000

function makeKey(email: string, action: string, providedKey?: string): string {
  if (providedKey) return providedKey
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS)
  const raw = `${email.toLowerCase().trim()}|${action.toLowerCase().trim()}|${bucket}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, action, idempotency_key } = body

    if (!email || !action) {
      return NextResponse.json({ error: 'Email and action are required' }, { status: 400 })
    }

    const key = makeKey(email, action, idempotency_key || request.headers.get('idempotency-key') || undefined)

    const existing = await prisma.approval_idempotency.findUnique({ where: { key } })

    if (existing && existing.created_at) {
      const ageMs = Date.now() - existing.created_at.getTime()
      if (ageMs < IDEMPOTENCY_WINDOW_MS) {
        return NextResponse.json({
          ...(existing.response as Record<string, unknown>),
          idempotent: true,
          age_seconds: Math.round(ageMs / 1000),
        })
      }
    }

    const webhookPath = `manuel-onay/${encodeURIComponent(email)}?action=${action}`
    const result = await n8nClient.triggerWebhook(webhookPath)

    const response = {
      success: true,
      message: `Application ${action}ed successfully`,
      email,
      result,
      idempotency_key: key,
    }

    try {
      await prisma.approval_idempotency.upsert({
        where: { key },
        create: {
          key,
          email: email.toLowerCase().trim(),
          action,
          response: response as never,
        },
        update: { response: response as never, created_at: new Date() },
      })
    } catch {}

    return NextResponse.json(response)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
