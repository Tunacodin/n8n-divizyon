import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog, PROTECTED_BLOCK_MSG } from '@/lib/supabase'
import { requirePermission } from '@/lib/permissions'

const VALID_TASK_TYPES = [
  'karakteristik_envanter',
  'disipliner_envanter',
  'oryantasyon',
] as const

type TaskType = (typeof VALID_TASK_TYPES)[number]

const VALID_DISCIPLINES = ['kreatif_yapim', 'dijital_deneyim', 'dijital_urun'] as const

// POST /api/applications/[id]/tasks
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requirePermission(req, 'mutate:tasks')
  if (denied) return denied

  try {
    const body = await req.json()
    const {
      task_type,
      completed = true,
      completed_by = 'dashboard',
      discipline,
      manual_note,
      source,
    } = body

    if (!task_type || !VALID_TASK_TYPES.includes(task_type as TaskType)) {
      return NextResponse.json(
        { success: false, error: `Geçersiz task_type. Geçerli: ${VALID_TASK_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    if (task_type === 'disipliner_envanter' && completed && discipline) {
      if (!VALID_DISCIPLINES.includes(discipline)) {
        return NextResponse.json(
          { success: false, error: `Gecersiz discipline. Gecerli: ${VALID_DISCIPLINES.join(', ')}` },
          { status: 400 },
        )
      }
    }

    const app = await prisma.applications.findUnique({
      where: { id: params.id },
      select: { id: true, full_name: true, is_protected: true },
    })

    if (!app) {
      return NextResponse.json({ success: false, error: 'Başvuru bulunamadı' }, { status: 404 })
    }

    if (app.is_protected) {
      return NextResponse.json({ success: false, error: PROTECTED_BLOCK_MSG }, { status: 403 })
    }

    const verifiedBy = source === 'admin_manual'
      ? `admin_manual:${completed_by}`
      : completed_by

    const data = await prisma.task_completions.upsert({
      where: { application_id_task_type: { application_id: params.id, task_type } },
      update: {
        completed,
        completed_at: completed ? new Date() : null,
        verified_by: completed ? verifiedBy : null,
      },
      create: {
        application_id: params.id,
        task_type,
        completed,
        completed_at: completed ? new Date() : null,
        verified_by: completed ? verifiedBy : null,
      },
    })

    await withAuditLog({
      entityType: 'application',
      entityId: params.id,
      action: completed
        ? (source === 'admin_manual' ? 'task_manual_mark' : 'task_completed')
        : 'task_uncompleted',
      actor: verifiedBy,
      newValues: {
        task_type,
        completed,
        discipline: discipline ?? null,
        manual_note: manual_note ?? null,
      },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
