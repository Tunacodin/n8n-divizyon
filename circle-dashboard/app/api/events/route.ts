import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'
import { randomUUID } from 'crypto'

// GET /api/events
export async function GET() {
  const db = createClient()

  try {
    const { data, error } = await db
      .from('events')
      .select('*, event_attendees(count)')
      .order('event_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/events
// Body: { name, description?, event_date?, location?, created_by }
export async function POST(req: Request) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.name) {
      return NextResponse.json({ success: false, error: 'name zorunlu' }, { status: 400 })
    }

    const qrToken = randomUUID()

    const { data, error } = await db
      .from('events')
      .insert({
        name: body.name,
        description: body.description || null,
        event_date: body.event_date || null,
        location: body.location || null,
        qr_token: qrToken,
      })
      .select()
      .single()

    if (error) throw error

    await withAuditLog(db, {
      entityType: 'event',
      entityId: data.id,
      action: 'create',
      actor: body.created_by || 'system',
      newValues: data,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        qr_url: `/etkinlik/${qrToken}`,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
