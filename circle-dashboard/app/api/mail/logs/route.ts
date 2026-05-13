import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/mail/logs?email=ali@test.com&template=kabul&limit=100
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const email = searchParams.get('email')
  const template = searchParams.get('template')
  const applicationId = searchParams.get('application_id')
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    const where: Record<string, unknown> = {}
    if (email) where.email_to = email.toLowerCase()
    if (template) where.template_name = template
    if (applicationId) where.application_id = applicationId

    const data = await prisma.mail_logs.findMany({
      where: where as never,
      orderBy: { sent_at: 'desc' },
      take: limit,
      include: {
        applications: { select: { full_name: true, email: true, status: true } },
      },
    })

    return NextResponse.json({ success: true, total: data.length, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
