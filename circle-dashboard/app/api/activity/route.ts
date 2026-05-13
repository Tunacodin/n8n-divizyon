import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 15

function generateMockActivities() {
  const now = Date.now()
  const h = (hours: number) => new Date(now - hours * 3600000).toISOString()
  const d = (days: number, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString()

  return [
    { id: 'm01', action: 'status_change', actor: 'Taha', person_name: 'Elif Yıldırım', person_email: 'elif@example.com', old_values: { status: 'kontrol' }, new_values: { status: 'kesin_kabul', reviewer: 'Taha' }, entity_id: 'mock-1', created_at: h(0.5), metadata: null },
    { id: 'm02', action: 'mail_sent', actor: 'Tuna', person_name: 'Elif Yıldırım', person_email: 'elif@example.com', old_values: null, new_values: { template: 'kesin-kabul', email: 'elif@example.com', subject: 'Divizyon Ağına Hoş Geldiniz!' }, entity_id: 'mock-1', created_at: h(0.6), metadata: null },
    { id: 'm03', action: 'evaluation_added', actor: 'Haksemin', person_name: 'Burak Çelik', person_email: 'burak.celik@example.com', old_values: null, new_values: { decision: 'kabul', notes: 'Motivasyonu yüksek, ekip çalışmasına yatkın.' }, entity_id: 'mock-2', created_at: h(1), metadata: null },
    { id: 'm04', action: 'task_completed', actor: 'Aslı', person_name: 'Zeynep Kara', person_email: 'zeynep.kara@example.com', old_values: null, new_values: { task_type: 'oryantasyon' }, entity_id: 'mock-3', created_at: h(1.5), metadata: null },
    { id: 'm05', action: 'warning_added', actor: 'Taha', person_name: 'Mert Özkan', person_email: 'mert.ozkan@example.com', old_values: null, new_values: { warning_number: 1, reason: 'Circle toplantısına 3 kez üst üste katılmadı.' }, entity_id: 'mock-4', created_at: h(2), metadata: null },
    { id: 'm06', action: 'create', actor: 'system', person_name: 'Deniz Aydın', person_email: 'deniz.aydin@example.com', old_values: null, new_values: { status: 'basvuru', full_name: 'Deniz Aydın' }, entity_id: 'mock-5', created_at: h(2.5), metadata: null },
    { id: 'm07', action: 'task_completed', actor: 'Gülse', person_name: 'Ece Demir', person_email: 'ece.demir@example.com', old_values: null, new_values: { task_type: 'karakteristik_envanter' }, entity_id: 'mock-6', created_at: h(3), metadata: null },
    { id: 'm08', action: 'status_change', actor: 'Tuna', person_name: 'Emre Aksoy', person_email: 'emre.aksoy@example.com', old_values: { status: 'kontrol' }, new_values: { status: 'kesin_ret', reviewer: 'Tuna' }, entity_id: 'mock-7', created_at: h(3.5), metadata: null },
    { id: 'm09', action: 'mail_sent', actor: 'Tuna', person_name: 'Emre Aksoy', person_email: 'emre.aksoy@example.com', old_values: null, new_values: { template: 'kesin-ret', email: 'emre.aksoy@example.com', subject: 'Başvurunuz Hakkında' }, entity_id: 'mock-7', created_at: h(3.6), metadata: null },
    { id: 'm10', action: 'status_change', actor: 'Buğra', person_name: 'Selin Yılmaz', person_email: 'selin.y@example.com', old_values: { status: 'kesin_kabul' }, new_values: { status: 'nihai_uye' }, entity_id: 'mock-8', created_at: d(1, 1), metadata: null },
    { id: 'm11', action: 'task_completed', actor: 'Aslı', person_name: 'Selin Yılmaz', person_email: 'selin.y@example.com', old_values: null, new_values: { task_type: 'disipliner_envanter' }, entity_id: 'mock-8', created_at: d(1, 1.5), metadata: null },
    { id: 'm12', action: 'evaluation_added', actor: 'Ertuğrul', person_name: 'Can Batur', person_email: 'can.batur@example.com', old_values: null, new_values: { decision: 'ret', notes: 'İlgi alanı topluluk vizyonuyla uyuşmuyor.' }, entity_id: 'mock-9', created_at: d(1, 2), metadata: null },
    { id: 'm13', action: 'status_change', actor: 'Ertuğrul', person_name: 'Can Batur', person_email: 'can.batur@example.com', old_values: { status: 'kontrol' }, new_values: { status: 'kesin_ret', reviewer: 'Ertuğrul' }, entity_id: 'mock-9', created_at: d(1, 2.1), metadata: null },
    { id: 'm14', action: 'warning_added', actor: 'Taha', person_name: 'Oğuz Han', person_email: 'oguz.han@example.com', old_values: null, new_values: { warning_number: 2, reason: 'Circle etkinliğinde uygunsuz davranış.' }, entity_id: 'mock-10', created_at: d(1, 3), metadata: null },
  ]
}

// GET /api/activity?limit=100&page=1&actor=Tuna&type=status_change&search=zeynep
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const limit = parseInt(searchParams.get('limit') || '100')
  const page = parseInt(searchParams.get('page') || '1')
  const actor = searchParams.get('actor')
  const actionType = searchParams.get('type')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const search = searchParams.get('search')
  const includeProtected = searchParams.get('include_protected') === 'true'

  try {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { entity_type: 'application' }
    if (actor) where.actor = { contains: actor, mode: 'insensitive' }
    if (actionType) where.action = actionType
    if (from || to) {
      const ca: Record<string, Date> = {}
      if (from) ca.gte = new Date(from)
      if (to) ca.lte = new Date(to)
      where.created_at = ca
    }

    const [logs, count] = await Promise.all([
      prisma.audit_log.findMany({
        where: where as never,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.audit_log.count({ where: where as never }),
    ])

    if (!logs || logs.length === 0) {
      let mockData = generateMockActivities()
      if (actionType) mockData = mockData.filter((m) => m.action === actionType)
      if (actor) mockData = mockData.filter((m) => m.actor.toLowerCase().includes(actor.toLowerCase()))
      if (search) {
        const s = search.toLowerCase()
        mockData = mockData.filter((m) =>
          m.person_name.toLowerCase().includes(s) ||
          m.actor.toLowerCase().includes(s) ||
          m.person_email.toLowerCase().includes(s),
        )
      }
      const pagedMock = mockData.slice(skip, skip + limit)
      return NextResponse.json({ success: true, total: mockData.length, page, limit, data: pagedMock })
    }

    const entityIds = Array.from(new Set(logs.map((l) => l.entity_id).filter(Boolean)))
    const apps = await prisma.applications.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, full_name: true, email: true, status: true, is_protected: true },
    })

    const appMap = new Map<string, { full_name: string; email: string; status: string; is_protected?: boolean | null }>()
    for (const app of apps) appMap.set(app.id, app)

    const filteredLogs = includeProtected
      ? logs
      : logs.filter((l) => {
          const a = appMap.get(l.entity_id)
          return !a?.is_protected
        })

    const activities = filteredLogs.map((log) => {
      const app = appMap.get(log.entity_id)
      const newValues = (log.new_values || {}) as Record<string, unknown>
      const personName =
        app?.full_name ||
        (newValues.full_name as string | undefined) ||
        (newValues.email ? String(newValues.email).split('@')[0] : null) ||
        'Bilinmeyen'
      const personEmail = app?.email || (newValues.email as string | undefined) || ''

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

    let filtered = activities
    if (search) {
      const s = search.toLowerCase()
      filtered = activities.filter(
        (a) =>
          a.person_name.toLowerCase().includes(s) ||
          a.actor.toLowerCase().includes(s) ||
          a.person_email.toLowerCase().includes(s),
      )
    }

    const total = (search || !includeProtected) ? filtered.length : count

    return NextResponse.json({ success: true, total, page, limit, data: filtered })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('Activity API error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
