import { NextResponse } from 'next/server'
import { createClient, APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/supabase'
import {
  buildTimeSeries,
  buildCumulativeTimeSeries,
  computePipelineDuration,
} from '@/lib/analytics-utils'

export const revalidate = 120

// DB field → Turkce field mapper (analytics-utils uyumu icin)
function toAnalyticsFormat(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    'E-Posta Adresin': row.email,
    'Adın Soyadın': row.full_name,
    'Timestamp': row.submitted_at,
    'timestamp': row.submitted_at,
    'Değerlendiren': row.reviewer,
    'Not': row.review_note,
    'Onay Durumu': row.approval_status,
    'Üretici Rolünü Tanımla': row.main_role,
    'Uyarı Sayısı': row.warning_count,
    sheet: row.status === 'yas_kucuk' ? '18 Yaş Altı' : undefined,
  }
}

export async function GET() {
  const db = createClient()

  try {
    // Tek sorguda tum veriyi cek
    const { data: allApps, error } = await db
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // Status bazli grupla
    const byStatus: Record<string, Record<string, unknown>[]> = {}
    for (const s of APPLICATION_STATUSES) byStatus[s] = []
    for (const app of allApps || []) {
      const s = app.status as ApplicationStatus
      if (byStatus[s]) byStatus[s].push(toAnalyticsFormat(app))
    }

    const nb = byStatus.basvuru
    const nk = byStatus.kontrol
    const ny = byStatus.yas_kucuk
    const nr = byStatus.kesin_ret
    const nno = byStatus.nihai_olmayan
    const nkk = byStatus.kesin_kabul
    const ne = byStatus.etkinlik
    const nd = byStatus.deaktive
    const nnu = byStatus.nihai_uye

    // Funnel
    const funnelSnapshot: Record<string, number> = {}
    for (const s of APPLICATION_STATUSES) {
      funnelSnapshot[s] = byStatus[s].length
    }

    // Time series
    const basvuruTimeSeries = buildTimeSeries(nb, 'Timestamp')
    const kabulTimeSeries = buildTimeSeries(nkk, 'Timestamp')
    const retTimeSeries = buildTimeSeries([...nr, ...ny], 'Timestamp')
    const deaktiveTimeSeries = buildTimeSeries(nd, 'Timestamp')

    // Ret sebebi
    const retCounts = { '18yas': 0, toplulukIlkeleri: 0, diger: 0 }
    for (const row of [...nr, ...ny]) {
      if (row.status === 'yas_kucuk') { retCounts['18yas']++; continue }
      const not = String(row['Not'] ?? '').toLowerCase()
      if (not.includes('topluluk')) retCounts.toplulukIlkeleri++
      else retCounts.diger++
    }
    const retSebebi = [
      { name: '18 Yaş', value: retCounts['18yas'] },
      { name: 'Topluluk İlkeleri', value: retCounts.toplulukIlkeleri },
      { name: 'Diğer', value: retCounts.diger },
    ].filter(x => x.value > 0)

    // Uyari dagilimi (DB'den direkt)
    const uyariDagilimi = (() => {
      const counts: Record<string, number> = { '0': 0, '1': 0, '2': 0 }
      for (const row of nno) {
        const n = Math.min(Number(row.warning_count) || 0, 2)
        counts[String(n)] = (counts[String(n)] ?? 0) + 1
      }
      return [
        { uyari: '0 Uyarı', count: counts['0'] },
        { uyari: '1 Uyarı', count: counts['1'] },
        { uyari: '2 Uyarı', count: counts['2'] },
      ]
    })()

    // Disiplin dagilimi (main_role'den)
    const disiplinDagilimi = (() => {
      const counts: Record<string, number> = {}
      for (const row of nb) {
        const val = String(row.main_role ?? '').trim()
        if (val) counts[val] = (counts[val] ?? 0) + 1
      }
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([disiplin, count]) => ({ disiplin, count }))
    })()

    // Ret disiplin dagilimi
    const retDisiplinDagilimi = (() => {
      const counts: Record<string, number> = {}
      for (const row of [...nr, ...ny]) {
        const val = String(row.main_role ?? '').trim() || 'Belirtilmemiş'
        counts[val] = (counts[val] ?? 0) + 1
      }
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 12)
        .map(([disiplin, count]) => ({ disiplin, count }))
    })()

    // Degerlendiren stats
    const degerlendirenStats = (() => {
      const map = new Map<string, { kabul: number; ret: number; beklemede: number }>()
      const upsert = (name: string, type: string) => {
        const key = name || 'Atanmamış'
        if (!map.has(key)) map.set(key, { kabul: 0, ret: 0, beklemede: 0 })
        const entry = map.get(key)!
        if (type === 'kabul') entry.kabul++
        else if (type === 'ret') entry.ret++
        else entry.beklemede++
      }
      for (const row of nk) {
        const d = String(row.reviewer ?? '').trim()
        const o = String(row.approval_status ?? '').toLowerCase()
        if (d || o) upsert(d, o.includes('kabul') ? 'kabul' : o.includes('ret') ? 'ret' : 'beklemede')
      }
      for (const row of nr) upsert(String(row.reviewer ?? '').trim(), 'ret')
      for (const row of nkk) upsert(String(row.reviewer ?? '').trim(), 'kabul')
      return Array.from(map.entries())
        .map(([name, v]) => ({ name, ...v, total: v.kabul + v.ret + v.beklemede }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 12)
    })()

    // Nihai uye zaman dagilimi
    const nihaiUyeZamanDagilimi = buildCumulativeTimeSeries(buildTimeSeries(nnu, 'Timestamp'))

    // Deaktive sebepleri
    const deaktiveSebepleri = (() => {
      const counts: Record<string, number> = {}
      for (const row of nd) {
        const not = String(row.review_note ?? '').toLowerCase()
        let sebep = 'Diğer'
        if (not.includes('envanter')) sebep = 'Envanter Eksik'
        else if (not.includes('başvuru')) sebep = 'Başvuru Yapmadı'
        counts[sebep] = (counts[sebep] ?? 0) + 1
      }
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([sebep, count]) => ({ sebep, count }))
    })()

    // Conversion rates
    const totalBasvuru = nb.length || 1
    const conversionRates = {
      basvuruToKabul: nkk.length / totalBasvuru,
      basvuruToNihai: nnu.length / totalBasvuru,
      etkinlikToUye: ne.length > 0 ? nnu.length / ne.length : 0,
      retRate: (nr.length + ny.length) / totalBasvuru,
      deaktiveRate: (nd.length + nnu.length) > 0 ? nd.length / (nd.length + nnu.length) : 0,
    }

    // Pipeline duration
    const { avgDays: avgPipelineDays, buckets: pipelineDurationBuckets } =
      computePipelineDuration(nb, nkk)

    return NextResponse.json({
      funnelSnapshot,
      basvuruTimeSeries,
      kabulTimeSeries,
      retTimeSeries,
      deaktiveTimeSeries,
      retSebebi,
      uyariDagilimi,
      disiplinDagilimi,
      retDisiplinDagilimi,
      degerlendirenStats,
      nihaiUyeZamanDagilimi,
      deaktiveSebepleri,
      conversionRates,
      avgPipelineDays,
      pipelineDurationBuckets,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('Analytics error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
