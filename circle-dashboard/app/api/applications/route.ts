import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  type ApplicationStatus,
} from '@/lib/supabase'

export const revalidate = 30

// GET /api/applications?status=kontrol&search=ali&sort=submitted_at&order=desc&page=1&limit=50
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status') as ApplicationStatus | null
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'submitted_at'
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '500')
  const grouped = searchParams.get('grouped') === 'true'

  try {
    if (grouped) {
      const data = await prisma.applications.findMany({ orderBy: { [sort]: order } as never })

      const groups: Record<string, { label: string; color: string; count: number; data: typeof data }> = {}
      for (const s of APPLICATION_STATUSES) {
        groups[s] = { label: STATUS_LABELS[s], color: STATUS_COLORS[s], count: 0, data: [] }
      }
      for (const app of data) {
        const s = app.status as ApplicationStatus
        if (groups[s]) { groups[s].data.push(app); groups[s].count++ }
      }

      return NextResponse.json({
        success: true,
        total: data.length,
        breakdown: Object.fromEntries(
          Object.entries(groups).map(([k, v]) => [k, { label: v.label, color: v.color, count: v.count }]),
        ),
        data: groups,
      })
    }

    const skip = (page - 1) * limit
    const where: Record<string, unknown> = {}

    if (status) {
      const statuses = status.split(',').filter((s) => APPLICATION_STATUSES.includes(s as ApplicationStatus))
      if (statuses.length === 1) where.status = statuses[0]
      else if (statuses.length > 1) where.status = { in: statuses }
    }

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, count] = await Promise.all([
      prisma.applications.findMany({
        where: where as never,
        orderBy: { [sort]: order } as never,
        skip,
        take: limit,
      }),
      prisma.applications.count({ where: where as never }),
    ])

    let enrichedData: Array<Record<string, unknown>> = data as never

    const withParam = searchParams.get('with')
    if (withParam && enrichedData.length > 0) {
      const includes = new Set(withParam.split(',').map((s) => s.trim()))
      const ids = enrichedData.map((a) => a.id as string)

      const [tasks, warnings, inventory] = await Promise.all([
        includes.has('tasks')
          ? prisma.task_completions.findMany({
              where: { application_id: { in: ids } },
              select: { application_id: true, task_type: true, completed: true, completed_at: true, verified_by: true },
            })
          : Promise.resolve([] as Array<Record<string, unknown>>),
        includes.has('warnings')
          ? prisma.warnings.findMany({
              where: { application_id: { in: ids } },
              select: { application_id: true, warning_number: true, warned_by: true, reason: true, warned_at: true, form_type: true },
            })
          : Promise.resolve([] as Array<Record<string, unknown>>),
        includes.has('inventory')
          ? prisma.inventory_tests.findMany({
              where: { application_id: { in: ids } },
              select: { application_id: true, email: true, test_type: true, discipline: true, total_score: true, submitted_at: true },
            })
          : Promise.resolve([] as Array<Record<string, unknown>>),
      ])

      const tasksByApp = new Map<string, Array<Record<string, unknown>>>()
      for (const t of tasks as Array<{ application_id: string }>) {
        const k = t.application_id
        if (!tasksByApp.has(k)) tasksByApp.set(k, [])
        tasksByApp.get(k)!.push(t as never)
      }
      const warningsByApp = new Map<string, Array<Record<string, unknown>>>()
      for (const w of warnings as Array<{ application_id: string }>) {
        const k = w.application_id
        if (!warningsByApp.has(k)) warningsByApp.set(k, [])
        warningsByApp.get(k)!.push(w as never)
      }
      const invByApp = new Map<string, Array<Record<string, unknown>>>()
      for (const i of inventory as Array<{ application_id: string | null }>) {
        const k = i.application_id
        if (!k) continue
        if (!invByApp.has(k)) invByApp.set(k, [])
        invByApp.get(k)!.push(i as never)
      }

      enrichedData = enrichedData.map((a) => ({
        ...a,
        ...(includes.has('tasks') ? { tasks: tasksByApp.get(a.id as string) || [] } : {}),
        ...(includes.has('warnings') ? { warnings: warningsByApp.get(a.id as string) || [] } : {}),
        ...(includes.has('inventory') ? { inventory_tests: invByApp.get(a.id as string) || [] } : {}),
      }))
    }

    return NextResponse.json({
      success: true,
      total: count,
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

// POST /api/applications
export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.email || !body.full_name) {
      return NextResponse.json({ success: false, error: 'email ve full_name zorunlu' }, { status: 400 })
    }

    const email = (body.email as string).toLowerCase().trim()
    const existing = await prisma.applications.findFirst({ where: { email }, select: { id: true } })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Bu email ile zaten başvuru var', duplicate: true },
        { status: 409 },
      )
    }

    const { created_by, ...insertData } = body as Record<string, unknown>

    const data = await prisma.applications.create({
      data: {
        ...(insertData as never),
        email,
        status: (body.status as string) || 'basvuru',
      },
    })

    const actor = (created_by as string) || 'system'

    await prisma.status_history.create({
      data: {
        application_id: data.id,
        from_status: null,
        to_status: data.status,
        changed_by: actor,
        change_type: 'normal',
      },
    })

    await prisma.audit_log.create({
      data: {
        entity_type: 'application',
        entity_id: data.id,
        action: 'create',
        actor,
        new_values: data as never,
      },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('POST /api/applications error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
