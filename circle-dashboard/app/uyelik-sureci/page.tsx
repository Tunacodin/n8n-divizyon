'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import KontrolDetailModal from '@/components/kontrol/KontrolDetailModal'
import MemberDetailModal from '@/components/uyeler/MemberDetailModal'
import { cn } from '@/lib/utils'

// ─── Types ───

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
  mail_sent?: boolean
  mail_template?: string
  submitted_at?: string
  created_at?: string
  updated_at?: string
  is_protected?: boolean
  circle_id?: number | null
  protected_source?: string | null
  university?: string
  department?: string
  source?: string
  tasks?: TaskCompletion[]
  warning_count?: number
  tags?: string[]
  [key: string]: unknown
}

// ─── Üst sekmeler ───

type TopTab = 'gecici_uye' | 'nihai_uye'

const TOP_TABS: { key: TopTab; label: string; hint: string }[] = [
  { key: 'gecici_uye', label: 'Geçici Üyeler', hint: 'Circle topluluğundaki geçiş sürecindeki üyeler' },
  { key: 'nihai_uye',  label: 'Nihai Üyeler',  hint: 'Tüm süreçleri tamamlamış ağ üyeleri' },
]

// ─── Geçici üye alt sekmeleri ───

type GeciciSub = 'envanteristik' | 'oryantasyon' | 'basvuru_yok'

const GECICI_SUBS: { key: GeciciSub; label: string; hint: string }[] = [
  { key: 'envanteristik', label: 'Envanteristik Test', hint: 'Karakteristik veya disipliner envanter bekliyor' },
  { key: 'oryantasyon',   label: 'Oryantasyon',         hint: 'Envanterler tamam, oryantasyon kaldı' },
  { key: 'basvuru_yok',   label: 'Başvuru Yapmayanlar', hint: 'Circle üyesi ama başvuru sürecinden geçmedi' },
]

const TASK_LABELS: Record<string, string> = {
  karakteristik_envanter: 'Karakteristik',
  disipliner_envanter: 'Disipliner',
  oryantasyon: 'Oryantasyon',
}

function getTaskMap(a: AppItem): Record<string, boolean> {
  const m: Record<string, boolean> = {}
  for (const t of a.tasks || []) {
    if (t.completed) m[t.task_type] = true
  }
  return m
}

// Bir başvurunun hangi üst sekmeye ait olduğunu belirler.
// Sadece Circle üyeleri (is_protected veya circle_id var) bu sayfada görünür.
function classifyTopTab(a: AppItem): TopTab | null {
  if (a.status === 'nihai_uye') return 'nihai_uye'
  // Geçici üye olabilmek için Circle'da olmalı
  if (!a.circle_id && !a.is_protected) return null
  // Kontrol veya kesin ret aşamasındakileri gösterme
  if (a.status === 'kontrol' || a.status === 'kesin_ret' || a.status === 'yas_kucuk') return null
  return 'gecici_uye'
}

// Geçici üye içindeki alt sekme.
function classifyGeciciSub(a: AppItem): GeciciSub {
  // Önce: Başvuru süreci yok mu? (etkinlikten gelen veya circle_event olarak işaretli)
  const noBasvuru =
    a.status === 'etkinlik' || a.protected_source === 'circle_event'
  if (noBasvuru) return 'basvuru_yok'

  const tasks = getTaskMap(a)
  const karakteristik = !!tasks.karakteristik_envanter
  const disipliner = !!tasks.disipliner_envanter
  const oryantasyon = !!tasks.oryantasyon

  // Envanterler tamam ama oryantasyon kalmış
  if (karakteristik && disipliner && !oryantasyon) return 'oryantasyon'

  // Aksi halde envanteristik test bekliyor (en az biri eksik)
  return 'envanteristik'
}

function timestampOf(a: AppItem): number {
  return new Date(a.updated_at || a.submitted_at || a.created_at || 0).getTime()
}

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

function Avatar({ name }: { name: string }) {
  const initials = (name || '?')
    .split(' ')
    .map(p => p.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className="w-9 h-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
      {initials}
    </div>
  )
}

