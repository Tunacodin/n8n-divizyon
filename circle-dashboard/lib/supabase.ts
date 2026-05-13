// Eski Supabase API'sinin yerine Prisma kullanan helper'lar.
// Geriye uyumluluk için aynı isimlerle export ediyoruz; ama imzalar farklı:
//   - createClient() artık Prisma client döner
//   - changeStatus/updateApplication/withAuditLog/createSnapshot artık db parametresi almaz
import { prisma } from './prisma'

export { prisma }

// createClient: legacy çağrılar için Prisma instance'ı döner.
// Yeni kodda doğrudan `import { prisma } from '@/lib/prisma'` kullan.
export function createClient() {
  return prisma
}

// ─── Status Tanimlari ───

export const APPLICATION_STATUSES = [
  'basvuru',
  'kontrol',
  'kesin_kabul',
  'kesin_ret',
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
  yas_kucuk: '#F97316',
  etkinlik: '#06B6D4',
  deaktive: '#6B7280',
  nihai_uye: '#D97706',
}

// ─── KORUMALI KAYITLAR ───

export const PROTECTED_BLOCK_MSG =
  'Bu kayıt korumalı (Circle üyesi). Üzerinde mail/status/update/delete işlemi yapılamaz.'

export async function isProtectedApplication(applicationId: string): Promise<boolean> {
  const row = await prisma.applications.findUnique({
    where: { id: applicationId },
    select: { is_protected: true },
  })
  return !!row?.is_protected
}

// ─── Audit Log Helper ───

export async function withAuditLog(params: {
  entityType: string
  entityId: string
  action: string
  actor: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    await prisma.audit_log.create({
      data: {
        entity_type: params.entityType,
        entity_id: params.entityId,
        action: params.action,
        actor: params.actor,
        old_values: (params.oldValues ?? null) as never,
        new_values: (params.newValues ?? null) as never,
        metadata: (params.metadata ?? null) as never,
      },
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
}

// ─── Snapshot Helper ───

export async function createSnapshot(
  applicationId: string,
  triggerAction: string,
  createdBy: string,
) {
  const app = await prisma.applications.findUnique({ where: { id: applicationId } })
  if (!app) return null

  const [tasks, warnings, evaluations, mailLogs] = await Promise.all([
    prisma.task_completions.findMany({ where: { application_id: applicationId } }),
    prisma.warnings.findMany({ where: { application_id: applicationId } }),
    prisma.evaluations.findMany({ where: { application_id: applicationId } }),
    prisma.mail_logs.findMany({ where: { application_id: applicationId } }),
  ])

  const fullSnapshot = {
    ...app,
    _related: {
      tasks,
      warnings,
      evaluations,
      mail_logs: mailLogs,
    },
  }

  try {
    await prisma.application_snapshots.create({
      data: {
        application_id: applicationId,
        snapshot: fullSnapshot as never,
        trigger_action: triggerAction,
        created_by: createdBy,
      },
    })
  } catch (e) {
    console.error('Snapshot error:', e)
  }
  return app
}

// ─── Status Degistirme ───

export async function changeStatus(params: {
  applicationId: string
  toStatus: ApplicationStatus
  changedBy: string
  reason?: string
  extraUpdates?: Record<string, unknown>
  force?: boolean
}) {
  const app = await prisma.applications.findUnique({ where: { id: params.applicationId } })
  if (!app) {
    return { success: false as const, error: 'Başvuru bulunamadı' }
  }

  if (app.is_protected) {
    return { success: false as const, error: PROTECTED_BLOCK_MSG }
  }

  const fromStatus = app.status

  if (['kesin_kabul', 'kesin_ret'].includes(params.toStatus)) {
    const reviewer = (params.extraUpdates?.reviewer as string | undefined) || app.reviewer
    if (!reviewer || reviewer === 'Otomasyon') {
      return { success: false as const, error: 'Kesin kabul/ret için değerlendiren gerekli' }
    }
  }

  if (params.toStatus === 'nihai_uye' && !params.force) {
    const tasks = await prisma.task_completions.findMany({
      where: { application_id: params.applicationId, completed: true },
      select: { task_type: true },
    })
    const completedTypes = new Set(tasks.map((t) => t.task_type))
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
        success: false as const,
        error: `Nihai ağ üyesine taşınamaz. Eksik: ${missingLabels}`,
        missing_tasks: missing,
      }
    }
  }

  await createSnapshot(params.applicationId, 'status_change', params.changedBy)

  const updates: Record<string, unknown> = {
    status: params.toStatus,
    ...(params.extraUpdates || {}),
  }

  try {
    await prisma.applications.update({
      where: { id: params.applicationId },
      data: updates as never,
    })
  } catch (e: unknown) {
    return { success: false as const, error: (e as Error).message }
  }

  await prisma.status_history.create({
    data: {
      application_id: params.applicationId,
      from_status: fromStatus,
      to_status: params.toStatus,
      changed_by: params.changedBy,
      reason: params.reason ?? null,
      change_type: 'normal',
    },
  })

  await withAuditLog({
    entityType: 'application',
    entityId: params.applicationId,
    action: 'status_change',
    actor: params.changedBy,
    oldValues: { status: fromStatus },
    newValues: { status: params.toStatus, ...(params.extraUpdates || {}) },
  })

  let autoTag: { leaf: string | null; parent: string | null; added: string[]; reason: string } | null = null
  if (params.toStatus === 'nihai_uye' && fromStatus !== 'nihai_uye') {
    try {
      const { autoAssignCharacterTag } = await import('./character-tags')
      autoTag = await autoAssignCharacterTag(params.applicationId)
      if (autoTag.added.length > 0) {
        await withAuditLog({
          entityType: 'application',
          entityId: params.applicationId,
          action: 'auto_tag_assigned',
          actor: 'system',
          newValues: {
            leaf: autoTag.leaf,
            parent: autoTag.parent,
            added: autoTag.added,
            reason: autoTag.reason,
            circle_sync: (autoTag as { circleSync?: unknown }).circleSync,
          },
        })
      }
    } catch (e) {
      console.error('autoAssignCharacterTag error:', e)
    }
  }

  return { success: true as const, fromStatus, toStatus: params.toStatus, autoTag }
}

// ─── Application Guncelleme ───

export async function updateApplication(params: {
  applicationId: string
  updates: Record<string, unknown>
  updatedBy: string
}) {
  const app = await prisma.applications.findUnique({ where: { id: params.applicationId } })
  if (!app) {
    return { success: false as const, error: 'Başvuru bulunamadı' }
  }

  if (app.is_protected) {
    return { success: false as const, error: PROTECTED_BLOCK_MSG }
  }

  await createSnapshot(params.applicationId, 'field_update', params.updatedBy)

  try {
    await prisma.applications.update({
      where: { id: params.applicationId },
      data: params.updates as never,
    })
  } catch (e: unknown) {
    return { success: false as const, error: (e as Error).message }
  }

  const changedFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params.updates)) {
    if ((app as Record<string, unknown>)[key] !== value) {
      changedFields[key] = { old: (app as Record<string, unknown>)[key], new: value }
    }
  }

  await withAuditLog({
    entityType: 'application',
    entityId: params.applicationId,
    action: 'update',
    actor: params.updatedBy,
    oldValues: changedFields,
    newValues: params.updates,
  })

  return { success: true as const }
}

