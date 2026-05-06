// Cron endpoint auth helper. Vercel Cron veya n8n schedule trigger'i tarafindan
// cagrildiginda, ortak bir secret ile dogrularnak gerekir.
//
// Kabul edilen header'lar:
//   - x-cron-secret: <CRON_SECRET>      (n8n schedule trigger)
//   - Authorization: Bearer <CRON_SECRET> (Vercel Cron — vercel.json'dan otomatik)

import { NextResponse } from 'next/server'

export function authorizeCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET env yok' },
      { status: 500 },
    )
  }

  const headerSecret = req.headers.get('x-cron-secret')
  const auth = req.headers.get('authorization') || ''
  const bearerSecret = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (headerSecret === secret || bearerSecret === secret) {
    return null // ok
  }

  return NextResponse.json(
    { success: false, error: 'unauthorized' },
    { status: 401 },
  )
}
