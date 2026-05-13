import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateApplication, changeStatus } from '@/lib/supabase'
import { requirePermission } from '@/lib/permissions'

// GET /api/applications/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.applications.findUnique({ where: { id: params.id } })
    if (!data) {
      return NextResponse.json({ success: false, error: 'Başvuru bulunamadı' }, { status: 404 })
    }

    const [evaluations, warnings, tasks, mailLogs, inventoryTests] = await Promise.all([
      prisma.evaluations.findMany({ where: { application_id: params.id }, orderBy: { created_at: 'desc' } }),
      prisma.warnings.findMany({ where: { application_id: params.id }, orderBy: { warned_at: 'desc' } }),
      prisma.task_completions.findMany({ where: { application_id: params.id } }),
      prisma.mail_logs.findMany({ where: { application_id: params.id }, orderBy: { sent_at: 'desc' } }),
      prisma.inventory_tests.findMany({
        where: { application_id: params.id },
        select: { id: true, email: true, test_type: true, discipline: true, total_score: true, submitted_at: true },
        orderBy: { submitted_at: 'desc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { ...data, evaluations, warnings, tasks, mail_logs: mailLogs, inventory_tests: inventoryTests },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/applications/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = await requirePermission(req, 'mutate:application')
  if (denied) return denied

  try {
    const body = await req.json()
    const { updated_by, ...updates } = body

    if (!updated_by) {
      return NextResponse.json({ success: false, error: 'updated_by zorunlu' }, { status: 400 })
    }

    const result = await updateApplication({
      applicationId: params.id,
      updates,
      updatedBy: updated_by,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const data = await prisma.applications.findUnique({ where: { id: params.id } })
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/applications/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const denied = await requirePermission(req, 'mutate:application')
  if (denied) return denied

  try {
    const body = await req.json().catch(() => ({}))
    const deletedBy = body.deleted_by || 'system'

    const result = await changeStatus({
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
