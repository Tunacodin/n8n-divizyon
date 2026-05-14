'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { useSearchParams, useRouter } from 'next/navigation'
import { TabBar, type Tab } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import KesinRetContent from '@/components/basvurular/KesinRetContent'

interface AppItem {
  id: string
  full_name: string
  email: string
  phone?: string
  status: string
  birth_date?: string
  gender?: string
  reviewer?: string
  review_note?: string
  mail_sent?: boolean
  mail_template?: string
  professional_status?: string
  university?: string
  department?: string
  main_role?: string
  created_at?: string
  submitted_at?: string
  updated_at?: string
  warning_count?: number
  [key: string]: any
}

const STATUS_TABS: Tab[] = [
  { key: 'basvuru', label: 'Başvuru Yapanlar', dotColor: 'bg-blue-400' },
  { key: 'kontrol', label: 'Kontrol', dotColor: 'bg-yellow-400' },
  { key: 'kesin_ret', label: 'Kesin Ret', dotColor: 'bg-red-400' },
  { key: 'kesin_kabul', label: 'Kesin Kabul', dotColor: 'bg-emerald-400' },
  { key: 'nihai_uye', label: 'Nihai Ağ Üyesi', dotColor: 'bg-amber-400' },
  { key: 'etkinlik', label: 'Etkinlikten Gelenler', dotColor: 'bg-cyan-400' },
  { key: 'deaktive', label: 'Deaktive', dotColor: 'bg-gray-400' },
]

const STATUS_LABELS: Record<string, string> = {
  basvuru: 'Başvuru',
  kontrol: 'Kontrol',
  kesin_ret: 'Kesin Ret',
  kesin_kabul: 'Kesin Kabul',
  nihai_olmayan: 'Kesin Kabul',
  nihai_uye: 'Nihai Ağ Üyesi',
  etkinlik: 'Etkinlik',
  deaktive: 'Deaktive',
  yas_kucuk: '18 Yaş Altı',
}

const STATUS_BADGE: Record<string, string> = {
  basvuru: 'bg-info/15 text-info border-info/30',
  kontrol: 'bg-warning/15 text-warning border-warning/30',
  kesin_ret: 'bg-destructive/15 text-destructive border-destructive/30',
  kesin_kabul: 'bg-success/15 text-success border-success/30',
  nihai_olmayan: 'bg-success/15 text-success border-success/30',
  nihai_uye: 'bg-warning/15 text-warning dark:text-warning border-amber-500/30',
  etkinlik: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/60/30',
  deaktive: 'bg-muted text-muted-foreground border-border',
  yas_kucuk: 'bg-orange-500/15 text-orange-600 dark:text-orange-500 dark:text-orange-400 dark:text-orange-500 dark:text-orange-400 border-orange-500/60/30',
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' }
}

const PER_PAGE = 20

function FlowContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'basvuru'
  const [allApps, setAllApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [taskMap, setTaskMap] = useState<Record<string, Record<string, boolean>>>({})
  const [warningMap, setWarningMap] = useState<Record<string, number>>({})

  const fetchAll = useCallback(async () => {
    try {
      // Toplu fetch — tasks+warnings include edilmiş
      const res = await fetch('/api/applications?sort=created_at&order=desc&limit=2000&with=tasks,warnings').then(r => r.json())
      if (!res.success) return
      setAllApps(res.data || [])
      const tMap: Record<string, Record<string, boolean>> = {}
      const wMap: Record<string, number> = {}
      for (const app of (res.data || []) as any[]) {
        if (!['kesin_kabul', 'nihai_uye'].includes(app.status || '')) continue
        tMap[app.id] = {}
        for (const t of (app.tasks || [])) {
          if (t.completed) tMap[app.id][t.task_type] = true
        }
        wMap[app.id] = (app.warnings || []).length
      }
      setTaskMap(tMap)
      setWarningMap(wMap)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useRealtimeRefresh(['applications', 'task_completions', 'warnings'], fetchAll)

  // Tab sayılarını hesapla
  const tabsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const app of allApps) {
      const s = app.status || 'basvuru'
      counts[s] = (counts[s] || 0) + 1
    }
    // yas_kucuk'u kesin_ret'e ekle
    if (counts['yas_kucuk']) {
      counts['kesin_ret'] = (counts['kesin_ret'] || 0) + (counts['yas_kucuk'] || 0)
    }
    // nihai_olmayan'ı kesin_kabul'e ekle (birleştirildi)
    if (counts['nihai_olmayan']) {
      counts['kesin_kabul'] = (counts['kesin_kabul'] || 0) + (counts['nihai_olmayan'] || 0)
    }
    return STATUS_TABS.map(t => ({ ...t, count: counts[t.key] || 0 }))
  }, [allApps])

  // Aktif tab'a göre filtrele
  const filtered = useMemo(() => {
    let items = allApps.filter(a => {
      if (activeTab === 'kesin_ret') return a.status === 'kesin_ret' || a.status === 'yas_kucuk'
      if (activeTab === 'kesin_kabul') return a.status === 'kesin_kabul' || a.status === 'nihai_olmayan'
      return a.status === activeTab
    })

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(a =>
        (a.full_name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.phone || '').includes(q)
      )
    }

    return items
  }, [allApps, activeTab, search])

  // Aynı email ile birden fazla başvuru
  const emailCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of allApps) {
      const e = (a.email || '').toLowerCase().trim()
      if (!e) continue
      m.set(e, (m.get(e) || 0) + 1)
    }
    return m
  }, [allApps])

  // İşlem yapılmış statüler (kesin_kabul, kesin_ret vb.) için updated_at kullan
  // Henüz işlem yapılmamış statüler (kontrol, basvuru) için submitted_at kullan
  const actionStatuses = useMemo(() => new Set(['kesin_kabul', 'kesin_ret', 'nihai_olmayan', 'nihai_uye', 'deaktive']), [])

  // Belirli bir başvuru için sıralama/gruplama tarihini seç.
  // Circle'dan gelen korumalı üyelerin updated_at'i batch sync zamanı — kullanılmamalı.
  // Onlar için Circle'a kabul tarihi (accepted_invitation_at) veya son aktivite kullanılır.
  const pickDate = (app: AppItem): string => {
    const p = app as any
    if (p.is_protected) {
      return p.accepted_invitation_at || p.last_seen_at || app.updated_at || app.created_at || ''
    }
    return actionStatuses.has(app.status)
      ? (app.updated_at || app.created_at || '')
      : (app.submitted_at || app.created_at || '')
  }

  // Gün bazlı gruplama
  const groupedByDate = useMemo(() => {

    const map = new Map<string, AppItem[]>()
    for (const app of filtered) {
      const dt = pickDate(app)
      const dateKey = dt ? dt.slice(0, 10) : 'tarihsiz'
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(app)
    }
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const groups: { date: string; label: string; apps: AppItem[] }[] = []
    for (const [dateKey, apps] of Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
      let label = dateKey
      if (dateKey === today) label = 'Bugün'
      else if (dateKey === yesterday) label = 'Dün'
      else if (dateKey !== 'tarihsiz') {
        const d = new Date(dateKey)
        label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
      }
      apps.sort((a, b) => pickDate(b).localeCompare(pickDate(a)))
      groups.push({ date: dateKey, label, apps })
    }
    return groups
  }, [filtered, actionStatuses])

  // Pagination
  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE))
  const startIdx = (page - 1) * PER_PAGE
  let itemCount = 0

  useEffect(() => { setPage(1); setSearch('') }, [activeTab])

  const handleTabChange = (key: string) => {
    router.replace(`/basvurular?tab=${key}`, { scroll: false })
  }

  const showTaskCols = ['kesin_kabul', 'nihai_uye'].includes(activeTab)

  const TaskIcon = ({ done }: { done: boolean }) => done
    ? <span className="text-success text-xs">✓</span>
    : <span className="text-muted-foreground/60 text-xs">○</span>

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-card border-b border-border px-8 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">Flow</h1>
        <div className="overflow-x-auto">
          <TabBar tabs={tabsWithCounts} activeTab={activeTab} onChange={handleTabChange} />
        </div>
      </div>

      {activeTab === 'kesin_ret' ? (
        <KesinRetContent />
      ) : (
      <div className="p-6">
        {/* Search + info */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Ad, e-posta veya telefon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-ring outline-none min-w-[260px]"
          />
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} kayıt</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            Bu statüde kayıt yok
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ad Soyad</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-Posta</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefon</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Değerlendiren</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Not</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarih</th>
                    {activeTab === 'kesin_ret' && (
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mail</th>
                    )}
                    {showTaskCols && (
                      <>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">Kar.Env</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">Dis.Env</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">Oryant.</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">Uyarı</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {groupedByDate.map(group => {
                    // Pagination kontrolü
                    const groupStart = itemCount
                    const groupEnd = groupStart + group.apps.length
                    const showGroup = groupEnd > startIdx && groupStart < startIdx + PER_PAGE
                    itemCount += group.apps.length
                    if (!showGroup) return null

                    const visibleApps = group.apps.filter((_, i) => {
                      const globalIdx = groupStart + i
                      return globalIdx >= startIdx && globalIdx < startIdx + PER_PAGE
                    })

                    return (
                      <tr key={group.date}>
                        <td colSpan={activeTab === 'kesin_ret' ? 8 : showTaskCols ? 11 : 7} className="p-0">
                          <div className="sticky top-0 z-10 bg-muted/50 px-4 py-1.5 border-b border-border">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">({group.apps.length})</span>
                          </div>
                          <table className="w-full">
                            <tbody>
                              {visibleApps.map(app => {
                                const timeSource = actionStatuses.has(app.status)
                                  ? (app.updated_at || app.created_at || '')
                                  : (app.submitted_at || app.created_at || '')
                                const time = timeSource.slice(11, 16)
                                const statusKey = app.status || 'basvuru'
                                return (
                                  <tr key={app.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-2.5 font-medium text-foreground w-[200px]">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate">{app.full_name || '—'}</span>
                                        {(app as { is_protected?: boolean }).is_protected && (
                                          <span
                                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold shrink-0"
                                            title="Korumalı (Circle üyesi)"
                                          >
                                            <svg className="w-2.5 h-2.5 inline-block" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                          </span>
                                        )}
                                        {(() => {
                                          const dup = emailCounts.get((app.email || '').toLowerCase().trim()) || 1
                                          return dup > 1 ? (
                                            <span
                                              className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning dark:text-warning font-semibold shrink-0"
                                              title={`Bu e-posta ile ${dup} başvuru var`}
                                            >
                                              {dup}×
                                            </span>
                                          ) : null
                                        })()}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs w-[220px]">{app.email || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs w-[130px]">{app.phone || '—'}</td>
                                    <td className="px-4 py-2.5 w-[120px]">
                                      <Badge className={STATUS_BADGE[statusKey] || 'bg-muted text-muted-foreground'}>
                                        {STATUS_LABELS[statusKey] || statusKey}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs w-[100px]">{app.reviewer || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{app.review_note || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs w-[80px]">{time || '—'}</td>
                                    {activeTab === 'kesin_ret' && (
                                      <td className="px-4 py-2.5 w-[80px]">
                                        {app.mail_sent ? (
                                          <Badge className="bg-success/15 text-success border-success/30 text-[10px]">Gönderildi</Badge>
                                        ) : (
                                          <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">Bekliyor</Badge>
                                        )}
                                      </td>
                                    )}
                                    {showTaskCols && (() => {
                                      const tasks = taskMap[app.id] || {}
                                      const wCount = warningMap[app.id] || 0
                                      return (
                                        <>
                                          <td className="px-3 py-2.5 text-center"><TaskIcon done={!!tasks['karakteristik_envanter']} /></td>
                                          <td className="px-3 py-2.5 text-center"><TaskIcon done={!!tasks['disipliner_envanter']} /></td>
                                          <td className="px-3 py-2.5 text-center"><TaskIcon done={!!tasks['oryantasyon']} /></td>
                                          <td className="px-3 py-2.5 text-center">
                                            {wCount > 0 ? (
                                              <Badge className={wCount >= 2 ? 'bg-destructive/15 text-destructive border-destructive/30 text-[10px]' : 'bg-warning/15 text-warning border-warning/30 text-[10px]'}>{wCount}</Badge>
                                            ) : (
                                              <span className="text-muted-foreground/60 text-xs">0</span>
                                            )}
                                          </td>
                                        </>
                                      )
                                    })()}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  {totalItems} kayıttan {startIdx + 1}–{Math.min(startIdx + PER_PAGE, totalItems)} arası
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-muted/50 disabled:opacity-50">Önceki</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-muted/50 disabled:opacity-50">Sonraki</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}

export default function FlowPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <FlowContent />
    </Suspense>
  )
}
