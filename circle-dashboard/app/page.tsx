'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  SparklesIcon,
  ArrowRightIcon,
  PencilSquareIcon,
  ArrowPathRoundedSquareIcon,
  UserPlusIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import KontrolDetailModal from '@/components/kontrol/KontrolDetailModal'
import MemberDetailModal from '@/components/uyeler/MemberDetailModal'

interface TaskCompletion {
  task_type: string
  completed: boolean
}

interface AppItem {
  id: string
  full_name: string
  email: string
  phone?: string
  status: string
  reviewer?: string
  review_note?: string
  mail_sent?: boolean
  mail_template?: string
  approval_status?: string
  submitted_at?: string
  created_at?: string
  updated_at?: string
  is_protected?: boolean
  tasks?: TaskCompletion[]
  warning_count?: number
  [key: string]: unknown
}

interface ActivityItem {
  id: string
  action: string
  actor: string
  person_name: string | null
  person_email: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  entity_id: string
  created_at: string
  metadata: Record<string, unknown> | null
}

// ─── Stat Card ───

type StatAccent = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info'

const ACCENT_CLASSES: Record<StatAccent, { iconBg: string; iconText: string }> = {
  default:     { iconBg: 'bg-muted',           iconText: 'text-muted-foreground' },
  primary:     { iconBg: 'bg-primary/10',      iconText: 'text-primary' },
  success:     { iconBg: 'bg-success/15',      iconText: 'text-success' },
  warning:     { iconBg: 'bg-warning/15',      iconText: 'text-warning' },
  destructive: { iconBg: 'bg-destructive/15',  iconText: 'text-destructive' },
  info:        { iconBg: 'bg-info/15',         iconText: 'text-info' },
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'default',
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  hint?: string
  accent?: StatAccent
  href?: string
}) {
  const c = ACCENT_CLASSES[accent]
  const inner = (
    <div className="h-full bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.iconBg} ${c.iconText} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
      {hint && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{hint}</p>}
    </div>
  )
  if (href) {
    return (
      <Link href={href} className="block cursor-pointer">
        {inner}
      </Link>
    )
  }
  return inner
}

// ─── Avatar ───

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(p => p.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
      {initials}
    </div>
  )
}

// ─── Time format ───

