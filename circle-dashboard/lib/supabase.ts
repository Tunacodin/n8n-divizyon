import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

// ─── Status Tanimlari ───

export const APPLICATION_STATUSES = [
  'basvuru',
  'kontrol',
  'kesin_kabul',
  'kesin_ret',
  'nihai_olmayan',
  'yas_kucuk',
  'etkinlik',
  'deaktive',
  'nihai_uye',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  basvuru: 'Başvuru',
  kontrol: 'Kontrol',
  kesin_kabul: 'Kesin Kabul',
  kesin_ret: 'Kesin Ret',
  nihai_olmayan: 'Nihai Olmayan',
  yas_kucuk: '18 Yaş Altı',
  etkinlik: 'Etkinlikten Gelenler',
  deaktive: 'Deaktive',
  nihai_uye: 'Nihai Ağ Üyesi',
}

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  basvuru: '#3B82F6',
  kontrol: '#EAB308',
  kesin_kabul: '#22C55E',
  kesin_ret: '#EF4444',
  nihai_olmayan: '#A855F7',
  yas_kucuk: '#F97316',
  etkinlik: '#06B6D4',
  deaktive: '#6B7280',
  nihai_uye: '#D97706',
}

// ─── Audit Log Helper ───

export async function withAuditLog(
  db: ReturnType<typeof createClient>,
  params: {
    entityType: string
    entityId: string
    action: string
    actor: string
    oldValues?: Record<string, unknown>
    newValues?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
) {
  const { error } = await db.from('audit_log').insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    actor: params.actor,
    old_values: params.oldValues ?? null,
    new_values: params.newValues ?? null,
    metadata: params.metadata ?? null,
  })
  if (error) console.error('Audit log error:', error)
}

// ─── Snapshot Helper ───

export async function createSnapshot(
  db: ReturnType<typeof createClient>,
  applicationId: string,
  triggerAction: string,
  createdBy: string
) {
  const { data: app } = await db
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (!app) return null

  const { error } = await db.from('application_snapshots').insert({
    application_id: applicationId,
    snapshot: app,
    trigger_action: triggerAction,
    created_by: createdBy,
  })
  if (error) console.error('Snapshot error:', error)
  return app
}

// ─── Status Degistirme ───

export async function changeStatus(
  db: ReturnType<typeof createClient>,
  params: {
    applicationId: string
    toStatus: ApplicationStatus
    changedBy: string
    reason?: string
    extraUpdates?: Record<string, unknown>
  }
) {
  // 1. Mevcut basvuruyu al
  const { data: app, error: fetchError } = await db
    .from('applications')
    .select('*')
    .eq('id', params.applicationId)
    .single()

  if (fetchError || !app) {
    return { success: false, error: 'Başvuru bulunamadı' }
  }

  const fromStatus = app.status

  // 2. İs kurali: kesin_kabul/kesin_ret icin degerlendiren zorunlu
  if (['kesin_kabul', 'kesin_ret'].includes(params.toStatus)) {
    const reviewer = params.extraUpdates?.reviewer || app.reviewer
    if (!reviewer || reviewer === 'Otomasyon') {
      return { success: false, error: 'Kesin kabul/ret için değerlendiren gerekli' }
    }
  }

  // 2b. İs kurali: nihai_uye icin 3 task zorunlu
  if (params.toStatus === 'nihai_uye') {
    const { data: tasks } = await db
      .from('task_completions')
      .select('task_type, completed')
      .eq('application_id', params.applicationId)
      .eq('completed', true)

    const completedTypes = new Set((tasks || []).map((t: { task_type: string }) => t.task_type))
    const required = ['karakteristik_envanter', 'disipliner_envanter', 'oryantasyon']
    const missing = required.filter((t) => !completedTypes.has(t))

    if (missing.length > 0) {
      const labels: Record<string, string> = {
        karakteristik_envanter: 'Karakteristik Envanter Testi',
        disipliner_envanter: 'Disipliner Envanter Testi',
        oryantasyon: 'Oryantasyon',
      }
      const missingLabels = missing.map((m) => labels[m]).join(', ')
      return {
        success: false,
        error: `Nihai ağ üyesine taşınamaz. Eksik: ${missingLabels}`,
        missing_tasks: missing,
      }
    }
  }

  // 3. Snapshot al
  await createSnapshot(db, params.applicationId, 'status_change', params.changedBy)

  // 4. Status guncelle
  const updates: Record<string, unknown> = {
    status: params.toStatus,
    ...params.extraUpdates,
  }

  const { error: updateError } = await db
    .from('applications')
    .update(updates)
    .eq('id', params.applicationId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 5. Status history kaydet
  await db.from('status_history').insert({
    application_id: params.applicationId,
    from_status: fromStatus,
    to_status: params.toStatus,
    changed_by: params.changedBy,
    reason: params.reason ?? null,
    change_type: 'normal',
  })

  // 6. Audit log
  await withAuditLog(db, {
    entityType: 'application',
    entityId: params.applicationId,
    action: 'status_change',
    actor: params.changedBy,
    oldValues: { status: fromStatus },
    newValues: { status: params.toStatus, ...params.extraUpdates },
  })

  return { success: true, fromStatus, toStatus: params.toStatus }
}

// ─── Application Guncelleme ───

export async function updateApplication(
  db: ReturnType<typeof createClient>,
  params: {
    applicationId: string
    updates: Record<string, unknown>
    updatedBy: string
  }
) {
  // 1. Mevcut hali al
  const { data: app, error: fetchError } = await db
    .from('applications')
    .select('*')
    .eq('id', params.applicationId)
    .single()

  if (fetchError || !app) {
    return { success: false, error: 'Başvuru bulunamadı' }
  }

  // 2. Snapshot
  await createSnapshot(db, params.applicationId, 'field_update', params.updatedBy)

  // 3. Guncelle
  const { error: updateError } = await db
    .from('applications')
    .update(params.updates)
    .eq('id', params.applicationId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 4. Audit log
  const changedFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params.updates)) {
    if ((app as Record<string, unknown>)[key] !== value) {
      changedFields[key] = { old: (app as Record<string, unknown>)[key], new: value }
    }
  }

  await withAuditLog(db, {
    entityType: 'application',
    entityId: params.applicationId,
    action: 'update',
    actor: params.updatedBy,
    oldValues: changedFields,
    newValues: params.updates,
  })

  return { success: true }
}

