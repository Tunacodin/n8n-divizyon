import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'

// GET /api/events/[id]/attendees
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const { data, error } = await db
      .from('event_attendees')
      .select('*')
      .eq('event_id', params.id)
      .order('checked_in_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, total: data?.length || 0, data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/events/[id]/attendees — QR check-in
// Body: { email, full_name?, phone? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.email) {
      return NextResponse.json({ success: false, error: 'email zorunlu' }, { status: 400 })
    }

    const email = body.email.toLowerCase().trim()

    // Duplicate check
    const { data: existing } = await db
      .from('event_attendees')
      .select('id')
      .eq('event_id', params.id)
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Bu kişi zaten check-in yapmış', duplicate: true },
        { status: 409 }
      )
    }

    // Application ile esle
    const { data: app } = await db
      .from('applications')
      .select('id')
      .eq('email', email)
      .single()

    const { data, error } = await db
      .from('event_attendees')
      .insert({
        event_id: params.id,
        application_id: app?.id || null,
        email,
        full_name: body.full_name || null,
        phone: body.phone || null,
        source: body.source || 'qr_scan',
      })
      .select()
      .single()

    if (error) throw error

    await withAuditLog(db, {
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
