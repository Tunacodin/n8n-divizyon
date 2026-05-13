import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { changeStatus, type ApplicationStatus } from '@/lib/supabase'
import { requirePermission } from '@/lib/permissions'

// PATCH /api/applications/[id]/status
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = await requirePermission(req, 'mutate:application')
  if (denied) return denied

  try {
    const body = await req.json()

    if (!body.to_status || !body.changed_by) {
      return NextResponse.json(
        { success: false, error: 'to_status ve changed_by zorunlu' },
        { status: 400 },
      )
    }

    const result = await changeStatus({
      applicationId: params.id,
      toStatus: body.to_status as ApplicationStatus,
      changedBy: body.changed_by,
      reason: body.reason,
      extraUpdates: body.extra_updates,
      force: !!body.force,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const data = await prisma.applications.findUnique({ where: { id: params.id } })

    return NextResponse.json({ success: true, data, fromStatus: result.fromStatus, toStatus: result.toStatus })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
