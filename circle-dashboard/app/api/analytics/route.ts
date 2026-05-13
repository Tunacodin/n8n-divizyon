import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, format, differenceInDays } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AppRow = {
  id: string
  status: string
  email: string | null
  main_role: string | null
  reviewer: string | null
  review_note: string | null
  approval_status: string | null
  submitted_at: Date | null
  approved_at: Date | null
  is_protected: boolean | null
}

type TaskRow = {
  application_id: string
  task_type: string
  completed: boolean | null
}

export async function GET() {
  try {
    const [apps, tasks] = await Promise.all([
      prisma.applications.findMany({
        where: { is_protected: false },
        select: {
          id: true, status: true, email: true, main_role: true, reviewer: true,
          review_note: true, approval_status: true, submitted_at: true, approved_at: true, is_protected: true,
        },
      }),
      prisma.task_completions.findMany({
        select: { application_id: true, task_type: true, completed: true },
      }),
    ])

    const rows = apps as AppRow[]
    const taskRows = tasks as TaskRow[]

    const basvuru = rows.filter((r) => r.status === 'basvuru')
    void basvuru
    const kontrol = rows.filter((r) => r.status === 'kontrol')
    const kabul = rows.filter((r) => r.status === 'kesin_kabul')
    const ret = rows.filter((r) => r.status === 'kesin_ret' || r.status === 'yas_kucuk')
    const nihaiUye = rows.filter((r) => r.status === 'nihai_uye')
    const allKabul = [...kabul, ...nihaiUye]

    const funnel = [
      { stage: 'Başvuru', count: rows.length },
      { stage: 'Kontrol', count: kontrol.length + allKabul.length + ret.length },
      { stage: 'Kesin Kabul', count: allKabul.length },
      { stage: 'Oryantasyon', count: countTask(taskRows, 'oryantasyon') },
      { stage: 'Nihai Üye', count: nihaiUye.length },
    ]

    const monthMap: Record<string, number> = {}
    for (const r of rows) {
      if (!r.submitted_at) continue
      const d = new Date(r.submitted_at)
      if (isNaN(d.getTime())) continue
      const key = format(startOfMonth(d), 'yyyy-MM-01')
      monthMap[key] = (monthMap[key] ?? 0) + 1
    }
    const basvuruTimeSeries = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    const retCounts = { yas: 0, topluluk: 0, diger: 0 }
    for (const r of ret) {
      if (r.status === 'yas_kucuk') { retCounts.yas++; continue }
      const not = String(r.review_note ?? '').toLowerCase()
      if (not.includes('topluluk')) retCounts.topluluk++
      else retCounts.diger++
    }
    const retSebebi = [
      { name: '18 Yaş Altı', value: retCounts.yas },
      { name: 'Topluluk İlkeleri', value: retCounts.topluluk },
      { name: 'Diğer', value: retCounts.diger },
    ].filter((x) => x.value > 0)

    const disCount: Record<string, number> = {}
    for (const r of rows) {
      const v = (r.main_role ?? '').trim()
      if (!v) continue
      const first = v.split(/[,\n]/)[0].trim()
      if (first) disCount[first] = (disCount[first] ?? 0) + 1
    }
    const disiplinDagilimi = Object.entries(disCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([disiplin, count]) => ({ disiplin, count }))

    const karSet = new Set<string>()
    const disSet = new Set<string>()
    for (const t of taskRows) {
      if (!t.completed) continue
      if (t.task_type === 'karakteristik_envanter') karSet.add(t.application_id)
      else if (t.task_type === 'disipliner_envanter') disSet.add(t.application_id)
    }
    let ikisiTamam = 0, sadeceKar = 0, sadeceDis = 0, hicbiri = 0
    for (const a of allKabul) {
      const k = karSet.has(a.id)
      const d = disSet.has(a.id)
      if (k && d) ikisiTamam++
      else if (k) sadeceKar++
      else if (d) sadeceDis++
      else hicbiri++
    }
    const envanterTamamlama = {
      toplamKabul: allKabul.length,
      ikisiTamam,
      sadeceKarakteristik: sadeceKar,
      sadeceDisipliner: sadeceDis,
      hicbiri,
    }

    const revMap = new Map<string, { kabul: number; ret: number; beklemede: number }>()
    const upsert = (name: string, type: 'kabul' | 'ret' | 'beklemede') => {
      const key = (name || '').trim() || 'Atanmamış'
      if (!revMap.has(key)) revMap.set(key, { kabul: 0, ret: 0, beklemede: 0 })
      revMap.get(key)![type]++
    }
    for (const r of kontrol) {
      const o = String(r.approval_status ?? '').toLowerCase()
      upsert(r.reviewer ?? '', o.includes('kabul') ? 'kabul' : o.includes('ret') ? 'ret' : 'beklemede')
    }
    for (const r of ret) upsert(r.reviewer ?? '', 'ret')
    for (const r of allKabul) upsert(r.reviewer ?? '', 'kabul')
    const degerlendirenStats = Array.from(revMap.entries())
      .map(([name, v]) => ({ name, ...v, total: v.kabul + v.ret + v.beklemede }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    const now = new Date()
    let envanterDeadlineYaklasan = 0
    for (const a of allKabul) {
      if (!a.approved_at) continue
      const days = differenceInDays(now, new Date(a.approved_at))
      if (days < 10 || days > 14) continue
      if (karSet.has(a.id) && disSet.has(a.id)) continue
      envanterDeadlineYaklasan++
    }

    const kpi = {
      totalBasvuru: rows.length,
      kontrolBekleyen: kontrol.length,
      nihaiUye: nihaiUye.length,
      envanterDeadlineYaklasan,
    }

    return NextResponse.json({
      kpi,
      funnel,
      basvuruTimeSeries,
      retSebebi,
      disiplinDagilimi,
      envanterTamamlama,
      degerlendirenStats,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    console.error('Analytics error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function countTask(tasks: TaskRow[], type: string): number {
  const s = new Set<string>()
  for (const t of tasks) {
    if (t.task_type === type && t.completed) s.add(t.application_id)
  }
  return s.size
}
