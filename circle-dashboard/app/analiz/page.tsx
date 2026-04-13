'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'

type Period = '30gun' | '90gun' | '1yil' | 'tumu'

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: '30gun', label: '30 Gün' },
  { key: '90gun', label: '90 Gün' },
  { key: '1yil', label: '1 Yıl' },
  { key: 'tumu', label: 'Tümü' },
]

const C = {
  basvuru: '#3B82F6',
  kontrol: '#EAB308',
  kabul:   '#22C55E',
  ret:     '#EF4444',
  nihai:   '#F59E0B',
  gri:     '#9CA3AF',
  beklemede: '#FB923C',
}

type Kpi = {
  totalBasvuru: number
  kontrolBekleyen: number
  nihaiUye: number
  envanterDeadlineYaklasan: number
}

type AnalyticsData = {
  kpi: Kpi
  funnel: { stage: string; count: number }[]
  basvuruTimeSeries: { date: string; count: number }[]
  retSebebi: { name: string; value: number }[]
  disiplinDagilimi: { disiplin: string; count: number }[]
  envanterTamamlama: {
    toplamKabul: number
    ikisiTamam: number
    sadeceKarakteristik: number
    sadeceDisipliner: number
    hicbiri: number
  }
  degerlendirenStats: { name: string; kabul: number; ret: number; beklemede: number; total: number }[]
  generatedAt: string
}

function fmtMonth(iso: string) {
  try { return format(new Date(iso), 'MMM yy', { locale: tr }) } catch { return iso }
}

function num(v: number | undefined | null) {
  return (v ?? 0).toLocaleString('tr-TR')
}

function Skel({ h = 200 }: { h?: number }) {
  return <div className="animate-pulse bg-gray-100 rounded-xl" style={{ height: h }} />
}

