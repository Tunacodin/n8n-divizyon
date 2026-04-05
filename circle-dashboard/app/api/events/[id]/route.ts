import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/events/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const { data, error } = await db
      .from('events')
      .select('*, event_attendees(*)')
      .eq('id', params.id)
      .single()

    if (error || !data) {
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
  const db = createClient()

  try {
    const body = await req.json()

    const { data, error } = await db
      .from('events')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
