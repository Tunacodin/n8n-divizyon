import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/applications/[id]/history
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const [statusHistory, auditLog, snapshots] = await Promise.all([
      prisma.status_history.findMany({
        where: { application_id: params.id },
        orderBy: { created_at: 'desc' },
      }),
      prisma.audit_log.findMany({
        where: { entity_type: 'application', entity_id: params.id },
        orderBy: { created_at: 'desc' },
      }),
      prisma.application_snapshots.findMany({
        where: { application_id: params.id },
        select: { id: true, trigger_action: true, created_by: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { status_history: statusHistory, audit_log: auditLog, snapshots },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
