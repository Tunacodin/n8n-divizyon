import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/events/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.events.findUnique({
      where: { id: params.id },
      include: { event_attendees: true },
    })

    if (!data) {
      return NextResponse.json({ success: false, error: 'Etkinlik bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/events/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    if (body.event_date) body.event_date = new Date(body.event_date)

    const data = await prisma.events.update({
      where: { id: params.id },
      data: body,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
