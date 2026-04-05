import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/audit?entity_type=application&action=status_change&from=2025-01-01&limit=200
export async function GET(req: Request) {
  const db = createClient()
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
    const offset = (page - 1) * limit
    let query = db
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) query = query.eq('entity_type', entityType)
    if (entityId) query = query.eq('entity_id', entityId)
    if (action) query = query.eq('action', action)
    if (actor) query = query.eq('actor', actor)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      total: count || 0,
      page,
      limit,
      data: data || [],
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
