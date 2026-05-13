import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog, isProtectedApplication, PROTECTED_BLOCK_MSG } from '@/lib/supabase'
import { requirePermission } from '@/lib/permissions'

// GET /api/applications/[id]/evaluations
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.evaluations.findMany({
      where: { application_id: params.id },
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/applications/[id]/evaluations
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requirePermission(req, 'mutate:evaluations')
  if (denied) return denied

  try {
    const body = await req.json()

    if (!body.reviewer || !body.decision) {
      return NextResponse.json(
        { success: false, error: 'reviewer ve decision zorunlu' },
        { status: 400 },
      )
    }

    if (await isProtectedApplication(params.id)) {
      return NextResponse.json({ success: false, error: PROTECTED_BLOCK_MSG }, { status: 403 })
    }

    const data = await prisma.evaluations.create({
      data: {
        application_id: params.id,
        reviewer: body.reviewer,
        decision: body.decision,
        notes: body.notes || null,
      },
    })

    await prisma.applications.update({
      where: { id: params.id },
      data: {
        reviewer: body.reviewer,
        review_note: body.notes || null,
        approval_status: body.decision,
      },
    })

    await withAuditLog({
      entityType: 'application',
      entityId: params.id,
      action: 'evaluation_added',
      actor: body.reviewer,
      newValues: { decision: body.decision, notes: body.notes },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
