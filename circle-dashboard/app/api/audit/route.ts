import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/audit?entity_type=application&action=status_change&from=2025-01-01&limit=200
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const entityType = searchParams.get('entity_type')
  const entityId = searchParams.get('entity_id')
  const action = searchParams.get('action')
  const actor = searchParams.get('actor')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '200')
  const page = parseInt(searchParams.get('page') || '1')

  try {
    const where: Record<string, unknown> = {}
    if (entityType) where.entity_type = entityType
    if (entityId) where.entity_id = entityId
    if (action) where.action = action
    if (actor) where.actor = actor
    if (from || to) {
      const ca: Record<string, Date> = {}
      if (from) ca.gte = new Date(from)
      if (to) ca.lte = new Date(to)
      where.created_at = ca
    }

    const skip = (page - 1) * limit
    const [data, count] = await Promise.all([
      prisma.audit_log.findMany({
        where: where as never,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.audit_log.count({ where: where as never }),
    ])

    return NextResponse.json({ success: true, total: count, page, limit, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