function ChartCard({
  title, subtitle, loading, children, className = '', height,
}: {
  title: string
  subtitle?: string
  loading: boolean
  height?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col ${className}`}>
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0">
        {loading ? <Skel h={height ?? 140} /> : children}
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex gap-2.5 items-start">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color }}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function filterSeries(series: { date: string; count: number }[], period: Period) {
  if (period === 'tumu') return series
  const days = period === '30gun' ? 30 : period === '90gun' ? 90 : 365
  const cutoff = subDays(new Date(), days)
  return series.filter(p => new Date(p.date) >= cutoff)
}

export default function AnalizPage() {
  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>('/api/analytics')
  const [period, setPeriod] = useState<Period>('tumu')

  const loading = isLoading
  const kpi = data?.kpi
  const hasData = !!data && !error

  const trendData = data ? filterSeries(data.basvuruTimeSeries, period) : []

  // Envanter tamamlama yüzde
  const envanter = data?.envanterTamamlama
  const envanterPie = envanter && envanter.toplamKabul > 0 ? [
    { name: 'İkisi Tamam', value: envanter.ikisiTamam },
    { name: 'Sadece Karakteristik', value: envanter.sadeceKarakteristik },
    { name: 'Sadece Disipliner', value: envanter.sadeceDisipliner },
    { name: 'Hiçbiri', value: envanter.hicbiri },
  ].filter(d => d.value > 0) : []
  const envanterPct = envanter && envanter.toplamKabul > 0
    ? ((envanter.ikisiTamam / envanter.toplamKabul) * 100).toFixed(0)
    : '0'

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
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
              onClick={() => mutate()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Yenile
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error.message ?? 'Veri yüklenemedi'}
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Toplam Başvuru"
            value={loading || !kpi ? '—' : num(kpi.totalBasvuru)}
            color={C.basvuru}
          />
          <KpiCard
            label="Kontrolde Bekleyen"
            value={loading || !kpi ? '—' : num(kpi.kontrolBekleyen)}
            color={C.kontrol}
            sub="İnceleme bekliyor"
          />
          <KpiCard
            label="Nihai Ağ Üyesi"
            value={loading || !kpi ? '—' : num(kpi.nihaiUye)}
            color={C.nihai}
          />
          <KpiCard
            label="Deadline Yaklaşan"
            value={loading || !kpi ? '—' : num(kpi.envanterDeadlineYaklasan)}
            color={C.ret}
            sub="2 hafta dolmak üzere"
          />
        </div>

        {/* Bento — Row 1: Funnel (4) · Trend (8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <ChartCard title="Üyelik Hunisi" subtitle="Başvurudan nihai üyeliğe" loading={loading} className="lg:col-span-4">
            {hasData && data.funnel.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.funnel} margin={{ left: 0, right: 10, top: 4, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 9, fill: '#6B7280' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={44}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} width={28} />
                  <Tooltip formatter={(v: number) => [num(v), 'Kişi']} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill={C.basvuru} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-6 text-xs">Veri yok</p>
            )}
          </ChartCard>

          <ChartCard
            title="Başvuru Trendi"
            subtitle={PERIOD_OPTIONS.find(o => o.key === period)?.label}
            loading={loading}
            className="lg:col-span-8"
          >
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={trendData} margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tickFormatter={fmtMonth} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} width={28} />
                  <Tooltip
                    formatter={(v: number) => [num(v), 'Başvuru']}
                    labelFormatter={fmtMonth}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="count" stroke={C.basvuru} strokeWidth={2} dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-6 text-xs">Bu dönemde başvuru yok</p>
            )}
          </ChartCard>
        </div>

        {/* Bento — Row 2: Ret (3) · Envanter (3) · Disiplin (6) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <ChartCard title="Ret Sebepleri" loading={loading} className="lg:col-span-3">
            {hasData && data.retSebebi.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={data.retSebebi}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={32}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {data.retSebebi.map((_, i) => (
                      <Cell key={i} fill={[C.beklemede, C.ret, C.gri][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [num(v), 'Kişi']} contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-6 text-xs">Ret kaydı yok</p>
            )}
          </ChartCard>

          <ChartCard
            title="Envanter Tamamlama"
            subtitle={
              envanter
                ? `%${envanterPct} · ${envanter.ikisiTamam}/${envanter.toplamKabul}`
                : undefined
            }
            loading={loading}
            className="lg:col-span-3"
          >
            {envanterPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={envanterPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={32}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {envanterPie.map((_, i) => (
                      <Cell key={i} fill={[C.kabul, C.kontrol, C.beklemede, C.ret][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [num(v), 'Kişi']} contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-6 text-xs">Kabul yok</p>
            )}
          </ChartCard>

          <ChartCard
            title="Disiplin Dağılımı"
            subtitle="Top 8 rol / alan"
            loading={loading}
            className="lg:col-span-6"
          >
            {hasData && data.disiplinDagilimi.length > 0 ? (
              (() => {
                const top = data.disiplinDagilimi.slice(0, 8)
                const max = Math.max(...top.map(d => d.count), 1)
                const total = data.disiplinDagilimi.reduce((s, d) => s + d.count, 0)
                return (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-1.5 pr-2 w-6">#</th>
                        <th className="py-1.5 pr-2">Disiplin</th>
                        <th className="py-1.5 pr-2 text-right w-10">Kişi</th>
                        <th className="py-1.5 pr-2 text-right w-10">%</th>
                        <th className="py-1.5 pl-2 w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((d, i) => {
                        const pct = total > 0 ? (d.count / total) * 100 : 0
                        const w = (d.count / max) * 100
                        return (
                          <tr key={d.disiplin} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 pr-2 text-gray-400 tabular-nums">{i + 1}</td>
                            <td className="py-1.5 pr-2 text-gray-700 truncate max-w-[220px]" title={d.disiplin}>{d.disiplin}</td>
                            <td className="py-1.5 pr-2 text-right font-semibold text-gray-900 tabular-nums">{num(d.count)}</td>
                            <td className="py-1.5 pr-2 text-right text-gray-500 tabular-nums">{pct.toFixed(1)}</td>
                            <td className="py-1.5 pl-2">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${w}%`, background: C.basvuru }} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              })()
            ) : (
              <p className="text-center text-gray-400 py-6 text-xs">Disiplin verisi yok</p>
            )}
          </ChartCard>
        </div>

        {/* Bento — Row 3: Değerlendirici (full) — tablo */}
        <ChartCard title="Değerlendirici Yükü" subtitle="Kabul / ret / bekleyen dağılımı ve kabul oranı" loading={loading}>
          {hasData && data.degerlendirenStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2 pr-3">Değerlendirici</th>
                    <th className="py-2 pr-3 text-right w-14">Toplam</th>
                    <th className="py-2 pr-3 text-right w-14">Kabul</th>
                    <th className="py-2 pr-3 text-right w-14">Ret</th>
                    <th className="py-2 pr-3 text-right w-16">Bekleyen</th>
                    <th className="py-2 pr-3 text-right w-16">Kabul %</th>
                    <th className="py-2 pl-3 w-[140px]">Oran dağılımı</th>
                  </tr>
                </thead>
                <tbody>
                  {data.degerlendirenStats.slice(0, 10).map((r) => {
                    const pct = r.total > 0 ? (r.kabul / r.total) * 100 : 0
                    const kPct = r.total > 0 ? (r.kabul / r.total) * 100 : 0
                    const retPct = r.total > 0 ? (r.ret / r.total) * 100 : 0
                    const bPct = r.total > 0 ? (r.beklemede / r.total) * 100 : 0
                    return (
                      <tr key={r.name} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-3 text-gray-800 font-medium truncate max-w-[220px]" title={r.name}>{r.name}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-gray-900 tabular-nums">{num(r.total)}</td>
                        <td className="py-2 pr-3 text-right text-gray-600 tabular-nums">{num(r.kabul)}</td>
                        <td className="py-2 pr-3 text-right text-gray-600 tabular-nums">{num(r.ret)}</td>
                        <td className="py-2 pr-3 text-right text-gray-600 tabular-nums">{num(r.beklemede)}</td>
                        <td className="py-2 pr-3 text-right font-medium tabular-nums" style={{ color: C.kabul }}>
                          {pct.toFixed(0)}
                        </td>
                        <td className="py-2 pl-3">
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                            {kPct > 0 && <div style={{ width: `${kPct}%`, background: C.kabul }} />}
                            {retPct > 0 && <div style={{ width: `${retPct}%`, background: C.ret }} />}
                            {bPct > 0 && <div style={{ width: `${bPct}%`, background: C.beklemede }} />}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.kabul }} />Kabul</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.ret }} />Ret</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.beklemede }} />Bekleyen</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-6 text-xs">Değerlendirici verisi yok</p>
          )}
        </ChartCard>

        <p className="text-xs text-gray-400 text-center pb-4">
          {data?.generatedAt
            ? `Son güncelleme: ${new Date(data.generatedAt).toLocaleString('tr-TR')}`
            : '—'}
        </p>
      </div>
    </div>
  )
}
