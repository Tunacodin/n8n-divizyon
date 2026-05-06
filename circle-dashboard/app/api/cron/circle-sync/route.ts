import { NextResponse } from 'next/server'
import { authorizeCron } from '@/lib/cron-auth'
import { POST as runCircleSync } from '@/app/api/circle-sync/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/cron/circle-sync
// Wrapper: mevcut /api/circle-sync POST'unu cron auth ile cagirir. Saatlik
// veya gunluk schedule ile (Vercel Cron / n8n) tetiklenmesi onerilir.
//
// /api/circle-sync zaten kendi x-sync-secret guard'ina sahip; biz burada cron
// secret'i ayri tutarak iki kanali ayri auth ediyoruz.

export async function POST(req: Request) {
  const unauth = authorizeCron(req)
  if (unauth) return unauth

  try {
    // Mevcut endpoint x-sync-secret bekliyor — internal cagriya gerekli header'i ekle
    const internalReq = new Request(req.url, {
      method: 'POST',
      headers: { 'x-sync-secret': process.env.CIRCLE_SYNC_SECRET || '' },
    })
    const res = await runCircleSync(internalReq)
    const body = await res.json()
    return NextResponse.json({ success: true, ran_at: new Date().toISOString(), result: body })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'bilinmeyen'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
