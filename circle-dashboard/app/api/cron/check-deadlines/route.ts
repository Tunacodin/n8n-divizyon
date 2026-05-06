import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/cron/check-deadlines
// Vercel Cron veya n8n schedule (gunde 1) tarafindan tetiklenir.
// status_changed_at + status_duration_days mantigiyla deadline'i gecmis veya
// 3 gun icinde dolacak basvurulari bulur:
//   - Otomatik warning ekler (is_active=true, reason='deadline_overdue')
//   - last_deadline_notice_at'i guncelleyerek 24 saat icinde tekrar uyarmaz (idempotent)
//   - audit_log'a 'deadline_check' kaydi ekler
//
// Protected (is_protected=true) kayitlara DOKUNMAZ — view zaten filtreliyor.
//
// Mail gonderimi bu cron'da YAPILMAZ (kullanicinin mevcut mail flow'unu bozmamak
// icin); sadece in-app uyari + warning olusturulur. Admin /api/mail/send ile
// manuel devam eder.

type DeadlineRow = {
  id: string
  email: string
  full_name: string
  status: string
  status_changed_at: string
  deadline_at: string
  last_deadline_notice_at: string | null
  days_until_deadline: number
  urgency: 'overdue' | 'soon' | 'ok'
}

const NOTICE_COOLDOWN_HOURS = 24

export async function POST(req: Request) {
  const unauth = authorizeCron(req)
  if (unauth) return unauth

  const db = createClient()
  const startedAt = new Date().toISOString()

  try {
    const { data: alerts } = await db
      .from('deadline_alerts')
      .select('*')
      .in('urgency', ['overdue', 'soon'])
      .order('deadline_at', { ascending: true })

    const rows = (alerts || []) as DeadlineRow[]
    const cooldownMs = NOTICE_COOLDOWN_HOURS * 3600 * 1000
    const nowMs = Date.now()

    let warningsCreated = 0
    let skippedCooldown = 0
    const errors: string[] = []
    const processedIds: string[] = []

    for (const r of rows) {
      // Idempotency: ayni uyariyi 24 saat icinde tekrar atma
      if (r.last_deadline_notice_at) {
        const last = new Date(r.last_deadline_notice_at).getTime()
        if (nowMs - last < cooldownMs) { skippedCooldown++; continue }
      }

      const reason =
        r.urgency === 'overdue'
          ? `Status '${r.status}' icin son tarih gecti (${Math.abs(Math.round(r.days_until_deadline))} gun).`
          : `Status '${r.status}' icin son tarih ${Math.max(0, Math.round(r.days_until_deadline))} gun icinde doluyor.`

      // Mevcut aktif uyari sayisini al
      const { count: activeCount } = await db
        .from('warnings')
        .select('*', { count: 'exact', head: true })
        .eq('application_id', r.id)
        .eq('is_active', true)

      const warningNumber = (activeCount || 0) + 1

      const { error: wErr } = await db.from('warnings').insert({
        application_id: r.id,
        warning_number: warningNumber,
        warned_by: 'cron:deadline',
        reason,
        form_type: null,
      })

      if (wErr) {
        errors.push(`${r.id}: warning insert ${wErr.message}`)
        continue
      }

      const { error: aErr } = await db
        .from('applications')
        .update({
          last_deadline_notice_at: new Date().toISOString(),
          warning_count: warningNumber,
        })
        .eq('id', r.id)

      if (aErr) {
        errors.push(`${r.id}: app update ${aErr.message}`)
        continue
      }

      await withAuditLog(db, {
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
      total_alerts: rows.length,
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

// GET — durum gozlemi (auth ile)
export async function GET(req: Request) {
  const unauth = authorizeCron(req)
  if (unauth) return unauth

  const db = createClient()
  const { data } = await db
    .from('deadline_alerts')
    .select('id, email, status, deadline_at, urgency, days_until_deadline, last_deadline_notice_at')
    .order('deadline_at', { ascending: true })

  const summary = { overdue: 0, soon: 0, ok: 0 }
  for (const r of data || []) {
    summary[(r as { urgency: keyof typeof summary }).urgency]++
  }
  return NextResponse.json({ success: true, summary, alerts: data || [] })
}
