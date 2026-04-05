import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
// Activity feed API — audit_log'dan okunakilir aktivite akisi

export const revalidate = 15

// GET /api/activity?limit=100&page=1&actor=Tuna&type=status_change&search=zeynep
export async function GET(req: Request) {
  const db = createClient()
  const { searchParams } = new URL(req.url)

  const limit = parseInt(searchParams.get('limit') || '100')
  const page = parseInt(searchParams.get('page') || '1')
  const actor = searchParams.get('actor')
  const actionType = searchParams.get('type')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const search = searchParams.get('search')

  try {
    const offset = (page - 1) * limit

    // 1. Audit log'lari cek (FK yok, join yapamayiz)
    let query = db
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('entity_type', 'application')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (actor) query = query.ilike('actor', `%${actor}%`)
    if (actionType) query = query.eq('action', actionType)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data: logs, count, error } = await query
    if (error) throw error

    if (!logs || logs.length === 0) {
      return NextResponse.json({ success: true, total: 0, page, limit, data: [] })
    }

    // 2. Benzersiz entity_id'leri topla ve applications tablosundan isimleri cek
    const entityIds = Array.from(new Set(logs.map((l: any) => l.entity_id).filter(Boolean)))
    const { data: apps } = await db
      .from('applications')
      .select('id, full_name, email, status')
      .in('id', entityIds)

    const appMap = new Map<string, { full_name: string; email: string; status: string }>()
    for (const app of apps || []) {
      appMap.set(app.id, app)
    }

    // 3. Aktivite kayitlarini zenginlestir
    const activities = logs.map((log: any) => {
      const app = appMap.get(log.entity_id)
      const personName =
        app?.full_name ||
        log.new_values?.full_name ||
        (log.new_values?.email ? log.new_values.email.split('@')[0] : null) ||
        'Bilinmeyen'
      const personEmail = app?.email || log.new_values?.email || ''

      return {
        id: log.id,
        action: log.action,
        actor: log.actor,
        person_name: personName,
        person_email: personEmail,
        old_values: log.old_values,
        new_values: log.new_values,
        entity_id: log.entity_id,
        created_at: log.created_at,
        metadata: log.metadata,
      }
    })

    // 4. Client-side arama filtresi
    let filtered = activities
    if (search) {
      const s = search.toLowerCase()
      filtered = activities.filter(
        (a: any) =>
          a.person_name.toLowerCase().includes(s) ||
          a.actor.toLowerCase().includes(s) ||
          a.person_email.toLowerCase().includes(s)
      )
    }

    return NextResponse.json({
      success: true,
      total: search ? filtered.length : (count || 0),
      page,
      limit,
      data: filtered,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('Activity API error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
