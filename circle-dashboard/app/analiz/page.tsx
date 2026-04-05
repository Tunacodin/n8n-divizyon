'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { filterByPeriod } from '@/lib/analytics-utils'

type Period = '30gun' | '90gun' | '1yil' | 'tumu'

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: '30gun', label: '30 Gün' },
  { key: '90gun', label: '90 Gün' },
  { key: '1yil', label: '1 Yıl' },
  { key: 'tumu', label: 'Tümü' },
]

const C = {
  basvuru: '#3B82F6',
  kabul:   '#22C55E',
  ret:     '#EF4444',
  kontrol: '#EAB308',
  nihai:   '#F59E0B',
  deaktive:'#9CA3AF',
  etkinlik:'#06B6D4',
  disiplin:'#6366F1',
  uyari:   '#A855F7',
  beklemede: '#FB923C',
}

const PIE_COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#06B6D4', '#6366F1', '#A855F7', '#FB923C', '#9CA3AF', '#EC4899']

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK: Record<string, any> = {
  funnelSnapshot: { basvuru: 342, kontrol: 210, kesinKabul: 148, kesinRet: 87, yasKucuk: 12, nihaiOlmayan: 38, etkinliktenGelenler: 54, deaktive: 21, nihaiAgUyesi: 127 },
  basvuruTimeSeries: [
    { date: '2024-07-01', count: 14 }, { date: '2024-08-01', count: 22 }, { date: '2024-09-01', count: 31 },
    { date: '2024-10-01', count: 28 }, { date: '2024-11-01', count: 45 }, { date: '2024-12-01', count: 38 },
    { date: '2025-01-01', count: 52 }, { date: '2025-02-01', count: 41 }, { date: '2025-03-01', count: 71 },
  ],
  kabulTimeSeries: [
    { date: '2024-07-01', count: 6 }, { date: '2024-08-01', count: 9 }, { date: '2024-09-01', count: 14 },
    { date: '2024-10-01', count: 11 }, { date: '2024-11-01', count: 18 }, { date: '2024-12-01', count: 16 },
    { date: '2025-01-01', count: 22 }, { date: '2025-02-01', count: 17 }, { date: '2025-03-01', count: 35 },
  ],
  retTimeSeries: [
    { date: '2024-07-01', count: 4 }, { date: '2024-08-01', count: 7 }, { date: '2024-09-01', count: 9 },
    { date: '2024-10-01', count: 8 }, { date: '2024-11-01', count: 13 }, { date: '2024-12-01', count: 11 },
    { date: '2025-01-01', count: 15 }, { date: '2025-02-01', count: 12 }, { date: '2025-03-01', count: 20 },
  ],
  deaktiveTimeSeries: [
    { date: '2024-09-01', count: 2 }, { date: '2024-10-01', count: 3 }, { date: '2024-11-01', count: 4 },
    { date: '2024-12-01', count: 3 }, { date: '2025-01-01', count: 5 }, { date: '2025-02-01', count: 4 },
  ],
  retSebebi: [
    { name: '18 Yaş', value: 12 },
    { name: 'Topluluk İlkeleri', value: 53 },
    { name: 'Diğer', value: 34 },
  ],
  uyariDagilimi: [
    { name: '0 Uyarı', value: 62 },
    { name: '1 Uyarı', value: 31 },
    { name: '2 Uyarı', value: 14 },
  ],
  etkinlikler: [
    { ad: 'İstanbul Startup Week', count: 18, basvuranCount: 11, uyeOlanCount: 7 },
    { ad: 'Divizyon Demo Day', count: 14, basvuranCount: 12, uyeOlanCount: 10 },
    { ad: 'Boğaziçi Girişim Zirvesi', count: 10, basvuranCount: 6, uyeOlanCount: 4 },
    { ad: 'Tech İstanbul Meetup', count: 8, basvuranCount: 4, uyeOlanCount: 3 },
    { ad: 'Techne İstanbul', count: 4, basvuranCount: 2, uyeOlanCount: 2 },
  ],
  etkinlikVsUye: [
    { name: 'Üye Oldu', value: 26 },
    { name: 'Üye Olmadı', value: 28 },
  ],
  deaktiveSebepleri: [
    { name: 'Envanter Eksik', value: 13 },
    { name: 'Başvuru Yapmadı', value: 6 },
    { name: 'Diğer', value: 2 },
  ],
  retDisiplinDagilimi: [
    { name: 'Yazılım Geliştirici', value: 21 },
    { name: 'Pazarlama Uzmanı', value: 17 },
    { name: 'Tasarımcı (UI/UX)', value: 14 },
    { name: 'Girişimci', value: 11 },
    { name: 'İçerik Üreticisi', value: 9 },
    { name: 'Öğrenci', value: 8 },
    { name: 'Diğer', value: 19 },
  ],
  disiplinDagilimi: [
    { name: 'Yazılım Geliştirici', value: 78 },
    { name: 'Ürün Yöneticisi', value: 54 },
    { name: 'Tasarımcı (UI/UX)', value: 41 },
    { name: 'Girişimci', value: 37 },
    { name: 'Veri Bilimci', value: 29 },
    { name: 'Pazarlama Uzmanı', value: 22 },
    { name: 'Diğer', value: 52 },
  ],
  degerlendirenStats: [
    { name: 'Ahmet K.', kabul: 42, ret: 18, beklemede: 5, total: 65 },
    { name: 'Zeynep A.', kabul: 38, ret: 21, beklemede: 3, total: 62 },
    { name: 'Mert S.', kabul: 29, ret: 14, beklemede: 8, total: 51 },
    { name: 'Selin B.', kabul: 22, ret: 9, beklemede: 2, total: 33 },
    { name: 'Atanmamış', kabul: 17, ret: 25, beklemede: 19, total: 61 },
  ],
  nihaiUyeZamanDagilimi: [
    { date: '2024-07-01', count: 8, cumulative: 8 },
    { date: '2024-08-01', count: 11, cumulative: 19 },
    { date: '2024-09-01', count: 14, cumulative: 33 },
    { date: '2024-10-01', count: 12, cumulative: 45 },
    { date: '2024-11-01', count: 18, cumulative: 63 },
    { date: '2024-12-01', count: 15, cumulative: 78 },
    { date: '2025-01-01', count: 22, cumulative: 100 },
    { date: '2025-02-01', count: 14, cumulative: 114 },
    { date: '2025-03-01', count: 13, cumulative: 127 },
  ],
  conversionRates: { basvuruToKabul: 0.43, basvuruToNihai: 0.37, etkinlikToUye: 0.48, retRate: 0.29, deaktiveRate: 0.14 },
  avgPipelineDays: 18,
  pipelineDurationBuckets: [
    { bucket: '0–7 gün', count: 24 },
    { bucket: '8–14 gün', count: 51 },
    { bucket: '15–30 gün', count: 43 },
    { bucket: '31–60 gün', count: 22 },
    { bucket: '60+ gün', count: 8 },
  ],
}

