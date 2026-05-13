import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DeadlineRow = {
  id: string
  email: string
  full_name: string
  status: string
  status_changed_at: Date
  deadline_at: Date
  last_deadline_notice_at: Date | null
  days_until_deadline: number
  urgency: 'overdue' | 'soon' | 'ok'
}

const NOTICE_COOLDOWN_HOURS = 24

export async function POST(req: Request) {
  const unauth = authorizeCron(req)
  if (unauth) return unauth

  const startedAt = new Date().toISOString()

  try {
    const alerts = await prisma.$queryRaw<DeadlineRow[]>`
      SELECT id, email, full_name, status, status_changed_at, deadline_at, last_deadline_notice_at,
             days_until_deadline, urgency
      FROM deadline_alerts
      WHERE urgency IN ('overdue', 'soon')
      ORDER BY deadline_at ASC
    `

    const cooldownMs = NOTICE_COOLDOWN_HOURS * 3600 * 1000
    const nowMs = Date.now()

    let warningsCreated = 0
    let skippedCooldown = 0
    const errors: string[] = []
    const processedIds: string[] = []

    for (const r of alerts) {
      if (r.last_deadline_notice_at) {
        const last = new Date(r.last_deadline_notice_at).getTime()
        if (nowMs - last < cooldownMs) { skippedCooldown++; continue }
      }

      const reason =
        r.urgency === 'overdue'
          ? `Status '${r.status}' icin son tarih gecti (${Math.abs(Math.round(r.days_until_deadline))} gun).`
          : `Status '${r.status}' icin son tarih ${Math.max(0, Math.round(r.days_until_deadline))} gun icinde doluyor.`

      const activeCount = await prisma.warnings.count({
        where: { application_id: r.id, is_active: true },
      })

      const warningNumber = activeCount + 1

      try {
        await prisma.warnings.create({
          data: {
            application_id: r.id,
            warning_number: warningNumber,
            warned_by: 'cron:deadline',
            reason,
            form_type: null,
          },
        })
      } catch (e: unknown) {
        errors.push(`${r.id}: warning insert ${(e as Error).message}`)
        continue
      }

      try {
        await prisma.applications.update({
          where: { id: r.id },
          data: { last_deadline_notice_at: new Date(), warning_count: warningNumber },
        })
      } catch (e: unknown) {
        errors.push(`${r.id}: app update ${(e as Error).message}`)
        continue
      }

      await withAuditLog({
        entityType: 'application',
        entityId: r.id,
        action: 'deadline_warning',
        actor: 'cron:deadline',
        newValues: {
          urgency: r.urgency,
          status: r.status,
          deadline_at: r.deadline_at,
          days_until_deadline: r.days_until_deadline,
          reason,
        },
      })

      warningsCreated++
      processedIds.push(r.id)
    }

    return NextResponse.json({
      success: true,
      started_at: startedAt,
      total_alerts: alerts.length,
      warnings_created: warningsCreated,
      skipped_cooldown: skippedCooldown,
      errors,
      processed_ids: processedIds,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'bilinmeyen'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// GET
export async function GET(req: Request) {
  const unauth = authorizeCron(req)
  if (unauth) return unauth

  const data = await prisma.$queryRaw<Array<{
    id: string
    email: string
    status: string
    deadline_at: Date
    urgency: string
    days_until_deadline: number
    last_deadline_notice_at: Date | null
  }>>`
    SELECT id, email, status, deadline_at, urgency, days_until_deadline, last_deadline_notice_at
    FROM deadline_alerts
    ORDER BY deadline_at ASC
  `

  const summary = { overdue: 0, soon: 0, ok: 0 } as Record<string, number>
  for (const r of data) {
    summary[r.urgency] = (summary[r.urgency] || 0) + 1
  }
  return NextResponse.json({ success: true, summary, alerts: data })
}
