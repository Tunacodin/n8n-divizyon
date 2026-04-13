import { NextResponse } from 'next/server'
import { createClient, withAuditLog, PROTECTED_BLOCK_MSG } from '@/lib/supabase'
// Task completion endpoint - verified_by column used

const VALID_TASK_TYPES = [
  'karakteristik_envanter',
  'disipliner_envanter',
  'oryantasyon',
] as const

type TaskType = (typeof VALID_TASK_TYPES)[number]

const VALID_DISCIPLINES = ['kreatif_yapim', 'dijital_deneyim', 'dijital_urun'] as const

// POST /api/applications/[id]/tasks
// Body: { task_type, completed?, completed_by?, discipline?, manual_note?, source? }
// source: 'admin_manual' | 'dashboard' | 'typeform' (audit icin etiket)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

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
        { status: 400 }
      )
    }

    if (task_type === 'disipliner_envanter' && completed && discipline) {
      if (!VALID_DISCIPLINES.includes(discipline)) {
        return NextResponse.json(
          { success: false, error: `Gecersiz discipline. Gecerli: ${VALID_DISCIPLINES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const { data: app, error: appError } = await db
      .from('applications')
      .select('id, full_name, is_protected')
      .eq('id', params.id)
      .single()

    if (appError || !app) {
      return NextResponse.json({ success: false, error: 'Başvuru bulunamadı' }, { status: 404 })
    }

    if ((app as { is_protected?: boolean }).is_protected) {
      return NextResponse.json({ success: false, error: PROTECTED_BLOCK_MSG }, { status: 403 })
    }

    const verifiedBy = source === 'admin_manual'
      ? `admin_manual:${completed_by}`
      : completed_by

    const { data: existing } = await db
      .from('task_completions')
      .select('id')
      .eq('application_id', params.id)
      .eq('task_type', task_type)
      .single()

    let data
    let error

    if (existing) {
      const result = await db
        .from('task_completions')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          verified_by: completed ? verifiedBy : null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await db
        .from('task_completions')
        .insert({
          application_id: params.id,
          task_type,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          verified_by: completed ? verifiedBy : null,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) throw error

    await withAuditLog(db, {
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