// ─── Rollback ───

export async function rollbackApplication(applicationId: string, rolledBackBy: string) {
  const snapshot = await prisma.application_snapshots.findFirst({
    where: { application_id: applicationId },
    orderBy: { created_at: 'desc' },
  })
  if (!snapshot) {
    return { success: false as const, error: 'Geri alınacak snapshot bulunamadı' }
  }

  const snapshotData = snapshot.snapshot as Record<string, unknown>
  const currentApp = await prisma.applications.findUnique({ where: { id: applicationId } })

  if (currentApp?.is_protected) {
    return { success: false as const, error: PROTECTED_BLOCK_MSG }
  }

  const { id: _id, created_at: _ca, _related: _rel, ...restoreData } = snapshotData
  void _id; void _ca; void _rel
  // updated_at'i Prisma trigger'a bıraksın diye çıkar
  delete (restoreData as Record<string, unknown>).updated_at

  await prisma.applications.update({
    where: { id: applicationId },
    data: restoreData as never,
  })

  if (currentApp && snapshotData.status !== currentApp.status) {
    await prisma.status_history.create({
      data: {
        application_id: applicationId,
        from_status: currentApp.status,
        to_status: snapshotData.status as string,
        changed_by: rolledBackBy,
        change_type: 'rollback',
        reason: 'Geri alma işlemi',
      },
    })
  }

  await withAuditLog({
    entityType: 'application',
    entityId: applicationId,
    action: 'rollback',
    actor: rolledBackBy,
    oldValues: currentApp as never,
    newValues: snapshotData,
    metadata: { snapshot_id: snapshot.id },
  })

  return { success: true as const, restoredStatus: snapshotData.status }
}

// ─── Query Helpers ───

export async function getApplicationsByStatus(
  status: ApplicationStatus,
  options?: { search?: string; sort?: string; order?: 'asc' | 'desc'; page?: number; limit?: number },
) {
  const { search, sort = 'submitted_at', order = 'desc', page = 1, limit = 50 } = options || {}
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { status }
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

  return { data, count, error: null as null }
}

export async function getAllApplicationsGrouped() {
  const data = await prisma.applications.findMany({ orderBy: { submitted_at: 'desc' } })
  const grouped: Record<string, typeof data> = {}
  for (const status of APPLICATION_STATUSES) grouped[status] = []
  for (const app of data) {
    const s = app.status as ApplicationStatus
    if (grouped[s]) grouped[s].push(app)
  }
  return { data: grouped, error: null as null }
}

export async function getDashboardStats() {
  const data = await prisma.applications.findMany({ select: { status: true } })
  const counts: Record<string, number> = {}
  for (const status of APPLICATION_STATUSES) counts[status] = 0
  for (const row of data) counts[row.status] = (counts[row.status] || 0) + 1
  return {
    data: { total: data.length, breakdown: counts },
    error: null as null,
  }
}

export async function getTimelineData(filters?: { from?: string; to?: string; status?: string }) {
  const where: Record<string, unknown> = {}
  if (filters?.from) (where as Record<string, unknown>).created_at = { gte: new Date(filters.from) }
  if (filters?.to) {
    const ca = (where.created_at as Record<string, unknown>) || {}
    ca.lte = new Date(filters.to)
    where.created_at = ca
  }
  if (filters?.status) where.to_status = filters.status

  const rows = await prisma.status_history.findMany({
    where: where as never,
    orderBy: { created_at: 'desc' },
    include: { applications: { select: { full_name: true, email: true } } },
  })

  return { data: rows, error: null as null }
}
