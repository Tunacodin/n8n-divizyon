import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog, isProtectedApplication, PROTECTED_BLOCK_MSG } from '@/lib/supabase'
import { requirePermission } from '@/lib/permissions'

const VALID_FORM_TYPES = ['karakteristik_envanter', 'disipliner_envanter'] as const

// GET /api/applications/[id]/warnings?form_type=
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const formType = searchParams.get('form_type')

  try {
    const where: Record<string, unknown> = { application_id: params.id }
    if (formType === 'null') where.form_type = null
    else if (formType) where.form_type = formType

    const data = await prisma.warnings.findMany({
      where: where as never,
      orderBy: { warned_at: 'desc' },
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/applications/[id]/warnings
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requirePermission(req, 'mutate:warnings')
  if (denied) return denied

  try {
    const body = await req.json()

    if (!body.warned_by) {
      return NextResponse.json({ success: false, error: 'warned_by zorunlu' }, { status: 400 })
    }

    if (await isProtectedApplication(params.id)) {
      return NextResponse.json({ success: false, error: PROTECTED_BLOCK_MSG }, { status: 403 })
    }

    let formType: string | null = null
    if (body.form_type) {
      if (!VALID_FORM_TYPES.includes(body.form_type)) {
        return NextResponse.json(
          { success: false, error: `Gecersiz form_type. Gecerli: ${VALID_FORM_TYPES.join(', ')} veya bos` },
          { status: 400 },
        )
      }
      formType = body.form_type
    }

    const count = await prisma.warnings.count({
      where: { application_id: params.id, is_active: true },
    })
    const warningNumber = count + 1

    const data = await prisma.warnings.create({
      data: {
        application_id: params.id,
        warning_number: warningNumber,
        warned_by: body.warned_by,
        reason: body.reason || null,
        form_type: formType,
      },
    })

    await prisma.applications.update({
      where: { id: params.id },
      data: { warning_count: warningNumber },
    })

    await withAuditLog({
      entityType: 'application',
      entityId: params.id,
      action: 'warning_added',
      actor: body.warned_by,
      newValues: { warning_number: warningNumber, reason: body.reason, form_type: formType },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
