'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import KontrolDetailModal from '@/components/kontrol/KontrolDetailModal'
import MemberDetailModal from '@/components/uyeler/MemberDetailModal'
import { cn } from '@/lib/utils'

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
  circle_id?: number | null
  university?: string
  department?: string
  main_role?: string
  source?: string
  tasks?: TaskCompletion[]
  warning_count?: number
  tags?: string[]
  [key: string]: unknown
}

// ─── Top tabs ───

type TopTab = 'kontrol' | 'kesin_ret' | 'henuz_aga_girmeyen'

const TOP_TABS: { key: TopTab; label: string; hint: string }[] = [
  { key: 'kontrol',            label: 'Kontrol Bekleyen',     hint: 'Manuel değerlendirme bekleyen başvurular' },
  { key: 'kesin_ret',          label: 'Kesin Ret',            hint: 'Reddedilen başvurular' },
  { key: 'henuz_aga_girmeyen', label: 'Henüz Ağa Girmeyenler', hint: 'Kesin kabul aldı ama Circle topluluğuna katılmadı' },
]

// ─── Kontrol alt filtreleri ───

type KontrolFilter = 'tumu' | 'bugun' | 'dun' | 'bu_hafta' | 'atanmamis'

const KONTROL_FILTERS: { key: KontrolFilter; label: string }[] = [
  { key: 'tumu',       label: 'Tümü' },
  { key: 'bugun',      label: 'Bugün' },
  { key: 'dun',        label: 'Dün' },
  { key: 'bu_hafta',   label: 'Bu Hafta' },
  { key: 'atanmamis',  label: 'Atanmamış' },
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function classifyKontrol(a: AppItem, filter: KontrolFilter): boolean {
  if (filter === 'tumu') return true
  if (filter === 'atanmamis') return !a.reviewer || !a.reviewer.trim()
  const ts = new Date(a.submitted_at || a.created_at || 0).getTime()
  const today = startOfDay(new Date())
  const yesterday = today - 86400000
  const week = today - 6 * 86400000
  if (filter === 'bugun') return ts >= today
  if (filter === 'dun') return ts >= yesterday && ts < today
  if (filter === 'bu_hafta') return ts >= week
  return true
}

// ─── Ret kategorileri ───

type RetCat = 'tumu' | 'yas_kucuk' | 'topluluk' | 'manuel' | 'otomasyon'

const RET_CATS: { key: RetCat; label: string }[] = [
  { key: 'tumu',      label: 'Tümü' },
  { key: 'yas_kucuk', label: '18 Yaş Altı' },
  { key: 'topluluk',  label: 'Topluluk İlkeleri' },
  { key: 'manuel',    label: 'Manuel Ret' },
  { key: 'otomasyon', label: 'Otomasyon' },
]

function classifyRet(a: AppItem): RetCat {
  if (a.status === 'yas_kucuk') return 'yas_kucuk'
  const note = (a.review_note || '').toLowerCase()
  const reviewer = (a.reviewer || '').trim()
  if (note.includes('topluluk') && note.includes('ilke')) return 'topluluk'
  if (reviewer === 'Otomasyon' || reviewer === 'otomasyon' || reviewer.toLowerCase().includes('otomasyon')) return 'otomasyon'
  if (reviewer) return 'manuel'
  return 'manuel'
}

// ─── Helpers ───

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

// ─── Avatar ───

function Avatar({ name }: { name: string }) {
  const initials = name
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

// ─── Chip ───

function Chip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
          active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Main Page ───

const PER_PAGE = 20

function BasvuruYonetimiContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const activeTab = ((searchParams.get('tab') as TopTab) || 'kontrol')
  const activeRetCat = ((searchParams.get('kategori') as RetCat) || 'tumu')
  const activeKontrolFilter = ((searchParams.get('zaman') as KontrolFilter) || 'tumu')

  const [apps, setApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/applications?with=tasks,warnings&sort=updated_at&order=desc&limit=2000')
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

  useEffect(() => { setPage(1); setSearch('') }, [activeTab, activeRetCat, activeKontrolFilter])

  const setTab = (t: TopTab) => router.replace(`/uyeler?tab=${t}`, { scroll: false })
  const setRetCat = (c: RetCat) => router.replace(`/uyeler?tab=kesin_ret&kategori=${c}`, { scroll: false })
  const setKontrolFilter = (f: KontrolFilter) => router.replace(`/uyeler?tab=kontrol&zaman=${f}`, { scroll: false })

  // Pre-filter: top tab'a göre temel filtre
  const byTab = useMemo(() => {
    return apps.filter(a => {
      if (activeTab === 'kontrol')   return a.status === 'kontrol'
      if (activeTab === 'kesin_ret') return a.status === 'kesin_ret' || a.status === 'yas_kucuk'
      if (activeTab === 'henuz_aga_girmeyen') return a.status === 'kesin_kabul' && !a.circle_id
      return false
    })
  }, [apps, activeTab])

  // Tab içinde alt filtre
  const filtered = useMemo(() => {
    let items = byTab

    if (activeTab === 'kesin_ret' && activeRetCat !== 'tumu') {
      items = items.filter(a => classifyRet(a) === activeRetCat)
    }

    if (activeTab === 'kontrol' && activeKontrolFilter !== 'tumu') {
      items = items.filter(a => classifyKontrol(a, activeKontrolFilter))
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      items = items.filter(a =>
        (a.full_name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q)
      )
    }

    return items.sort((a, b) => timestampOf(b) - timestampOf(a))
  }, [byTab, activeTab, activeRetCat, activeKontrolFilter, search])

  // Tab sayıları
  const tabCounts = useMemo(() => {
    let kontrol = 0, kesinRet = 0, henuz = 0
    for (const a of apps) {
      if (a.status === 'kontrol') kontrol++
      else if (a.status === 'kesin_ret' || a.status === 'yas_kucuk') kesinRet++
      if (a.status === 'kesin_kabul' && !a.circle_id) henuz++
    }
    return { kontrol, kesin_ret: kesinRet, henuz_aga_girmeyen: henuz }
  }, [apps])

  // Kontrol alt filtre sayıları
  const kontrolCounts = useMemo(() => {
    const c: Record<KontrolFilter, number> = { tumu: byTab.length, bugun: 0, dun: 0, bu_hafta: 0, atanmamis: 0 }
    if (activeTab !== 'kontrol') return c
    for (const a of byTab) {
      if (classifyKontrol(a, 'bugun')) c.bugun++
      if (classifyKontrol(a, 'dun')) c.dun++
      if (classifyKontrol(a, 'bu_hafta')) c.bu_hafta++
      if (classifyKontrol(a, 'atanmamis')) c.atanmamis++
    }
    return c
  }, [byTab, activeTab])

  // Alt kategori sayıları (Kesin Ret tab'ı için)
  const retCatCounts = useMemo(() => {
    const c: Record<RetCat, number> = { tumu: byTab.length, yas_kucuk: 0, topluluk: 0, manuel: 0, otomasyon: 0 }
    if (activeTab !== 'kesin_ret') return c
    for (const a of byTab) {
      const cat = classifyRet(a)
      c[cat]++
    }
    return c
  }, [byTab, activeTab])

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
          {/* Title + refresh */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Başvuru Yönetimi</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {TOP_TABS.find(t => t.key === activeTab)?.hint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchData()}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              aria-label="Yenile"
            >
              <ArrowPathIcon className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Yenile
            </button>
          </div>

          {/* Top tabs */}
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
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t.label}
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-bold',
                    active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                  )}>
                    {tabCounts[t.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Sub-filter row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
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

            {/* Time chips for kontrol */}
            {activeTab === 'kontrol' && (
              <div className="flex flex-wrap gap-1.5">
                {KONTROL_FILTERS.map(f => (
                  <Chip
                    key={f.key}
                    active={activeKontrolFilter === f.key}
                    onClick={() => setKontrolFilter(f.key)}
                    count={kontrolCounts[f.key]}
                  >
                    {f.label}
                  </Chip>
                ))}
              </div>
            )}

            {/* Sub-category chips for kesin_ret */}
            {activeTab === 'kesin_ret' && (
              <div className="flex flex-wrap gap-1.5">
                {RET_CATS.map(c => (
                  <Chip
                    key={c.key}
                    active={activeRetCat === c.key}
                    onClick={() => setRetCat(c.key)}
                    count={retCatCounts[c.key]}
                  >
                    {c.label}
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
                </>
              )}
            </p>
          </div>

          {loading ? (
            <LoadingState label="Üyeler yükleniyor..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Eşleşen kayıt yok"
              description="Bu filtre kombinasyonunda kullanıcı bulunmuyor."
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {paged.map(app => {
                  const isKontrol = activeTab === 'kontrol'
                  const isHenuz = activeTab === 'henuz_aga_girmeyen'
                  const isRet = activeTab === 'kesin_ret'
                  const reviewerAssigned = !!(app.reviewer && app.reviewer.trim())

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
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
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

                        {/* Tab-specific badges */}
                        {isKontrol && (
                          <>
                            <span
                              className={cn(
                                'hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
                                reviewerAssigned
                                  ? 'bg-info/15 text-info'
                                  : 'bg-warning/15 text-warning'
                              )}
                              title={reviewerAssigned ? `Değerlendiren: ${app.reviewer}` : 'Henüz atanmamış'}
                            >
                              {reviewerAssigned ? app.reviewer : 'Atanmamış'}
                            </span>
                            {app.approval_status && (
                              <span
                                className={cn(
                                  'hidden sm:inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium',
                                  app.approval_status.toLowerCase().includes('kabul')
                                    ? 'bg-success/15 text-success'
                                    : app.approval_status.toLowerCase().includes('ret')
                                    ? 'bg-destructive/15 text-destructive'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {app.approval_status}
                              </span>
                            )}
                          </>
                        )}

                        {isRet && (
                          <>
                            {/* Ret sebebi label */}
                            <span className="hidden md:inline text-[11px] text-muted-foreground truncate max-w-[140px]">
                              {RET_CATS.find(c => c.key === classifyRet(app))?.label}
                            </span>
                            {/* Mail durumu */}
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
                                app.mail_sent
                                  ? 'bg-success/15 text-success'
                                  : 'bg-warning/15 text-warning'
                              )}
                              title={app.mail_sent ? 'Mail gönderildi' : 'Mail bekliyor'}
                            >
                              <EnvelopeIcon className="w-3 h-3" />
                              {app.mail_sent ? 'Atıldı' : 'Bekliyor'}
                            </span>
                          </>
                        )}

                        {isHenuz && (
                          <span
                            className={cn(
                              'hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium',
                              app.mail_sent
                                ? 'bg-success/15 text-success'
                                : 'bg-warning/15 text-warning',
                            )}
                            title={app.mail_sent ? 'Davet maili gönderildi' : 'Davet maili bekliyor'}
                          >
                            <EnvelopeIcon className="w-3 h-3" />
                            {app.mail_sent ? 'Davet gönderildi' : 'Davet bekliyor'}
                          </span>
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

      {/* Detail popup — status'e göre yönlendir */}
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

export default function BasvuruYonetimiPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BasvuruYonetimiContent />
    </Suspense>
  )
}