function Chip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted',
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
            active
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function TaskIndicator({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      title={`${label}: ${done ? 'Tamamlandı' : 'Bekliyor'}`}
      className={cn(
        'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
        done ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
      )}
    >
      {done ? <CheckCircleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
      {label}
    </span>
  )
}

function WarningBadge({ count }: { count: number }) {
  if (count <= 0) return null
  const critical = count >= 2
  return (
    <span
      className={cn(
        'hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
        critical ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning',
      )}
      title={critical ? `${count} uyarı — kritik` : `${count} uyarı`}
    >
      <ExclamationTriangleIcon className="w-3 h-3" />
      {count}
    </span>
  )
}

function TagBadges({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null
  const visible = tags.slice(0, 2)
  const extra = tags.length - visible.length
  return (
    <div className="hidden lg:flex items-center gap-1">
      {visible.map(t => (
        <span
          key={t}
          className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20"
          title={t}
        >
          {t.length > 18 ? t.slice(0, 16) + '…' : t}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] text-muted-foreground" title={tags.slice(2).join(', ')}>+{extra}</span>
      )}
    </div>
  )
}

const PER_PAGE = 20

function UyelikSureciContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const activeTab = (searchParams.get('tab') as TopTab) || 'gecici_uye'
  const activeSub = (searchParams.get('alt') as GeciciSub) || 'envanteristik'

  const [apps, setApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        '/api/applications?with=tasks,warnings&sort=updated_at&order=desc&limit=2000',
      )
      const j = await res.json()
      if (j.success) setApps(j.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useRealtimeRefresh(['applications', 'task_completions'], fetchData)

  useEffect(() => { setPage(1); setSearch('') }, [activeTab, activeSub])

  const setTab = (t: TopTab) =>
    router.replace(`/uyelik-sureci?tab=${t}`, { scroll: false })

  const setSub = (s: GeciciSub) =>
    router.replace(`/uyelik-sureci?tab=gecici_uye&alt=${s}`, { scroll: false })

  // Manuel Circle senkronizasyonu
  const handleCircleSync = useCallback(async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/circle-sync', { method: 'POST' })
      const j = await res.json()
      if (j.success) {
        setSyncMessage(
          `Senkronizasyon tamam — ${j.total_circle_members} Circle üyesi okundu, ${j.matched_existing} başvuru eşleştirildi, ${j.inserted_event} yeni Circle üyesi eklendi.`,
        )
        await fetchData()
      } else {
        setSyncMessage(`Hata: ${j.error || 'Bilinmeyen hata'}`)
      }
    } catch (e) {
      setSyncMessage(`Hata: ${(e as Error).message}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(null), 6000)
    }
  }, [fetchData])

  // Üst sekmeye göre filtre
  const byTopTab = useMemo(() => {
    return apps.filter(a => classifyTopTab(a) === activeTab)
  }, [apps, activeTab])

  // Geçici üyede alt sekme filtresi
  const filtered = useMemo(() => {
    let items = byTopTab
    if (activeTab === 'gecici_uye') {
      items = items.filter(a => classifyGeciciSub(a) === activeSub)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      items = items.filter(
        a =>
          (a.full_name || '').toLowerCase().includes(q) ||
          (a.email || '').toLowerCase().includes(q) ||
          (a.phone || '').toLowerCase().includes(q),
      )
    }
    return items.sort((a, b) => timestampOf(b) - timestampOf(a))
  }, [byTopTab, activeTab, activeSub, search])

  // Üst sekme sayıları
  const tabCounts = useMemo(() => {
    const c: Record<TopTab, number> = { gecici_uye: 0, nihai_uye: 0 }
    for (const a of apps) {
      const t = classifyTopTab(a)
      if (t) c[t]++
    }
    return c
  }, [apps])

  // Geçici üye alt sekme sayıları
  const subCounts = useMemo(() => {
    const c: Record<GeciciSub, number> = {
      envanteristik: 0,
      oryantasyon: 0,
      basvuru_yok: 0,
    }
    if (activeTab !== 'gecici_uye') return c
    for (const a of byTopTab) {
      c[classifyGeciciSub(a)]++
    }
    return c
  }, [byTopTab, activeTab])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const paged = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
          {/* Title + actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-foreground">Üyelik Süreci</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {TOP_TABS.find(t => t.key === activeTab)?.hint}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCircleSync}
                disabled={syncing}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer',
                  syncing
                    ? 'border-border bg-muted text-muted-foreground'
                    : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15',
                )}
                title="Circle.so üyelerini Supabase ile senkronize et"
              >
                <CloudArrowDownIcon className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
                {syncing ? 'Senkronize ediliyor...' : 'Circle Senkronize Et'}
              </button>

              <button
                type="button"
                onClick={() => fetchData()}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <ArrowPathIcon className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                Yenile
              </button>
            </div>
          </div>

          {syncMessage && (
            <div className="text-xs px-3 py-2 rounded-lg bg-muted text-foreground border border-border">
              {syncMessage}
            </div>
          )}

          {/* Üst sekmeler */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
            {TOP_TABS.map(t => {
              const active = activeTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-bold',
                      active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {tabCounts[t.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search + alt sekmeler */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Ad, e-posta, telefon ara..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-ring focus:border-primary outline-none transition-colors"
              />
            </div>

            {activeTab === 'gecici_uye' && (
              <div className="flex flex-wrap gap-1.5">
                {GECICI_SUBS.map(s => (
                  <Chip
                    key={s.key}
                    active={activeSub === s.key}
                    onClick={() => setSub(s.key)}
                    count={subCounts[s.key]}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {loading ? 'Yükleniyor...' : (
                <>
                  <span className="font-semibold text-foreground">{filtered.length}</span>
                  {' kayıt'}
                  {activeTab === 'gecici_uye' && (
                    <span className="ml-1.5 text-muted-foreground">
                      · {GECICI_SUBS.find(s => s.key === activeSub)?.hint}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {loading ? (
            <LoadingState label="Üyeler yükleniyor..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Eşleşen kayıt yok"
              description={
                activeTab === 'nihai_uye'
                  ? 'Henüz nihai üye yok.'
                  : activeSub === 'envanteristik'
                  ? 'Envanter bekleyen kişi yok.'
                  : activeSub === 'oryantasyon'
                  ? 'Oryantasyon bekleyen kişi yok.'
                  : 'Circle\'da olup başvurusu olmayan kişi yok.'
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {paged.map(app => {
                  const tasks = getTaskMap(app)
                  const isGecici = activeTab === 'gecici_uye'
                  const isNihai = activeTab === 'nihai_uye'

                  return (
                    <li key={app.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                      >
                        <Avatar name={app.full_name} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground truncate">{app.full_name}</p>
                            {app.is_protected && (
                              <span
                                className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold shrink-0"
                                title="Korumalı (Circle üyesi)"
                              >
                                Circle
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {app.email}
                            {(app.university || app.department) && (
                              <span className="ml-1.5">· {[app.university, app.department].filter(Boolean).join(' · ')}</span>
                            )}
                          </p>
                        </div>

                        {/* Geçici üye — alt sekmeye göre rozetler */}
                        {isGecici && activeSub === 'envanteristik' && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <TaskIndicator label={TASK_LABELS.karakteristik_envanter} done={!!tasks.karakteristik_envanter} />
                            <TaskIndicator label={TASK_LABELS.disipliner_envanter} done={!!tasks.disipliner_envanter} />
                            <WarningBadge count={app.warning_count || 0} />
                          </div>
                        )}

                        {isGecici && activeSub === 'oryantasyon' && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <TaskIndicator label="Envanterler" done />
                            <TaskIndicator label={TASK_LABELS.oryantasyon} done={!!tasks.oryantasyon} />
                            <WarningBadge count={app.warning_count || 0} />
                          </div>
                        )}

                        {isGecici && activeSub === 'basvuru_yok' && (
                          <span
                            className="hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info font-medium"
                            title="Circle üyesi ama başvuru süreci yok"
                          >
                            Ağda · Başvurusu yok
                          </span>
                        )}

                        {/* Nihai üye — tüm görev rozetleri + tag'lar */}
                        {isNihai && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <TagBadges tags={app.tags} />
                            <TaskIndicator label={TASK_LABELS.karakteristik_envanter} done={!!tasks.karakteristik_envanter} />
                            <TaskIndicator label={TASK_LABELS.disipliner_envanter} done={!!tasks.disipliner_envanter} />
                            <TaskIndicator label={TASK_LABELS.oryantasyon} done={!!tasks.oryantasyon} />
                            <WarningBadge count={app.warning_count || 0} />
                          </div>
                        )}

                        <StatusBadge status={app.status} size="sm" />

                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-[64px] text-right">
                          {formatRelative(app.updated_at || app.submitted_at)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                perPage={PER_PAGE}
                onChange={setPage}
              />
            </>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {(() => {
        if (!selectedApp) return null
        const memberStatuses = ['kesin_kabul', 'nihai_olmayan', 'nihai_uye', 'etkinlik']
        const onClose = () => { setSelectedApp(null); fetchData() }
        if (memberStatuses.includes(selectedApp.status)) {
          return <MemberDetailModal data={selectedApp} onClose={onClose} />
        }
        return <KontrolDetailModal data={selectedApp} onClose={onClose} />
      })()}
    </div>
  )
}

export default function UyelikSureciPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UyelikSureciContent />
    </Suspense>
  )
}
