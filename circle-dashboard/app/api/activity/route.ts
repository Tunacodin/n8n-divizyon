import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
// Activity feed API — audit_log'dan okunakilir aktivite akisi

export const revalidate = 15

// ─── Mock Data ───

function generateMockActivities() {
  const now = Date.now()
  const h = (hours: number) => new Date(now - hours * 3600000).toISOString()
  const d = (days: number, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString()

  return [
    // — Bugün —
    { id: 'm01', action: 'status_change', actor: 'Taha', person_name: 'Elif Yıldırım', person_email: 'elif@example.com', old_values: { status: 'kontrol' }, new_values: { status: 'kesin_kabul', reviewer: 'Taha' }, entity_id: 'mock-1', created_at: h(0.5), metadata: null },
    { id: 'm02', action: 'mail_sent', actor: 'Tuna', person_name: 'Elif Yıldırım', person_email: 'elif@example.com', old_values: null, new_values: { template: 'kesin-kabul', email: 'elif@example.com', subject: 'Divizyon Ağına Hoş Geldiniz!' }, entity_id: 'mock-1', created_at: h(0.6), metadata: null },
    { id: 'm03', action: 'evaluation_added', actor: 'Haksemin', person_name: 'Burak Çelik', person_email: 'burak.celik@example.com', old_values: null, new_values: { decision: 'kabul', notes: 'Motivasyonu yüksek, ekip çalışmasına yatkın.' }, entity_id: 'mock-2', created_at: h(1), metadata: null },
    { id: 'm04', action: 'task_completed', actor: 'Aslı', person_name: 'Zeynep Kara', person_email: 'zeynep.kara@example.com', old_values: null, new_values: { task_type: 'oryantasyon' }, entity_id: 'mock-3', created_at: h(1.5), metadata: null },
    { id: 'm05', action: 'warning_added', actor: 'Taha', person_name: 'Mert Özkan', person_email: 'mert.ozkan@example.com', old_values: null, new_values: { warning_number: 1, reason: 'Circle toplantısına 3 kez üst üste katılmadı.' }, entity_id: 'mock-4', created_at: h(2), metadata: null },
    { id: 'm06', action: 'create', actor: 'system', person_name: 'Deniz Aydın', person_email: 'deniz.aydin@example.com', old_values: null, new_values: { status: 'basvuru', full_name: 'Deniz Aydın' }, entity_id: 'mock-5', created_at: h(2.5), metadata: null },
    { id: 'm07', action: 'task_completed', actor: 'Gülse', person_name: 'Ece Demir', person_email: 'ece.demir@example.com', old_values: null, new_values: { task_type: 'karakteristik_envanter' }, entity_id: 'mock-6', created_at: h(3), metadata: null },
    { id: 'm08', action: 'status_change', actor: 'Tuna', person_name: 'Emre Aksoy', person_email: 'emre.aksoy@example.com', old_values: { status: 'kontrol' }, new_values: { status: 'kesin_ret', reviewer: 'Tuna' }, entity_id: 'mock-7', created_at: h(3.5), metadata: null },
    { id: 'm09', action: 'mail_sent', actor: 'Tuna', person_name: 'Emre Aksoy', person_email: 'emre.aksoy@example.com', old_values: null, new_values: { template: 'kesin-ret', email: 'emre.aksoy@example.com', subject: 'Başvurunuz Hakkında' }, entity_id: 'mock-7', created_at: h(3.6), metadata: null },

    // — Dün —
    { id: 'm10', action: 'status_change', actor: 'Buğra', person_name: 'Selin Yılmaz', person_email: 'selin.y@example.com', old_values: { status: 'kesin_kabul' }, new_values: { status: 'nihai_uye' }, entity_id: 'mock-8', created_at: d(1, 1), metadata: null },
    { id: 'm11', action: 'task_completed', actor: 'Aslı', person_name: 'Selin Yılmaz', person_email: 'selin.y@example.com', old_values: null, new_values: { task_type: 'disipliner_envanter' }, entity_id: 'mock-8', created_at: d(1, 1.5), metadata: null },
    { id: 'm12', action: 'evaluation_added', actor: 'Ertuğrul', person_name: 'Can Batur', person_email: 'can.batur@example.com', old_values: null, new_values: { decision: 'ret', notes: 'İlgi alanı topluluk vizyonuyla uyuşmuyor.' }, entity_id: 'mock-9', created_at: d(1, 2), metadata: null },
    { id: 'm13', action: 'status_change', actor: 'Ertuğrul', person_name: 'Can Batur', person_email: 'can.batur@example.com', old_values: { status: 'kontrol' }, new_values: { status: 'kesin_ret', reviewer: 'Ertuğrul' }, entity_id: 'mock-9', created_at: d(1, 2.1), metadata: null },
    { id: 'm14', action: 'warning_added', actor: 'Taha', person_name: 'Oğuz Han', person_email: 'oguz.han@example.com', old_values: null, new_values: { warning_number: 2, reason: 'Circle etkinliğinde uygunsuz davranış.' }, entity_id: 'mock-10', created_at: d(1, 3), metadata: null },
    { id: 'm15', action: 'create', actor: 'system', person_name: 'Ayşe Korkmaz', person_email: 'ayse.k@example.com', old_values: null, new_values: { status: 'basvuru', full_name: 'Ayşe Korkmaz' }, entity_id: 'mock-11', created_at: d(1, 4), metadata: null },
    { id: 'm16', action: 'create', actor: 'system', person_name: 'Mehmet Çetin', person_email: 'mehmet.c@example.com', old_values: null, new_values: { status: 'basvuru', full_name: 'Mehmet Çetin' }, entity_id: 'mock-12', created_at: d(1, 4.5), metadata: null },
    { id: 'm17', action: 'mail_sent', actor: 'Gülse', person_name: 'Selin Yılmaz', person_email: 'selin.y@example.com', old_values: null, new_values: { template: 'oryantasyon', email: 'selin.y@example.com', subject: 'Oryantasyon Programı Bilgilendirmesi' }, entity_id: 'mock-8', created_at: d(1, 5), metadata: null },
    { id: 'm18', action: 'update', actor: 'Buğra', person_name: 'Zeynep Kara', person_email: 'zeynep.kara@example.com', old_values: { main_role: { old: 'Yazılım', new: 'Ürün Yönetimi' } }, new_values: { main_role: 'Ürün Yönetimi' }, entity_id: 'mock-3', created_at: d(1, 6), metadata: null },

    // — 2 gün önce —
    { id: 'm19', action: 'task_completed', actor: 'Haksemin', person_name: 'Burak Çelik', person_email: 'burak.celik@example.com', old_values: null, new_values: { task_type: 'oryantasyon' }, entity_id: 'mock-2', created_at: d(2, 1), metadata: null },
    { id: 'm20', action: 'batch_send', actor: 'Tuna', person_name: 'Toplu', person_email: '', old_values: null, new_values: { count: 12, template: 'bilgilendirme' }, entity_id: 'mock-batch', created_at: d(2, 2), metadata: null },
    { id: 'm21', action: 'status_change', actor: 'Taha', person_name: 'Furkan Şahin', person_email: 'furkan.s@example.com', old_values: { status: 'basvuru' }, new_values: { status: 'kontrol' }, entity_id: 'mock-13', created_at: d(2, 3), metadata: null },
    { id: 'm22', action: 'evaluation_added', actor: 'Gülse', person_name: 'Furkan Şahin', person_email: 'furkan.s@example.com', old_values: null, new_values: { decision: 'kabul', notes: 'Girişimcilik deneyimi güçlü.' }, entity_id: 'mock-13', created_at: d(2, 3.5), metadata: null },
    { id: 'm23', action: 'warning_added', actor: 'Ertuğrul', person_name: 'Kaan Arslan', person_email: 'kaan.a@example.com', old_values: null, new_values: { warning_number: 1, reason: 'Circle görevlerini zamanında tamamlamadı.' }, entity_id: 'mock-14', created_at: d(2, 4), metadata: null },
    { id: 'm24', action: 'rollback', actor: 'Tuna', person_name: 'Defne Yıldız', person_email: 'defne.y@example.com', old_values: { status: 'kesin_ret' }, new_values: { status: 'kontrol' }, entity_id: 'mock-15', created_at: d(2, 5), metadata: null },
    { id: 'm25', action: 'task_uncompleted', actor: 'Aslı', person_name: 'Ece Demir', person_email: 'ece.demir@example.com', old_values: null, new_values: { task_type: 'disipliner_envanter' }, entity_id: 'mock-6', created_at: d(2, 6), metadata: null },

    // — 3 gün önce —
    { id: 'm26', action: 'create', actor: 'system', person_name: 'Baran Koç', person_email: 'baran.koc@example.com', old_values: null, new_values: { status: 'basvuru', full_name: 'Baran Koç' }, entity_id: 'mock-16', created_at: d(3, 1), metadata: null },
    { id: 'm27', action: 'create', actor: 'system', person_name: 'İrem Şen', person_email: 'irem.sen@example.com', old_values: null, new_values: { status: 'basvuru', full_name: 'İrem Şen' }, entity_id: 'mock-17', created_at: d(3, 1.5), metadata: null },
    { id: 'm28', action: 'status_change', actor: 'Haksemin', person_name: 'Arda Çelik', person_email: 'arda.c@example.com', old_values: { status: 'kontrol' }, new_values: { status: 'kesin_kabul', reviewer: 'Haksemin' }, entity_id: 'mock-18', created_at: d(3, 2), metadata: null },
    { id: 'm29', action: 'mail_sent', actor: 'Buğra', person_name: 'Arda Çelik', person_email: 'arda.c@example.com', old_values: null, new_values: { template: 'kesin-kabul', email: 'arda.c@example.com', subject: 'Divizyon Ağına Hoş Geldiniz!' }, entity_id: 'mock-18', created_at: d(3, 2.1), metadata: null },
    { id: 'm30', action: 'status_change', actor: 'Taha', person_name: 'Oğuz Han', person_email: 'oguz.han@example.com', old_values: { status: 'kesin_kabul' }, new_values: { status: 'deaktive' }, entity_id: 'mock-10', created_at: d(3, 4), metadata: null },
    { id: 'm31', action: 'task_completed', actor: 'Ertuğrul', person_name: 'Arda Çelik', person_email: 'arda.c@example.com', old_values: null, new_values: { task_type: 'karakteristik_envanter' }, entity_id: 'mock-18', created_at: d(3, 5), metadata: null },
    { id: 'm32', action: 'mail_sent', actor: 'Aslı', person_name: 'Can Batur', person_email: 'can.batur@example.com', old_values: null, new_values: { template: 'kesin-ret', email: 'can.batur@example.com', subject: 'Başvurunuz Hakkında' }, entity_id: 'mock-9', created_at: d(3, 6), metadata: null },
  ]
}

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

    // DB boşsa mock data dön
    if (!logs || logs.length === 0) {
      let mockData = generateMockActivities()

      if (actionType) mockData = mockData.filter(m => m.action === actionType)
      if (actor) mockData = mockData.filter(m => m.actor.toLowerCase().includes(actor.toLowerCase()))
      if (search) {
        const s = search.toLowerCase()
        mockData = mockData.filter(m =>
          m.person_name.toLowerCase().includes(s) ||
          m.actor.toLowerCase().includes(s) ||
          m.person_email.toLowerCase().includes(s)
        )
      }

      const pagedMock = mockData.slice(offset, offset + limit)
      return NextResponse.json({ success: true, total: mockData.length, page, limit, data: pagedMock })
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
