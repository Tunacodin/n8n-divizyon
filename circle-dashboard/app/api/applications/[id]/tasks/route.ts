import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'
// Task completion endpoint - verified_by column used

const VALID_TASK_TYPES = [
  'karakteristik_envanter',
  'disipliner_envanter',
  'oryantasyon',
] as const

type TaskType = (typeof VALID_TASK_TYPES)[number]

// POST /api/applications/[id]/tasks
// Body: { task_type: 'oryantasyon' | 'karakteristik_envanter' | 'disipliner_envanter', completed: boolean, completed_by?: string }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()
    const { task_type, completed = true, completed_by = 'dashboard' } = body

    if (!task_type || !VALID_TASK_TYPES.includes(task_type as TaskType)) {
      return NextResponse.json(
        { success: false, error: `Geçersiz task_type. Geçerli: ${VALID_TASK_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Application var mı kontrol
    const { data: app, error: appError } = await db
      .from('applications')
      .select('id, full_name')
      .eq('id', params.id)
      .single()

    if (appError || !app) {
      return NextResponse.json({ success: false, error: 'Başvuru bulunamadı' }, { status: 404 })
    }

    // Mevcut task var mi kontrol et
    const { data: existing } = await db
      .from('task_completions')
      .select('id')
      .eq('application_id', params.id)
      .eq('task_type', task_type)
      .single()

    let data
    let error

    if (existing) {
      // Update
      const result = await db
        .from('task_completions')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          verified_by: completed ? completed_by : null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Insert
      const result = await db
        .from('task_completions')
        .insert({
          application_id: params.id,
          task_type,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          verified_by: completed ? completed_by : null,
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
      action: completed ? 'task_completed' : 'task_uncompleted',
      actor: completed_by,
      newValues: { task_type, completed },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
