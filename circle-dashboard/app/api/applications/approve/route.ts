import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { n8nClient } from '@/lib/n8n'
import crypto from 'crypto'

// 5 dakikalik idempotency penceresi — ayni email+action bu sure icinde
// gelirse, kayitli cevap dondurulur, webhook tekrar tetiklenmez.
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000

function makeKey(email: string, action: string, providedKey?: string): string {
  if (providedKey) return providedKey
  // Default: email|action|5dk-bucket. 5 dakikalik bucket sayesinde aralikli
  // tekrar denemeler ayni key'e dusup deduplicate olur.
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS)
  const raw = `${email.toLowerCase().trim()}|${action.toLowerCase().trim()}|${bucket}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, action, idempotency_key } = body

    if (!email || !action) {
      return NextResponse.json(
        { error: 'Email and action are required' },
        { status: 400 }
      )
    }

    const db = createClient()
    const key = makeKey(email, action, idempotency_key || request.headers.get('idempotency-key') || undefined)

    // Var mi? — varsa kayitli cevabi don, webhook'u tekrar tetikleme
    const { data: existing } = await db
      .from('approval_idempotency')
      .select('response, created_at')
      .eq('key', key)
      .single()

    if (existing) {
      const ageMs = Date.now() - new Date(existing.created_at).getTime()
      if (ageMs < IDEMPOTENCY_WINDOW_MS) {
        return NextResponse.json({
          ...(existing.response as Record<string, unknown>),
          idempotent: true,
          age_seconds: Math.round(ageMs / 1000),
        })
      }
    }

    // Trigger n8n webhook (manuel-onay)
    const webhookPath = `manuel-onay/${encodeURIComponent(email)}?action=${action}`
    const result = await n8nClient.triggerWebhook(webhookPath)

    const response = {
      success: true,
      message: `Application ${action}ed successfully`,
      email,
      result,
      idempotency_key: key,
    }

    // Kayda ekle (best-effort, hata olursa sessiz gec)
    try {
      await db.from('approval_idempotency').upsert({
        key,
        email: email.toLowerCase().trim(),
        action,
        response,
      })
    } catch {}

    return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
