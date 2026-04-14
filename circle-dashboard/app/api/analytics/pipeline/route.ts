import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Süreç analiz endpoint'i:
//   1. Funnel cohort (ay bazli: basvuru → kontrol → kesin_kabul → nihai_uye)
//   2. Time in status (her statuyde ort. / medyan / p90 gun)
//   3. Reviewer performance (karar sayisi, kabul orani, ort. karar suresi)
//
// Analiz yalnizca n8n pipeline'indaki basvurulari kapsar —
// Circle'dan senkronize edilen is_protected=true kayitlar haric.

interface StatusEvent {
  application_id: string
  from_status: string | null
  to_status: string
  changed_by: string
  created_at: string
}

interface AppRow {
  id: string
  status: string
  submitted_at: string | null
  is_protected: boolean | null
}

const ACTIVE_STATUSES = ['basvuru', 'kontrol', 'kesin_kabul', 'nihai_uye']
const DECISION_STATUSES = new Set(['kesin_kabul', 'kesin_ret', 'nihai_olmayan'])
const EXCLUDE_REVIEWERS = new Set(['system', 'dashboard', 'otomasyon', 'Otomasyon'])

function monthKey(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

export async function GET() {
  const db = createClient()

  try {
    const [{ data: apps, error: e1 }, { data: history, error: e2 }] = await Promise.all([
      db.from('applications')
        .select('id, status, submitted_at, is_protected')
        .or('is_protected.is.null,is_protected.eq.false'),
      db.from('status_history')
        .select('application_id, from_status, to_status, changed_by, created_at')
        .order('created_at', { ascending: true }),
    ])
    if (e1) throw e1
    if (e2) throw e2

    const rows = (apps || []) as AppRow[]
    const events = (history || []) as StatusEvent[]

    const appById = new Map(rows.map(r => [r.id, r]))
    // Pipeline disindaki app'lere ait event'leri at (is_protected=true olabilir)
    const validEvents = events.filter(e => appById.has(e.application_id))

    // ─── 1. Funnel cohort (aylik) ───
    const cohortMap = new Map<string, {
      month: string
      basvuru: number
      kontrol: number
      kesin_kabul: number
      nihai_uye: number
      kesin_ret: number
    }>()
    for (const r of rows) {
      const m = monthKey(r.submitted_at)
      if (!m) continue
      if (!cohortMap.has(m)) {
        cohortMap.set(m, { month: m, basvuru: 0, kontrol: 0, kesin_kabul: 0, nihai_uye: 0, kesin_ret: 0 })
      }
      cohortMap.get(m)!.basvuru++
    }
    // Kontrol / Kesin Kabul / Nihai Uye: her app icin status_history'den bakiyoruz
    // (bir app yolculugunda hangi statuyleri gordu?)
    const journeyByApp = new Map<string, Set<string>>()
    for (const e of validEvents) {
      if (!journeyByApp.has(e.application_id)) journeyByApp.set(e.application_id, new Set())
      journeyByApp.get(e.application_id)!.add(e.to_status)
    }
    for (const r of rows) {
      const m = monthKey(r.submitted_at)
      if (!m || !cohortMap.has(m)) continue
      const c = cohortMap.get(m)!
      const journey = journeyByApp.get(r.id) || new Set([r.status])
      // Basvuru zaten sayildi (tum rows)
      if (journey.has('kontrol') || ACTIVE_STATUSES.slice(1).some(s => journey.has(s))) c.kontrol++
      if (journey.has('kesin_kabul') || journey.has('nihai_uye')) c.kesin_kabul++
      if (journey.has('nihai_uye')) c.nihai_uye++
      if (journey.has('kesin_ret')) c.kesin_ret++
    }
    const cohorts = Array.from(cohortMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    // ─── 2. Time in status ───
    // Her app icin ardisik eventleri kullanarak her statuyde ne kadar kaldi hesapla
    const eventsByApp = new Map<string, StatusEvent[]>()
    for (const e of validEvents) {
      if (!eventsByApp.has(e.application_id)) eventsByApp.set(e.application_id, [])
      eventsByApp.get(e.application_id)!.push(e)
    }

    const durationsByStatus: Record<string, number[]> = {}
    eventsByApp.forEach((evs, appId) => {
      // Her event "to_status" baslangici. Bir sonraki event'e kadar ya da su anki zamana kadar.
      const sorted = evs.slice().sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      for (let i = 0; i < sorted.length; i++) {
        const cur = sorted[i]
        const nextTs = i + 1 < sorted.length
          ? new Date(sorted[i + 1].created_at).getTime()
          : Date.now()
        const durMs = nextTs - new Date(cur.created_at).getTime()
        const durDays = durMs / 86400000
        if (durDays < 0) continue
        const status = cur.to_status
        if (!durationsByStatus[status]) durationsByStatus[status] = []
        durationsByStatus[status].push(durDays)
      }
      // Ilk event'ten once "basvuru" statusu vardir (submitted_at → ilk transition)
      const app = appById.get(appId)
      if (app?.submitted_at && sorted.length > 0) {
        const firstTs = new Date(sorted[0].created_at).getTime()
        const submittedTs = new Date(app.submitted_at).getTime()
        const dur = (firstTs - submittedTs) / 86400000
        if (dur >= 0) {
          if (!durationsByStatus['basvuru']) durationsByStatus['basvuru'] = []
          durationsByStatus['basvuru'].push(dur)
        }
      }
    })
    // Hic event'i olmayan, halen ilk status'ta bekleyen app'ler
    for (const r of rows) {
      if (eventsByApp.has(r.id)) continue
      if (!r.submitted_at) continue
      const dur = (Date.now() - new Date(r.submitted_at).getTime()) / 86400000
      if (dur < 0) continue
      if (!durationsByStatus[r.status]) durationsByStatus[r.status] = []
      durationsByStatus[r.status].push(dur)
    }

    const timeInStatus = Object.entries(durationsByStatus).map(([status, arr]) => {
      const sorted = arr.slice().sort((a, b) => a - b)
      const sum = sorted.reduce((s, v) => s + v, 0)
      return {
        status,
        count: sorted.length,
        avg_days: sorted.length ? +(sum / sorted.length).toFixed(2) : 0,
        median_days: +(percentile(sorted, 50)).toFixed(2),
        p90_days: +(percentile(sorted, 90)).toFixed(2),
      }
    }).sort((a, b) => {
      const order = ['basvuru', 'kontrol', 'kesin_kabul', 'nihai_olmayan', 'nihai_uye', 'kesin_ret', 'yas_kucuk', 'deaktive']
      return order.indexOf(a.status) - order.indexOf(b.status)
    })

    // ─── 3. Reviewer performance ───
    const reviewerMap = new Map<string, {
      name: string
      decisions: number
      approve: number
      reject: number
      nihai: number
      decision_times_hours: number[]
    }>()

    // Her app icin "kontrol'e giris" zamani ve "karar" eventi arasindaki fark
    eventsByApp.forEach((evs) => {
      const sorted = evs.slice().sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      let kontrolEnterTs: number | null = null
      for (const e of sorted) {
        if (e.to_status === 'kontrol') {
          kontrolEnterTs = new Date(e.created_at).getTime()
        }
        if (DECISION_STATUSES.has(e.to_status) && !EXCLUDE_REVIEWERS.has(e.changed_by)) {
          const reviewer = e.changed_by
          if (!reviewerMap.has(reviewer)) {
            reviewerMap.set(reviewer, {
              name: reviewer, decisions: 0, approve: 0, reject: 0, nihai: 0, decision_times_hours: [],
            })
          }
          const r = reviewerMap.get(reviewer)!
          r.decisions++
          if (e.to_status === 'kesin_kabul') r.approve++
          else if (e.to_status === 'kesin_ret') r.reject++
          else if (e.to_status === 'nihai_olmayan') r.reject++
          if (kontrolEnterTs) {
            const hrs = (new Date(e.created_at).getTime() - kontrolEnterTs) / 3600000
            if (hrs >= 0) r.decision_times_hours.push(hrs)
          }
        }
        if (e.to_status === 'nihai_uye' && !EXCLUDE_REVIEWERS.has(e.changed_by)) {
          const reviewer = e.changed_by
          if (!reviewerMap.has(reviewer)) {
            reviewerMap.set(reviewer, {
              name: reviewer, decisions: 0, approve: 0, reject: 0, nihai: 0, decision_times_hours: [],
            })
          }
          reviewerMap.get(reviewer)!.nihai++
        }
      }
    })

    const reviewers = Array.from(reviewerMap.values()).map(r => {
      const sorted = r.decision_times_hours.slice().sort((a, b) => a - b)
      const sum = sorted.reduce((s, v) => s + v, 0)
      return {
        name: r.name,
        decisions: r.decisions,
        approve: r.approve,
        reject: r.reject,
        nihai: r.nihai,
        approve_rate: r.decisions ? +(r.approve / r.decisions).toFixed(3) : 0,
        avg_decision_hours: sorted.length ? +(sum / sorted.length).toFixed(1) : null,
        median_decision_hours: sorted.length ? +(percentile(sorted, 50)).toFixed(1) : null,
      }
    }).sort((a, b) => b.decisions - a.decisions)

    return NextResponse.json({
      success: true,
      cohorts,
      timeInStatus,
      reviewers,
      generated_at: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
