import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'

export const revalidate = 60

// GET /api/inventory-tests?email=ali@test.com
export async function GET(req: Request) {
  const db = createClient()
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  try {
    let query = db
      .from('inventory_tests')
      .select('*, applications(full_name, status)')
      .order('submitted_at', { ascending: false })

    if (email) {
      query = query.eq('email', email.toLowerCase())
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, total: data?.length || 0, data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/inventory-tests
export async function POST(req: Request) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.email) {
      return NextResponse.json({ success: false, error: 'email zorunlu' }, { status: 400 })
    }

    // Application ile esle
    const { data: app } = await db
      .from('applications')
      .select('id')
      .eq('email', body.email.toLowerCase().trim())
      .single()

    const { data, error } = await db
      .from('inventory_tests')
      .insert({
        ...body,
        email: body.email.toLowerCase().trim(),
        application_id: app?.id || null,
      })
      .select()
      .single()

    if (error) throw error

    // Task completion guncelle
    if (app?.id) {
      await db.from('task_completions').upsert({
        application_id: app.id,
        task_type: 'karakteristik_envanter',
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'application_id,task_type' })

      await withAuditLog(db, {
        entityType: 'application',
        entityId: app.id,
        action: 'inventory_test_completed',
        actor: 'system',
        newValues: { total_score: body.total_score, scores: body.scores },
      })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
