import { NextResponse } from 'next/server'
import { authorizeCron } from '@/lib/cron-auth'
import { GET as runNotificationsCheck } from '@/app/api/notifications/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/cron/notifications
// Mevcut /api/notifications GET handler'ini tetikleyici cagirir. Bunun yan etkisi
// olarak notifications tablosu (header cani) up-to-date olur — kimse dashboard'u
// acmasa bile.
//
// /api/notifications zaten idempotent (open/resolved upsert mantigi). Bu cron
// onun arkaplanda calismasini saglar (Vercel Cron 5dk veya n8n schedule).

export async function POST(req: Request) {
  const unauth = authorizeCron(req)
  if (unauth) return unauth

  try {
    const res = await runNotificationsCheck()
    const body = await res.json()
    return NextResponse.json({ success: true, ran_at: new Date().toISOString(), result: body })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'bilinmeyen'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
