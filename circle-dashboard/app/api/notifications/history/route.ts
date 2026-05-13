import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/notifications/history?status=all|active|resolved&limit=200
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'
  const limit = Math.min(500, Number(searchParams.get('limit') || '200'))

  try {
    const where: Record<string, unknown> = {}
    if (status === 'active') where.resolved_at = null
    else if (status === 'resolved') where.resolved_at = { not: null }

    const data = await prisma.notifications.findMany({
      where: where as never,
      orderBy: { last_seen_at: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        severity: true,
        title: true,
        count: true,
        link_href: true,
        first_seen_at: true,
        last_seen_at: true,
        resolved_at: true,
      },
    })

    return NextResponse.json({ success: true, data, total: data.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
