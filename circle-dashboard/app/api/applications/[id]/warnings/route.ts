import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'

// GET /api/applications/[id]/warnings
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const { data, error } = await db
      .from('warnings')
      .select('*')
      .eq('application_id', params.id)
      .order('warning_number', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/applications/[id]/warnings
// Body: { warned_by, reason? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.warned_by) {
      return NextResponse.json({ success: false, error: 'warned_by zorunlu' }, { status: 400 })
    }

    // Mevcut aktif uyari sayisini al
    const { count } = await db
      .from('warnings')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', params.id)
      .eq('is_active', true)

    const warningNumber = (count || 0) + 1

    const { data, error } = await db
      .from('warnings')
      .insert({
        application_id: params.id,
        warning_number: warningNumber,
        warned_by: body.warned_by,
        reason: body.reason || null,
      })
      .select()
      .single()

    if (error) throw error

    // Applications tablosundaki warning_count'u guncelle
    await db
      .from('applications')
      .update({ warning_count: warningNumber })
      .eq('id', params.id)

    await withAuditLog(db, {
      entityType: 'application',
      entityId: params.id,
      action: 'warning_added',
      actor: body.warned_by,
      newValues: { warning_number: warningNumber, reason: body.reason },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
