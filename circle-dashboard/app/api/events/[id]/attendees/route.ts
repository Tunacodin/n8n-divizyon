import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog } from '@/lib/supabase'

// GET /api/events/[id]/attendees
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.event_attendees.findMany({
      where: { event_id: params.id },
      orderBy: { checked_in_at: 'desc' },
    })

    return NextResponse.json({ success: true, total: data.length, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/events/[id]/attendees — QR check-in
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    if (!body.email) {
      return NextResponse.json({ success: false, error: 'email zorunlu' }, { status: 400 })
    }

    const email = body.email.toLowerCase().trim()

    const existing = await prisma.event_attendees.findUnique({
      where: { event_id_email: { event_id: params.id, email } },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Bu kişi zaten check-in yapmış', duplicate: true },
        { status: 409 },
      )
    }

    const app = await prisma.applications.findFirst({ where: { email }, select: { id: true } })

    const data = await prisma.event_attendees.create({
      data: {
        event_id: params.id,
        application_id: app?.id || null,
        email,
        full_name: body.full_name || null,
        phone: body.phone || null,
        source: body.source || 'qr_scan',
      },
    })

    await withAuditLog({
      entityType: 'event',
      entityId: params.id,
      action: 'attendee_checkin',
      actor: 'system',
      newValues: { email, full_name: body.full_name },
    })

    return NextResponse.json({ success: true, data, is_applicant: !!app }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
