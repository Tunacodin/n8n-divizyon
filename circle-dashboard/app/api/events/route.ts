import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog } from '@/lib/supabase'
import { randomUUID } from 'crypto'

// GET /api/events
export async function GET() {
  try {
    const events = await prisma.events.findMany({
      orderBy: { event_date: 'desc' },
      include: { _count: { select: { event_attendees: true } } },
    })

    const data = events.map((e) => ({
      ...e,
      event_attendees: [{ count: e._count.event_attendees }],
      _count: undefined,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/events
export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.name) {
      return NextResponse.json({ success: false, error: 'name zorunlu' }, { status: 400 })
    }

    const qrToken = randomUUID()

    const data = await prisma.events.create({
      data: {
        name: body.name,
        description: body.description || null,
        event_date: body.event_date ? new Date(body.event_date) : null,
        location: body.location || null,
        qr_token: qrToken,
      },
    })

    await withAuditLog({
      entityType: 'event',
      entityId: data.id,
      action: 'create',
      actor: body.created_by || 'system',
      newValues: data as never,
    })

    return NextResponse.json(
      { success: true, data: { ...data, qr_url: `/etkinlik/${qrToken}` } },
      { status: 201 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