// ─── Rollback ───

export async function rollbackApplication(
  db: ReturnType<typeof createClient>,
  applicationId: string,
  rolledBackBy: string
) {
  // Son snapshot'i al
  const { data: snapshot } = await db
    .from('application_snapshots')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!snapshot) {
    return { success: false, error: 'Geri alınacak snapshot bulunamadı' }
  }

  const snapshotData = snapshot.snapshot as Record<string, unknown>
  const { data: currentApp } = await db
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  // Snapshot'tan restore et (id, created_at haric)
  const { id: _id, created_at: _ca, ...restoreData } = snapshotData
  await db.from('applications').update(restoreData).eq('id', applicationId)

  // Status degistiyse history ekle
  if (currentApp && snapshotData.status !== currentApp.status) {
    await db.from('status_history').insert({
      application_id: applicationId,
      from_status: currentApp.status,
      to_status: snapshotData.status as string,
      changed_by: rolledBackBy,
      change_type: 'rollback',
      reason: 'Geri alma işlemi',
    })
  }

  await withAuditLog(db, {
    entityType: 'application',
    entityId: applicationId,
    action: 'rollback',
    actor: rolledBackBy,
    oldValues: currentApp as Record<string, unknown>,
    newValues: snapshotData,
    metadata: { snapshot_id: snapshot.id },
  })

  return { success: true, restoredStatus: snapshotData.status }
}

// ─── Query Helpers ───

export async function getApplicationsByStatus(
  db: ReturnType<typeof createClient>,
  status: ApplicationStatus,
  options?: { search?: string; sort?: string; order?: 'asc' | 'desc'; page?: number; limit?: number }
) {
  const { search, sort = 'submitted_at', order = 'desc', page = 1, limit = 50 } = options || {}
  const offset = (page - 1) * limit

  let query = db
    .from('applications')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  return query
}

export async function getAllApplicationsGrouped(db: ReturnType<typeof createClient>) {
  const { data, error } = await db
    .from('applications')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) return { data: null, error }

  const grouped: Record<string, typeof data> = {}
  for (const status of APPLICATION_STATUSES) {
    grouped[status] = []
  }
  for (const app of data || []) {
    const s = app.status as ApplicationStatus
    if (grouped[s]) grouped[s].push(app)
  }

  return { data: grouped, error: null }
}

export async function getDashboardStats(db: ReturnType<typeof createClient>) {
  const { data, error } = await db
    .from('applications')
    .select('status')

  if (error) return { data: null, error }

  const counts: Record<string, number> = {}
  for (const status of APPLICATION_STATUSES) {
    counts[status] = 0
  }
  for (const row of data || []) {
    counts[row.status] = (counts[row.status] || 0) + 1
  }

  return {
    data: {
      total: data?.length || 0,
      breakdown: counts,
    },
    error: null,
  }
}

export async function getTimelineData(
  db: ReturnType<typeof createClient>,
  filters?: { from?: string; to?: string; status?: string }
) {
  let query = db
    .from('status_history')
    .select('*, applications(full_name, email)')
    .order('created_at', { ascending: false })

  if (filters?.from) {
    query = query.gte('created_at', filters.from)
  }
  if (filters?.to) {
    query = query.lte('created_at', filters.to)
  }
  if (filters?.status) {
    query = query.eq('to_status', filters.status)
  }

  return query
}