function formatRelative(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'az önce'
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} gün önce`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

// ─── Activity helpers ───

const ACTION_LABELS: Record<string, string> = {
  status_change: 'Status değişti',
  mail_sent: 'Mail gönderildi',
  evaluation: 'Değerlendirildi',
  warning: 'Uyarı eklendi',
  task_completed: 'Görev tamamlandı',
  create: 'Yeni başvuru',
  update: 'Güncellendi',
  rollback: 'Geri alındı',
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  status_change: ArrowPathRoundedSquareIcon,
  mail_sent: EnvelopeIcon,
  evaluation: PencilSquareIcon,
  warning: ExclamationTriangleIcon,
  task_completed: CheckCircleIcon,
  create: UserPlusIcon,
  update: PencilSquareIcon,
  rollback: ArrowPathRoundedSquareIcon,
}

const ACTION_ACCENTS: Record<string, StatAccent> = {
  status_change: 'info',
  mail_sent: 'info',
  evaluation: 'primary',
  warning: 'destructive',
  task_completed: 'success',
  create: 'primary',
  update: 'default',
  rollback: 'warning',
}

function activitySummary(a: ActivityItem): string {
  if (a.action === 'status_change') {
    const from = a.old_values?.status as string | undefined
    const to = a.new_values?.status as string | undefined
    if (from && to) return `${from} → ${to}`
    if (to) return `→ ${to}`
  }
  if (a.action === 'mail_sent') {
    const tpl = a.new_values?.mail_template as string | undefined
    return tpl ? `şablon: ${tpl}` : 'mail gönderildi'
  }
  return ACTION_LABELS[a.action] || a.action
}

// ─── Status pie data ───

const STATUS_GROUPS = [
  { key: 'kontrol',     label: 'Kontrol',       color: 'hsl(var(--warning))' },
  { key: 'kesin_kabul', label: 'Kesin Kabul',   color: 'hsl(var(--success))' },
  { key: 'nihai_uye',   label: 'Nihai Üye',     color: 'hsl(var(--primary))' },
  { key: 'kesin_ret',   label: 'Kesin Ret',     color: 'hsl(var(--destructive))' },
  { key: 'basvuru',     label: 'Başvuru',       color: 'hsl(var(--info))' },
  { key: 'etkinlik',    label: 'Etkinlik',      color: 'hsl(187 85% 53%)' },
  { key: 'deaktive',    label: 'Deaktive',      color: 'hsl(var(--muted-foreground))' },
] as const

interface PieDatum { name: string; value: number; color: string }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-md text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="font-medium text-foreground">{item.name}</span>
        <span className="text-muted-foreground tabular-nums">{item.value}</span>
      </div>
    </div>
  )
}

// ─── Main page ───

export default function DashboardPage() {
  const [apps, setApps] = useState<AppItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null)

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/applications?with=tasks,warnings&sort=submitted_at&order=desc&limit=500')
      const j = await res.json()
      if (j.success) setApps(j.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/activity?page=1&limit=8')
      const j = await res.json()
      if (j.success) setActivities(j.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    fetchApps()
    fetchActivity()
  }, [])

  useRealtimeRefresh(['applications'], () => {
    fetchApps()
    fetchActivity()
  })

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const visible = apps.filter(a => !a.is_protected)

    let kontrol = 0, buAyKabul = 0, buAyRet = 0, aktifUye = 0, mailBekleyen = 0
    for (const a of visible) {
      if (a.status === 'kontrol') kontrol++
      if (a.status === 'nihai_uye') aktifUye++
      const updated = a.updated_at ? new Date(a.updated_at).getTime() : 0
      if (updated >= monthStart) {
        if (a.status === 'kesin_kabul' || a.status === 'nihai_uye' || a.status === 'nihai_olmayan') buAyKabul++
        if (a.status === 'kesin_ret' || a.status === 'yas_kucuk') buAyRet++
      }
      if ((a.status === 'kesin_kabul' || a.status === 'kesin_ret' || a.status === 'yas_kucuk') && !a.mail_sent) {
        mailBekleyen++
      }
    }
    return { total: visible.length, kontrol, buAyKabul, buAyRet, aktifUye, mailBekleyen }
  }, [apps])

  // Recent applications (son 8)
  const recent = useMemo(() => {
    return apps.filter(a => !a.is_protected).slice(0, 8)
  }, [apps])

  // Geçici üyeler (kesin_kabul / nihai_olmayan / etkinlik) — son 8, K+D durumu için
  const geciciUyeler = useMemo(() => {
    return apps
      .filter(a => !a.is_protected && ['kesin_kabul', 'nihai_olmayan', 'etkinlik'].includes(a.status))
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.submitted_at || 0).getTime()
        const tb = new Date(b.updated_at || b.submitted_at || 0).getTime()
        return tb - ta
      })
      .slice(0, 8)
  }, [apps])

  // Task map helper
  const taskMapOf = (app: AppItem) => {
    const m: Record<string, boolean> = {}
    for (const t of app.tasks || []) {
      if (t.completed) m[t.task_type] = true
    }
    return m
  }

  // Pie chart data
  const pieData = useMemo<PieDatum[]>(() => {
    const visible = apps.filter(a => !a.is_protected)
    const counts: Record<string, number> = {}
    for (const a of visible) {
      const key = a.status === 'nihai_olmayan' ? 'kesin_kabul' : (a.status === 'yas_kucuk' ? 'kesin_ret' : a.status)
      counts[key] = (counts[key] || 0) + 1
    }
    return STATUS_GROUPS
      .map(g => ({ name: g.label, value: counts[g.key] || 0, color: g.color }))
      .filter(d => d.value > 0)
  }, [apps])

  const totalForChart = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Divizyon Başvuru Yönetim Paneli</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stat Cards */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={UsersIcon} label="Toplam Başvuru" value={loading ? '—' : stats.total} accent="default" href="/uyeler" />
            <StatCard icon={ClockIcon} label="Kontrol Bekleyen" value={loading ? '—' : stats.kontrol} accent="warning" hint="manuel değerlendirme" href="/uyeler?tab=kontrol" />
            <StatCard icon={CheckCircleIcon} label="Bu Ay Onaylanan" value={loading ? '—' : stats.buAyKabul} accent="success" hint="kesin kabul + nihai üye" href="/uyeler?tab=gecici_uye" />
            <StatCard icon={XCircleIcon} label="Bu Ay Reddedilen" value={loading ? '—' : stats.buAyRet} accent="destructive" hint="kesin ret + 18 yaş" href="/uyeler?tab=kesin_ret" />
            <StatCard icon={SparklesIcon} label="Aktif Üye" value={loading ? '—' : stats.aktifUye} accent="primary" hint="nihai ağ üyesi" href="/uyeler?tab=nihai_uye" />
            <StatCard icon={EnvelopeIcon} label="Mail Bekleyen" value={loading ? '—' : stats.mailBekleyen} accent="info" hint="gönderim bekliyor" />
          </div>
        </section>

        {/* 3-column grid: Son Başvuranlar / Son Aktiviteler / Analiz */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Son Başvuranlar (sol — 5/12) */}
          <div className="lg:col-span-5 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Son Başvuranlar</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">En son 8 başvuru</p>
              </div>
              <Link
                href="/uyeler"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Tümü
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <LoadingState />
            ) : recent.length === 0 ? (
              <EmptyState title="Başvuru yok" />
            ) : (
              <ul className="divide-y divide-border flex-1">
                {recent.map(app => (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="w-full flex items-center gap-2.5 px-5 py-2.5 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                    >
                      <Avatar name={app.full_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{app.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{app.email}</p>
                      </div>
                      <StatusBadge status={app.status} size="sm" />
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-[58px] text-right">
                        {formatRelative(app.submitted_at || app.created_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Son Aktiviteler (orta — 4/12) */}
          <div className="lg:col-span-4 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Son Aktiviteler</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Son işlemler, status değişimleri</p>
              </div>
              <Link
                href="/aktivite"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Tümü
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            {activityLoading ? (
              <LoadingState />
            ) : activities.length === 0 ? (
              <EmptyState title="Aktivite yok" />
            ) : (
              <ul className="divide-y divide-border flex-1">
                {activities.map(a => {
                  const Icon = ACTION_ICONS[a.action] || ChatBubbleLeftRightIcon
                  const accent = ACTION_ACCENTS[a.action] || 'default'
                  const c = ACCENT_CLASSES[accent]
                  return (
                    <li key={a.id} className="px-5 py-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-lg ${c.iconBg} ${c.iconText} flex items-center justify-center shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">
                            <span className="font-medium">{a.actor || 'Sistem'}</span>
                            <span className="text-muted-foreground"> · {ACTION_LABELS[a.action] || a.action}</span>
                          </p>
                          {a.person_name && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {a.person_name}
                              {a.action === 'status_change' && (
                                <span className="ml-1 text-foreground/80">— {activitySummary(a)}</span>
                              )}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/80 mt-0.5">{formatRelative(a.created_at)}</p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Analiz (sağ — 3/12) */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Analiz</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Status dağılımı</p>
              </div>
              <Link
                href="/analiz"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Detay
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-3">
              {loading ? (
                <LoadingState size="sm" />
              ) : totalForChart === 0 ? (
                <EmptyState title="Veri yok" />
              ) : (
                <>
                  {/* Donut */}
                  <div className="relative h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={70}
                          paddingAngle={2}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        >
                          {pieData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-lg font-bold tabular-nums text-foreground leading-none">{totalForChart}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">toplam</p>
                    </div>
                  </div>

                  {/* Legend */}
                  <ul className="space-y-1">
                    {pieData.map(d => (
                      <li key={d.name} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                        <span className="text-foreground font-semibold tabular-nums">{d.value}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Geçici Üye Takibi — Karakteristik + Disipliner + Uyarı */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Geçici Üye Takibi</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Karakteristik + Disipliner Envanter durumu, uyarı sayısı
              </p>
            </div>
            <Link
              href="/uyeler?tab=gecici_uye"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              Tümü
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <LoadingState />
          ) : geciciUyeler.length === 0 ? (
            <EmptyState title="Geçici üye yok" description="Kabul edilmiş ya da etkinlikten gelen üye bulunmuyor." />
          ) : (
            <ul className="divide-y divide-border">
              {geciciUyeler.map(app => {
                const tasks = taskMapOf(app)
                const karakDone = !!tasks.karakteristik_envanter
                const disipDone = !!tasks.disipliner_envanter
                const wc = app.warning_count || 0
                const wcCritical = wc >= 2
                return (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                    >
                      <Avatar name={app.full_name} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{app.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{app.email}</p>
                      </div>

                      <div className="hidden sm:flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
                            karakDone ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                          )}
                          title={karakDone ? 'Karakteristik Envanter: tamamlandı' : 'Karakteristik Envanter: bekliyor'}
                        >
                          {karakDone ? <CheckCircleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                          Karakteristik
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
                            disipDone ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                          )}
                          title={disipDone ? 'Disipliner Envanter: tamamlandı' : 'Disipliner Envanter: bekliyor'}
                        >
                          {disipDone ? <CheckCircleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                          Disipliner
                        </span>
                        {wc > 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
                              wcCritical ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
                            )}
                            title={wcCritical ? `${wc} uyarı — kritik` : `${wc} uyarı`}
                          >
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            {wc}
                          </span>
                        )}
                      </div>

                      <StatusBadge status={app.status} size="sm" />

                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-[58px] text-right">
                        {formatRelative(app.updated_at || app.submitted_at)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Detail popup — status'e göre yönlendir */}
      {(() => {
        if (!selectedApp) return null
        const memberStatuses = ['kesin_kabul', 'nihai_olmayan', 'nihai_uye', 'etkinlik']
        const onClose = () => { setSelectedApp(null); fetchApps() }
        if (memberStatuses.includes(selectedApp.status)) {
          return <MemberDetailModal data={selectedApp} onClose={onClose} />
        }
        return <KontrolDetailModal data={selectedApp} onClose={onClose} />
      })()}
    </div>
  )
}