function withMock<T>(real: T | null | undefined, mockKey: string): { value: T; isMock: boolean } {
  const isEmpty = real == null || (Array.isArray(real) && real.length === 0)
  return isEmpty
    ? { value: MOCK[mockKey] as T, isMock: true }
    : { value: real as T, isMock: false }
}

function fmtDate(dateStr: string) {
  try { return format(new Date(dateStr), 'MMM yy', { locale: tr }) } catch { return dateStr }
}

function num(v: number | undefined | null) {
  return (v ?? 0).toLocaleString('tr-TR')
}

// ─── Components ──────────────────────────────────────────────────────────────

function Skel({ h = 180 }: { h?: number }) {
  return <div className="animate-pulse bg-gray-100 rounded-xl" style={{ height: h }} />
}

function ChartCard({
  title,
  subtitle,
  loading,
  children,
}: {
  title: string
  subtitle?: string
  loading: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {loading ? <Skel /> : children}
    </div>
  )
}

function KpiCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex gap-3 items-start">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SimplePie({
  data,
  colors = PIE_COLORS,
  height = 240,
}: {
  data: { name: string; value: number }[]
  colors?: string[]
  height?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="42%"
          innerRadius={35}
          outerRadius={60}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [`${num(v)} (%${total > 0 ? ((v / total) * 100).toFixed(0) : 0})`, 'Kişi']}
        />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnalizPage() {
  const { data, error: fetchError, isLoading: loading, mutate } = useSWR<any>('/api/analytics')
  const [period, setPeriod] = useState<Period>('tumu')

  const error = fetchError ? fetchError.message : null
  const fetchData = () => mutate()

  type TPoint = { date: string; count: number }

  // Mock-aware resolved values
  const funnel       = withMock(data?.funnelSnapshot, 'funnelSnapshot')
  const retSebebi    = withMock(data?.retSebebi, 'retSebebi')
  const uyariData    = withMock(data?.uyariDagilimi, 'uyariDagilimi')
  const etkinlikVsUye= withMock(data?.etkinlikVsUye, 'etkinlikVsUye')
  const deaktiveRet  = withMock(data?.deaktiveSebepleri, 'deaktiveSebepleri')
  const retDisiplin  = withMock(data?.retDisiplinDagilimi, 'retDisiplinDagilimi')
  const disiplin     = withMock(data?.disiplinDagilimi, 'disiplinDagilimi')
  const degStat      = withMock(data?.degerlendirenStats, 'degerlendirenStats')
  const nihaiGrowth  = withMock(data?.nihaiUyeZamanDagilimi, 'nihaiUyeZamanDagilimi')
  const convRates    = withMock(data?.conversionRates, 'conversionRates')
  const pipeline     = withMock(data?.pipelineDurationBuckets, 'pipelineDurationBuckets')
  const avgDays      = data?.avgPipelineDays ?? MOCK.avgPipelineDays

  const anyMock = !data || [funnel, retSebebi, uyariData, etkinlikVsUye, deaktiveRet, disiplin, retDisiplin, degStat, nihaiGrowth, convRates, pipeline].some(r => r.isMock)

  // Period-filtered series
  const bts: TPoint[] = filterByPeriod(withMock(data?.basvuruTimeSeries, 'basvuruTimeSeries').value as TPoint[], period)
  const kts: TPoint[] = filterByPeriod(withMock(data?.kabulTimeSeries, 'kabulTimeSeries').value as TPoint[], period)
  const rts: TPoint[] = filterByPeriod(withMock(data?.retTimeSeries, 'retTimeSeries').value as TPoint[], period)

  // Merge into trend
  const trendMap = new Map<string, { date: string; basvuru: number; kabul: number; ret: number }>()
  const addTo = (arr: TPoint[], key: 'basvuru' | 'kabul' | 'ret') => {
    for (const p of arr) {
      const prev = trendMap.get(p.date) ?? { date: p.date, basvuru: 0, kabul: 0, ret: 0 }
      prev[key] = p.count
      trendMap.set(p.date, prev)
    }
  }
  addTo(bts, 'basvuru'); addTo(kts, 'kabul'); addTo(rts, 'ret')
  const trendData = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Funnel pie data
  const funnelPie = [
    { name: 'Kesin Kabul', value: funnel.value.kesinKabul },
    { name: 'Kontrol', value: funnel.value.kontrol - funnel.value.kesinKabul - funnel.value.kesinRet },
    { name: 'Kesin Ret', value: funnel.value.kesinRet },
    { name: '18 Yaş Altı', value: funnel.value.yasKucuk },
    { name: 'Nihai Olmayan', value: funnel.value.nihaiOlmayan },
  ].filter(d => d.value > 0)

  // Conversion rate data for display
  const convItems = [
    { label: 'Başvuru → Kabul', value: convRates.value.basvuruToKabul, color: C.kabul },
    { label: 'Başvuru → Nihai', value: convRates.value.basvuruToNihai, color: C.nihai },
    { label: 'Etkinlik → Üye', value: convRates.value.etkinlikToUye, color: C.etkinlik },
    { label: 'Ret Oranı', value: convRates.value.retRate, color: C.ret },
  ]

  const totalRet = funnel.value.kesinRet + funnel.value.yasKucuk

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analiz</h1>
            <p className="text-xs text-gray-500 mt-0.5">Üyelik süreci metrikleri</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {PERIOD_OPTIONS.map(o => (
                <button
                  key={o.key}
                  onClick={() => setPeriod(o.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    period === o.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Yenile
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {!loading && anyMock && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">Demo verisi gösteriliyor</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Toplam Başvuru" value={loading ? '—' : num(funnel.value.basvuru)} color={C.basvuru} />
          <KpiCard
            label="Kesin Kabul"
            value={loading ? '—' : num(funnel.value.kesinKabul)}
            color={C.kabul}
            sub={`%${((funnel.value.kesinKabul / (funnel.value.basvuru || 1)) * 100).toFixed(1)}`}
          />
          <KpiCard
            label="Toplam Ret"
            value={loading ? '—' : num(totalRet)}
            color={C.ret}
            sub={`%${((totalRet / (funnel.value.basvuru || 1)) * 100).toFixed(1)}`}
          />
          <KpiCard
            label="Nihai Ağ Üyesi"
            value={loading ? '—' : num(funnel.value.nihaiAgUyesi)}
            color={C.nihai}
            sub={avgDays != null ? `Ort. ${avgDays} gün` : undefined}
          />
        </div>

        {/* Trend Chart */}
        <ChartCard title="Başvuru Trendleri" subtitle={PERIOD_OPTIONS.find(o => o.key === period)?.label} loading={loading}>
          {trendData.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Veri bulunamadı</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                        <p className="font-semibold text-gray-700 mb-1">{fmtDate(label)}</p>
                        {payload.map((p: any) => (
                          <div key={p.dataKey} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                            <span className="text-gray-500">{p.name}:</span>
                            <span className="font-medium">{num(p.value)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="basvuru" name="Başvuru" fill={C.basvuru} stroke={C.basvuru} fillOpacity={0.1} />
                <Line type="monotone" dataKey="kabul" name="Kabul" stroke={C.kabul} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ret" name="Ret" stroke={C.ret} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Row: Hunisi Pie + Ret Sebepleri Pie + Etkinlik→Üye Pie */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartCard title="Üyelik Hunisi" subtitle="Başvuru durumu dağılımı" loading={loading}>
            <SimplePie data={funnelPie} colors={[C.kabul, C.kontrol, C.ret, C.beklemede, C.deaktive]} />
          </ChartCard>

          <ChartCard title="Ret Sebepleri" subtitle="Neden reddedildi?" loading={loading}>
            <SimplePie data={retSebebi.value} colors={[C.beklemede, C.ret, C.deaktive]} />
          </ChartCard>

          <ChartCard title="Etkinlik → Üyelik" subtitle="Etkinlikten gelenler" loading={loading}>
            <SimplePie data={etkinlikVsUye.value} colors={[C.kabul, C.deaktive]} />
          </ChartCard>
        </div>

        {/* Row: Roller Pie + Reddedilen Roller Pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Başvuran Roller" subtitle="Profesyonel alan dağılımı" loading={loading}>
            <SimplePie data={disiplin.value} height={220} />
          </ChartCard>

          <ChartCard title="Reddedilen Roller" subtitle="Reddedilenlerin alan dağılımı" loading={loading}>
            <SimplePie data={retDisiplin.value} colors={['#EF4444', '#FB923C', '#F59E0B', '#9CA3AF', '#6366F1', '#A855F7', '#EC4899']} height={220} />
          </ChartCard>
        </div>

        {/* Row: Konversiyon Oranları + Uyarı + Deaktive Sebep */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartCard title="Konversiyon Oranları" loading={loading}>
            <div className="space-y-3">
              {convItems.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold" style={{ color: item.color }}>%{(item.value * 100).toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.value * 100}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Uyarı Dağılımı" subtitle="Nihai olmayan üyeler" loading={loading}>
            <SimplePie data={uyariData.value} colors={[C.kabul, C.uyari, C.ret]} />
          </ChartCard>

          <ChartCard title="Deaktive Sebepleri" loading={loading}>
            <SimplePie data={deaktiveRet.value} colors={[C.beklemede, C.deaktive, C.ret]} />
          </ChartCard>
        </div>

        {/* Değerlendirici Bar + Süreç Süresi Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Değerlendirici Kararları" loading={loading}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={degStat.value}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip
                  formatter={(v: number, name: string) => [num(v), name]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="kabul" name="Kabul" fill={C.kabul} stackId="a" />
                <Bar dataKey="ret" name="Ret" fill={C.ret} stackId="a" />
                <Bar dataKey="beklemede" name="Beklemede" fill={C.beklemede} stackId="a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Süreç Süresi" subtitle={`Ortalama: ${avgDays} gün`} loading={loading}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipeline.value}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip formatter={(v: number) => [num(v), 'Kişi']} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" name="Kişi" fill={C.nihai} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Nihai Üye Büyüme */}
        <ChartCard title="Nihai Ağ Üyesi Büyümesi" subtitle="Kümülatif büyüme" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={nihaiGrowth.value}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip formatter={(v: number) => [num(v), 'Kümülatif Üye']} labelFormatter={fmtDate} contentStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="cumulative" name="Kümülatif Üye" stroke={C.nihai} fill={C.nihai} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <p className="text-xs text-gray-400 text-center pb-4">
          {data?.generatedAt
            ? `Son güncelleme: ${new Date(data.generatedAt).toLocaleString('tr-TR')}`
            : 'Veriler Google Sheets gviz API üzerinden çekilmektedir'}
        </p>
      </div>
    </div>
  )
}
