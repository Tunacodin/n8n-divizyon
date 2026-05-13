import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog } from '@/lib/supabase'
import { findApplication } from '@/lib/match'

export const revalidate = 60

const VALID_TEST_TYPES = ['karakteristik_envanter', 'disipliner_envanter'] as const
type TestType = (typeof VALID_TEST_TYPES)[number]

const VALID_DISCIPLINES = ['kreatif_yapim', 'dijital_deneyim', 'dijital_urun'] as const
type Discipline = (typeof VALID_DISCIPLINES)[number]

// GET /api/inventory-tests?email=&test_type=&discipline=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const testType = searchParams.get('test_type')
  const discipline = searchParams.get('discipline')
  const applicationId = searchParams.get('application_id')

  try {
    const where: Record<string, unknown> = {}
    if (email) where.email = email.toLowerCase()
    if (testType) where.test_type = testType
    if (discipline) where.discipline = discipline
    if (applicationId) where.application_id = applicationId

    const data = await prisma.inventory_tests.findMany({
      where: where as never,
      orderBy: { submitted_at: 'desc' },
      include: { applications: { select: { full_name: true, status: true } } },
    })

    return NextResponse.json({ success: true, total: data.length, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/inventory-tests
export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.email) {
      return NextResponse.json({ success: false, error: 'email zorunlu' }, { status: 400 })
    }

    const testType: TestType = VALID_TEST_TYPES.includes(body.test_type)
      ? body.test_type
      : 'karakteristik_envanter'

    let discipline: Discipline | null = null
    if (testType === 'disipliner_envanter') {
      if (!body.discipline || !VALID_DISCIPLINES.includes(body.discipline)) {
        return NextResponse.json(
          {
            success: false,
            error: `Disipliner envanter icin gecerli discipline zorunlu. Gecerli: ${VALID_DISCIPLINES.join(', ')}`,
          },
          { status: 400 },
        )
      }
      discipline = body.discipline
    } else if (body.discipline && VALID_DISCIPLINES.includes(body.discipline)) {
      discipline = body.discipline
    }

    const taskType = testType === 'disipliner_envanter' ? 'disipliner_envanter' : 'karakteristik_envanter'

    const emailLower = body.email.toLowerCase().trim()
    const fullName: string | null = body.full_name?.toString().trim() || null

    const { application, matchedBy } = await findApplication({ email: emailLower, fullName })
    const matchWarning = matchedBy === 'name'

    const insertPayload: Record<string, unknown> = {
      ...body,
      email: emailLower,
      test_type: testType,
      discipline,
      application_id: application?.id || null,
    }
    delete insertPayload.full_name

    const data = await prisma.inventory_tests.create({ data: insertPayload as never })

    if (application?.id) {
      await prisma.task_completions.upsert({
        where: { application_id_task_type: { application_id: application.id, task_type: taskType } },
        update: { completed: true, completed_at: new Date(), verified_by: 'typeform' },
        create: {
          application_id: application.id,
          task_type: taskType,
          completed: true,
          completed_at: new Date(),
          verified_by: 'typeform',
        },
      })

      await withAuditLog({
        entityType: 'application',
        entityId: application.id,
        action: `${taskType}_completed`,
        actor: 'typeform',
        newValues: {
          test_type: testType,
          discipline,
          total_score: body.total_score ?? null,
          scores: body.scores ?? null,
          matched_by: matchedBy,
          submitted_email: emailLower,
          application_email: application.email,
        },
      })

      if (matchWarning) {
        await withAuditLog({
          entityType: 'application',
          entityId: application.id,
          action: 'inventory_email_mismatch',
          actor: 'typeform',
          newValues: {
            test_type: testType,
            discipline,
            submitted_email: emailLower,
            application_email: application.email,
            submitted_full_name: fullName,
            application_full_name: application.full_name,
          },
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        data,
        task_updated: !!application?.id,
        matched_by: matchedBy,
        match_warning: matchWarning,
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
