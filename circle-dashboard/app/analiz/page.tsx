'use client'

import { useEffect, useState } from 'react'
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

const RET_COLORS = ['#FB923C', '#EF4444', '#9CA3AF']
const ETKINLIK_COLORS = ['#22C55E', '#9CA3AF']

// ─── Mock Data ───────────────────────────────────────────────────────────────
// Gerçek veri boş geldiğinde önizleme amacıyla kullanılır

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
    { uyari: '0 Uyarı', count: 62 },
    { uyari: '1 Uyarı', count: 31 },
    { uyari: '2 Uyarı', count: 14 },
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
    { sebep: 'Envanter Eksik', count: 13 },
    { sebep: 'Başvuru Yapmadı', count: 6 },
    { sebep: 'Diğer', count: 2 },
  ],
  retDisiplinDagilimi: [
    { disiplin: 'Yazılım Geliştirici', count: 21 },
    { disiplin: 'Pazarlama Uzmanı', count: 17 },
    { disiplin: 'Tasarımcı (UI/UX)', count: 14 },
    { disiplin: 'Girişimci', count: 11 },
    { disiplin: 'İçerik Üreticisi', count: 9 },
    { disiplin: 'Öğrenci', count: 8 },
    { disiplin: 'Yönetici / Direktör', count: 6 },
    { disiplin: 'Belirtilmemiş', count: 13 },
  ],
  disiplinDagilimi: [
    { disiplin: 'Yazılım Geliştirici', count: 78 },
    { disiplin: 'Ürün Yöneticisi', count: 54 },
    { disiplin: 'Tasarımcı (UI/UX)', count: 41 },
    { disiplin: 'Girişimci', count: 37 },
    { disiplin: 'Veri Bilimci', count: 29 },
    { disiplin: 'Pazarlama Uzmanı', count: 22 },
    { disiplin: 'Akademisyen', count: 18 },
    { disiplin: 'Yatırımcı', count: 14 },
    { disiplin: 'İçerik Üreticisi', count: 11 },
    { disiplin: 'Danışman', count: 9 },
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

/** Gerçek veri boş/eksik ise mock döner. Mock kullanıldıysa `_isMock: true` işareti. */
function withMock<T>(real: T | null | undefined, mockKey: string): { value: T; isMock: boolean } {
  const isEmpty = real == null || (Array.isArray(real) && real.length === 0)
  return isEmpty
    ? { value: MOCK[mockKey] as T, isMock: true }
    : { value: real as T, isMock: false }
}

function fmtDate(dateStr: string) {
  try { return format(new Date(dateStr), 'MMM yy', { locale: tr }) } catch { return dateStr }
}

function fmtPct(v: number) {
  return `%${(v * 100).toFixed(1)}`
}

function num(v: number) {
  return v.toLocaleString('tr-TR')
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skel({ h = 200 }: { h?: number }) {
  return <div className="animate-pulse bg-gray-100 rounded-xl" style={{ height: h }} />
}

// ─── Chart Card ──────────────────────────────────────────────────────────────

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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {loading ? <Skel /> : children}
    </div>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function TurkishTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-semibold text-gray-700 mb-1">{fmtDate(label)}</p>}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900">{num(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color,
  sub,
}: {
  label: string
  value: string | number
  color: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex gap-4 items-start">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnalizPage() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('tumu')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  type TPoint = { date: string; count: number }

  // Mock-aware resolved values
  const funnel       = withMock(data?.funnelSnapshot, 'funnelSnapshot')
  const retSebebi    = withMock(data?.retSebebi, 'retSebebi')
  const uyariData    = withMock(data?.uyariDagilimi, 'uyariDagilimi')
  const etkinlikler  = withMock(data?.etkinlikler, 'etkinlikler')
  const etkinlikVsUye= withMock(data?.etkinlikVsUye, 'etkinlikVsUye')
  const deaktiveRet  = withMock(data?.deaktiveSebepleri, 'deaktiveSebepleri')
  const retDisiplin  = withMock(data?.retDisiplinDagilimi, 'retDisiplinDagilimi')
  const disiplin     = withMock(data?.disiplinDagilimi, 'disiplinDagilimi')
  const degStat      = withMock(data?.degerlendirenStats, 'degerlendirenStats')
  const nihaiGrowth  = withMock(data?.nihaiUyeZamanDagilimi, 'nihaiUyeZamanDagilimi')
  const convRates    = withMock(data?.conversionRates, 'conversionRates')
  const pipeline     = withMock(data?.pipelineDurationBuckets, 'pipelineDurationBuckets')
  const avgDays      = data?.avgPipelineDays ?? MOCK.avgPipelineDays

  // Any mock being used?
  const anyMock = !data || [funnel, retSebebi, uyariData, etkinlikler, etkinlikVsUye, deaktiveRet, disiplin, retDisiplin, degStat, nihaiGrowth, convRates, pipeline].some(r => r.isMock)

  // Period-filtered series
  const bts: TPoint[] = filterByPeriod(withMock(data?.basvuruTimeSeries, 'basvuruTimeSeries').value as TPoint[], period)
  const kts: TPoint[] = filterByPeriod(withMock(data?.kabulTimeSeries, 'kabulTimeSeries').value as TPoint[], period)
  const rts: TPoint[] = filterByPeriod(withMock(data?.retTimeSeries, 'retTimeSeries').value as TPoint[], period)
  const dts: TPoint[] = filterByPeriod(withMock(data?.deaktiveTimeSeries, 'deaktiveTimeSeries').value as TPoint[], period)

  // Merge basvuru/kabul/ret into combined series for trend chart
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

  // Funnel data
  const funnelData = [
    { name: 'Başvuru', value: funnel.value.basvuru, fill: C.basvuru },
    { name: 'Kontrol', value: funnel.value.kontrol, fill: C.kontrol },
    { name: 'Kesin Kabul', value: funnel.value.kesinKabul, fill: C.kabul },
    { name: 'Nihai Üye', value: funnel.value.nihaiAgUyesi, fill: C.nihai },
  ]

  // Conversion rate bars
  const convData = [
    { name: 'Başvuru → Kabul', value: +(convRates.value.basvuruToKabul * 100).toFixed(1), fill: C.kabul },
    { name: 'Başvuru → Nihai', value: +(convRates.value.basvuruToNihai * 100).toFixed(1), fill: C.nihai },
    { name: 'Etkinlik → Üye', value: +(convRates.value.etkinlikToUye * 100).toFixed(1), fill: C.etkinlik },
    { name: 'Ret Oranı',       value: +(convRates.value.retRate * 100).toFixed(1), fill: C.ret },
    { name: 'Deaktive Oranı',  value: +(convRates.value.deaktiveRate * 100).toFixed(1), fill: C.deaktive },
  ]

  const totalRet = funnel.value.kesinRet + funnel.value.yasKucuk

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analiz</h1>
            <p className="text-sm text-gray-500 mt-0.5">Üyelik süreci metrikleri ve istatistiksel analizler</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Toggle */}
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

      <div className="p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Mock data banner */}
        {!loading && anyMock && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              Demo verisi gösteriliyor — gerçek veriler yüklendiğinde bu grafikler otomatik güncellenir.
            </p>
          </div>
        )}

        {/* ── 1. KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Toplam Başvuru" value={loading ? '—' : num(funnel.value.basvuru)} color={C.basvuru} />
          <KpiCard
            label="Toplam Kabul"
            value={loading ? '—' : num(funnel.value.kesinKabul)}
            color={C.kabul}
            sub={`%${((funnel.value.kesinKabul / (funnel.value.basvuru || 1)) * 100).toFixed(1)} dönüşüm`}
          />
          <KpiCard
            label="Toplam Ret"
            value={loading ? '—' : num(totalRet)}
            color={C.ret}
            sub={`%${((totalRet / (funnel.value.basvuru || 1)) * 100).toFixed(1)} ret oranı`}
          />
          <KpiCard
            label="Nihai Ağ Üyesi"
            value={loading ? '—' : num(funnel.value.nihaiAgUyesi)}
            color={C.nihai}
            sub={avgDays != null ? `Ort. ${avgDays} gün süreç` : undefined}
          />
        </div>

        {/* ── 2. Trend Chart (full-width) ───────────────────────────────────── */}
        <ChartCard
          title="Başvuru Trendleri"
          subtitle={`Seçili dönem: ${PERIOD_OPTIONS.find(o => o.key === period)?.label}`}
          loading={loading}
        >
          {trendData.length === 0 && loading ? (
            <Skel h={280} />
          ) : trendData.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Bu dönem için veri bulunamadı</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip content={<TurkishTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="basvuru" name="Başvuru" fill={C.basvuru} stroke={C.basvuru} fillOpacity={0.15} />
                <Line type="monotone" dataKey="kabul" name="Kabul" stroke={C.kabul} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ret" name="Ret" stroke={C.ret} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── 3. Funnel + Ret Sebebi ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Üyelik Hunisi" subtitle="Başvurudan nihai üyeliğe dönüşüm" loading={loading}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} width={90} />
                <Tooltip formatter={(v: number) => [num(v), 'Kişi']} />
                <Bar dataKey="value" name="Kişi" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Ret Sebepleri Dağılımı" subtitle="Kesin ret + 18 yaş altı birleşik" loading={loading}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={retSebebi.value}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                  labelLine={false}
                >
                  {retSebebi.value.map((_: any, i: number) => (
                    <Cell key={i} fill={RET_COLORS[i % RET_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [num(v), 'Kişi']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── 3b. Reddedilenlerin Meslek Dağılımı (full-width) ─────────────── */}
        <ChartCard
          title="Reddedilenlerin Meslek / Alan Dağılımı"
          subtitle="Kesin ret + 18 yaş altı — başvuru formundaki profesyonel alan bilgisine göre"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={Math.max(240, retDisiplin.value.length * 38)}>
            <BarChart data={retDisiplin.value} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis
                type="category"
                dataKey="disiplin"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                width={150}
                tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + '…' : v}
              />
              <Tooltip
                formatter={(v: number, _: any, props: any) => {
                  const total = retDisiplin.value.reduce((s: number, r: any) => s + r.count, 0)
                  const pct = total > 0 ? ` (%${((v / total) * 100).toFixed(1)})` : ''
                  return [`${num(v)} kişi${pct}`, props.payload.disiplin]
                }}
              />
              <Bar dataKey="count" name="Reddedilen" fill={C.ret} radius={[0, 4, 4, 0]}>
                {retDisiplin.value.map((_: any, i: number) => (
                  <Cell
                    key={i}
                    fill={`hsl(${4 + i * 8}, ${75 - i * 3}%, ${50 + i * 2}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── 4. Değerlendirici İstatistikleri (full-width) ─────────────────── */}
        <ChartCard
          title="Değerlendirici Kararları"
          subtitle="Her değerlendirici için kabul / ret / beklemede sayıları"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={300}>
              <BarChart data={degStat.value} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip content={<TurkishTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="kabul" name="Kabul" fill={C.kabul} stackId="a" />
                <Bar dataKey="ret" name="Ret" fill={C.ret} stackId="a" />
                <Bar dataKey="beklemede" name="Beklemede" fill={C.beklemede} stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        </ChartCard>

        {/* ── 5. Uyarı Dağılımı + Deaktive Trendi ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Nihai Üyeliğe Kaç Uyarıyla Geçildi"
            subtitle="Nihai olmayan üyeler — uyarı sayısı dağılımı"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={uyariData.value}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="uyari" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip formatter={(v: number) => [num(v), 'Kişi']} />
                <Bar dataKey="count" name="Kişi" fill={C.uyari} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Deaktive Trendi"
            subtitle={`Seçili dönem: ${PERIOD_OPTIONS.find(o => o.key === period)?.label}`}
            loading={loading}
          >
            {dts.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">Bu dönem için veri bulunamadı</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip content={<TurkishTooltip />} />
                  <Area type="monotone" dataKey="count" name="Deaktive" stroke={C.deaktive} fill={C.deaktive} fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── 6. Etkinlik Analizi ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Etkinlik Bazlı Katılımcılar"
            subtitle="Her etkinlikten gelen kişi sayısı ve başvuran oranı"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={Math.max(220, etkinlikler.value.length * 48)}>
                <BarChart data={etkinlikler.value} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis
                    type="category"
                    dataKey="ad"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    width={110}
                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                  />
                  <Tooltip formatter={(v: number) => [num(v), 'Kişi']} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Toplam" fill={C.etkinlik} radius={[0, 3, 3, 0]} />
                  <Bar dataKey="uyeOlanCount" name="Ağ Üyesi Oldu" fill={C.kabul} radius={[0, 3, 3, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Etkinlik → Ağ Üyeliği"
            subtitle="Etkinlikten gelen kişilerin nihai durumu"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={etkinlikVsUye.value}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                  labelLine={false}
                >
                  {etkinlikVsUye.value.map((_: any, i: number) => (
                    <Cell key={i} fill={ETKINLIK_COLORS[i % ETKINLIK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [num(v), 'Kişi']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── 7. Disiplin + Deaktive Sebepleri ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Üretici Rolleri Dağılımı"
            subtitle="Başvuranlarda en sık görülen profesyonel roller (top 15)"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={360}>
                <BarChart data={disiplin.value} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis
                    type="category"
                    dataKey="disiplin"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    width={130}
                    tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + '…' : v}
                  />
                  <Tooltip formatter={(v: number) => [num(v), 'Kişi']} labelFormatter={(l) => l} />
                  <Bar dataKey="count" name="Kişi" fill={C.disiplin} radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Deaktive Sebepleri"
            subtitle="Üyelikten çıkarılma nedenleri"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deaktiveRet.value} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis
                    type="category"
                    dataKey="sebep"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    width={120}
                    tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + '…' : v}
                  />
                  <Tooltip formatter={(v: number) => [num(v), 'Kişi']} />
                  <Bar dataKey="count" name="Kişi" fill={C.deaktive} radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── 8. Pipeline Süresi + Konversiyon ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Süreç Süresi Dağılımı"
            subtitle={avgDays != null ? `Ortalama: ${avgDays} gün (başvurudan kabule)` : 'Başvurudan kesin kabule geçen süre'}
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipeline.value}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(v: number) => [num(v), 'Kişi']} />
                  <Bar dataKey="count" name="Kişi" fill={C.nihai} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Konversiyon Oranları"
            subtitle="Aşamalar arası geçiş yüzdeleri"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={convData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `%${v}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} width={120} />
                <Tooltip formatter={(v: number) => [`%${v}`, '']} />
                <Bar dataKey="value" name="Oran" radius={[0, 4, 4, 0]}>
                  {convData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── 9. Nihai Üye Kümülatif Büyüme (full-width) ───────────────────── */}
        <ChartCard
          title="Nihai Ağ Üyesi Büyümesi"
          subtitle="Kesin kabul tarihlerine göre kümülatif büyüme (eşleşen üyeler)"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={nihaiGrowth.value}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip
                  formatter={(v: number) => [num(v), 'Kümülatif Üye']}
                  labelFormatter={fmtDate}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Kümülatif Üye"
                  stroke={C.nihai}
                  fill={C.nihai}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center pb-4">
          {data?.generatedAt
            ? `Son güncelleme: ${new Date(data.generatedAt).toLocaleString('tr-TR')} — veriler 2 dakikada bir yenilenir`
            : 'Veriler Google Sheets gviz API üzerinden çekilmektedir'}
        </p>
      </div>
    </div>
  )
}
