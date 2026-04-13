import { NextResponse } from 'next/server'
import {
  createClient,
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  type ApplicationStatus,
} from '@/lib/supabase'

export const revalidate = 30

// GET /api/applications?status=kontrol&search=ali&sort=submitted_at&order=desc&page=1&limit=50
export async function GET(req: Request) {
  const db = createClient()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status') as ApplicationStatus | null
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'submitted_at'
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '500')
  const grouped = searchParams.get('grouped') === 'true'

  try {
    // Grouped mode: tum statusleri gruplu don (ana sayfa icin)
    if (grouped) {
      const { data, error } = await db
        .from('applications')
        .select('*')
        .order(sort, { ascending: order === 'asc' })

      if (error) throw error

      const groups: Record<string, { label: string; color: string; count: number; data: typeof data }> = {}
      for (const s of APPLICATION_STATUSES) {
        groups[s] = {
          label: STATUS_LABELS[s],
          color: STATUS_COLORS[s],
          count: 0,
          data: [],
        }
      }
      for (const app of data || []) {
        const s = app.status as ApplicationStatus
        if (groups[s]) {
          groups[s].data.push(app)
          groups[s].count++
        }
      }

      return NextResponse.json({
        success: true,
        total: data?.length || 0,
        breakdown: Object.fromEntries(
          Object.entries(groups).map(([k, v]) => [k, { label: v.label, color: v.color, count: v.count }])
        ),
        data: groups,
      })
    }

    // Filtered mode: tek status veya tum
    const offset = (page - 1) * limit
    let query = db
      .from('applications')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    if (status) {
      const statuses = status.split(',').filter(s => APPLICATION_STATUSES.includes(s as ApplicationStatus))
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0])
      } else if (statuses.length > 1) {
        query = query.in('status', statuses)
      }
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    let enrichedData = data || []

    // ?with=tasks,warnings,inventory → toplu detay (N+1 yerine 3 paralel query)
    const withParam = searchParams.get('with')
    if (withParam && enrichedData.length > 0) {
      const includes = new Set(withParam.split(',').map(s => s.trim()))
      const ids = enrichedData.map((a: { id: string }) => a.id)

      const [tasksRes, warningsRes, invRes] = await Promise.all([
        includes.has('tasks')
          ? db.from('task_completions').select('application_id,task_type,completed,completed_at,verified_by').in('application_id', ids)
          : Promise.resolve({ data: null as null }),
        includes.has('warnings')
          ? db.from('warnings').select('application_id,warning_number,warned_by,reason,warned_at,form_type').in('application_id', ids)
          : Promise.resolve({ data: null as null }),
        includes.has('inventory')
          ? db.from('inventory_tests').select('application_id,email,test_type,discipline,total_score,submitted_at').in('application_id', ids)
          : Promise.resolve({ data: null as null }),
      ])

      const tasksByApp = new Map<string, Array<Record<string, unknown>>>()
      for (const t of (tasksRes.data as Array<{application_id: string}> | null) || []) {
        if (!tasksByApp.has(t.application_id)) tasksByApp.set(t.application_id, [])
        tasksByApp.get(t.application_id)!.push(t)
      }
      const warningsByApp = new Map<string, Array<Record<string, unknown>>>()
      for (const w of (warningsRes.data as Array<{application_id: string}> | null) || []) {
        if (!warningsByApp.has(w.application_id)) warningsByApp.set(w.application_id, [])
        warningsByApp.get(w.application_id)!.push(w)
      }
      const invByApp = new Map<string, Array<Record<string, unknown>>>()
      for (const i of (invRes.data as Array<{application_id: string}> | null) || []) {
        if (!invByApp.has(i.application_id)) invByApp.set(i.application_id, [])
        invByApp.get(i.application_id)!.push(i)
      }

      enrichedData = enrichedData.map((a: { id: string } & Record<string, unknown>) => ({
        ...a,
        ...(includes.has('tasks') ? { tasks: tasksByApp.get(a.id) || [] } : {}),
        ...(includes.has('warnings') ? { warnings: warningsByApp.get(a.id) || [] } : {}),
        ...(includes.has('inventory') ? { inventory_tests: invByApp.get(a.id) || [] } : {}),
      }))
    }

    return NextResponse.json({
      success: true,
      total: count || 0,
      page,
      limit,
      data: enrichedData,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('GET /api/applications error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/applications — yeni basvuru olustur (n8n'den gelir)
export async function POST(req: Request) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.email || !body.full_name) {
      return NextResponse.json(
        { success: false, error: 'email ve full_name zorunlu' },
        { status: 400 }
      )
    }

    // Duplicate check
    const { data: existing } = await db
      .from('applications')
      .select('id')
      .eq('email', body.email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Bu email ile zaten başvuru var', duplicate: true },
        { status: 409 }
      )
    }

    // created_by tabloda yok, ayir
    const { created_by, ...insertData } = body

    const { data, error } = await db
      .from('applications')
      .insert({
        ...insertData,
        email: body.email.toLowerCase().trim(),
        status: body.status || 'basvuru',
      })
      .select()
      .single()

    if (error) throw error

    const actor = created_by || 'system'

    // Status history
    await db.from('status_history').insert({
      application_id: data.id,
      from_status: null,
      to_status: data.status,
      changed_by: actor,
      change_type: 'normal',
    })

    // Audit log
    await db.from('audit_log').insert({
      entity_type: 'application',
      entity_id: data.id,
      action: 'create',
      actor,
      new_values: data,
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('POST /api/applications error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
