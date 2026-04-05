import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'

// GET /api/applications/[id]/evaluations
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const { data, error } = await db
      .from('evaluations')
      .select('*')
      .eq('application_id', params.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/applications/[id]/evaluations
// Body: { reviewer, decision, notes? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.reviewer || !body.decision) {
      return NextResponse.json(
        { success: false, error: 'reviewer ve decision zorunlu' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('evaluations')
      .insert({
        application_id: params.id,
        reviewer: body.reviewer,
        decision: body.decision,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) throw error

    // Application'daki reviewer ve review_note'u guncelle
    await db
      .from('applications')
      .update({
        reviewer: body.reviewer,
        review_note: body.notes || null,
        approval_status: body.decision,
      })
      .eq('id', params.id)

    await withAuditLog(db, {
      entityType: 'application',
      entityId: params.id,
      action: 'evaluation_added',
      actor: body.reviewer,
      newValues: { decision: body.decision, notes: body.notes },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
