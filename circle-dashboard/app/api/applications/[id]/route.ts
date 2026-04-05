import { NextResponse } from 'next/server'
import { createClient, updateApplication } from '@/lib/supabase'

// GET /api/applications/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const { data, error } = await db
      .from('applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Başvuru bulunamadı' }, { status: 404 })
    }

    // Iliskili verileri de cek
    const [evaluations, warnings, tasks, mailLogs] = await Promise.all([
      db.from('evaluations').select('*').eq('application_id', params.id).order('created_at', { ascending: false }),
      db.from('warnings').select('*').eq('application_id', params.id).order('warning_number', { ascending: true }),
      db.from('task_completions').select('*').eq('application_id', params.id),
      db.from('mail_logs').select('*').eq('application_id', params.id).order('sent_at', { ascending: false }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        evaluations: evaluations.data || [],
        warnings: warnings.data || [],
        tasks: tasks.data || [],
        mail_logs: mailLogs.data || [],
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/applications/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()
    const { updated_by, ...updates } = body

    if (!updated_by) {
      return NextResponse.json({ success: false, error: 'updated_by zorunlu' }, { status: 400 })
    }

    const result = await updateApplication(db, {
      applicationId: params.id,
      updates,
      updatedBy: updated_by,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    // Guncel veriyi don
    const { data } = await db.from('applications').select('*').eq('id', params.id).single()

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/applications/[id] (soft delete — deaktive statuse tasi)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json().catch(() => ({}))
    const deletedBy = body.deleted_by || 'system'

    const { changeStatus } = await import('@/lib/supabase')
    const result = await changeStatus(db, {
      applicationId: params.id,
      toStatus: 'deaktive',
      changedBy: deletedBy,
      reason: 'Silme işlemi (soft delete)',
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Başvuru deaktive edildi' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
