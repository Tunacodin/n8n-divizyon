'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TabBar, type Tab } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

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
  warning_count?: number
  [key: string]: any
}

const STATUS_TABS: Tab[] = [
  { key: 'basvuru', label: 'Başvuru Yapanlar', dotColor: 'bg-blue-400' },
  { key: 'kontrol', label: 'Kontrol', dotColor: 'bg-yellow-400' },
  { key: 'kesin_ret', label: 'Kesin Ret', dotColor: 'bg-red-400' },
  { key: 'kesin_kabul', label: 'Kesin Kabul', dotColor: 'bg-emerald-400' },
  { key: 'nihai_olmayan', label: 'Nihai Olmayan', dotColor: 'bg-purple-400' },
  { key: 'nihai_uye', label: 'Nihai Ağ Üyesi', dotColor: 'bg-amber-400' },
  { key: 'etkinlik', label: 'Etkinlikten Gelenler', dotColor: 'bg-cyan-400' },
  { key: 'deaktive', label: 'Deaktive', dotColor: 'bg-gray-400' },
]

const STATUS_LABELS: Record<string, string> = {
  basvuru: 'Başvuru',
  kontrol: 'Kontrol',
  kesin_ret: 'Kesin Ret',
  kesin_kabul: 'Kesin Kabul',
  nihai_olmayan: 'Nihai Olmayan',
  nihai_uye: 'Nihai Ağ Üyesi',
  etkinlik: 'Etkinlik',
  deaktive: 'Deaktive',
  yas_kucuk: '18 Yaş Altı',
}

const STATUS_BADGE: Record<string, string> = {
  basvuru: 'bg-blue-50 text-blue-700 border-blue-200',
  kontrol: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  kesin_ret: 'bg-red-50 text-red-700 border-red-200',
  kesin_kabul: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  nihai_olmayan: 'bg-purple-50 text-purple-700 border-purple-200',
  nihai_uye: 'bg-amber-50 text-amber-700 border-amber-200',
  etkinlik: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  deaktive: 'bg-gray-100 text-gray-600 border-gray-200',
  yas_kucuk: 'bg-orange-50 text-orange-700 border-orange-200',
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

  useEffect(() => {
    fetch('/api/applications?sort=created_at&order=desc&limit=2000')
      .then(r => r.json())
      .then(async (res) => {
        if (!res.success) return
        setAllApps(res.data || [])
        // Kesin kabul + nihai olmayan için task/warning bilgilerini çek
        const relevant = (res.data || []).filter((a: AppItem) =>
          ['kesin_kabul', 'nihai_olmayan', 'nihai_uye'].includes(a.status || '')
        )
        if (relevant.length > 0) {
          const tMap: Record<string, Record<string, boolean>> = {}
          const wMap: Record<string, number> = {}
          await Promise.all(
            relevant.map(async (app: AppItem) => {
              try {
                const r2 = await fetch(`/api/applications/${app.id}`)
                const detail = await r2.json()
                if (detail.success) {
                  tMap[app.id] = {}
                  for (const t of detail.data.tasks || []) {
                    if (t.completed) tMap[app.id][t.task_type] = true
                  }
                  wMap[app.id] = (detail.data.warnings || []).length
                }
              } catch { /* ignore */ }
            })
          )
          setTaskMap(tMap)
          setWarningMap(wMap)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
    return STATUS_TABS.map(t => ({ ...t, count: counts[t.key] || 0 }))
  }, [allApps])

  // Aktif tab'a göre filtrele
  const filtered = useMemo(() => {
    let items = allApps.filter(a => {
      if (activeTab === 'kesin_ret') return a.status === 'kesin_ret' || a.status === 'yas_kucuk'
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

  // Gün bazlı gruplama
  const groupedByDate = useMemo(() => {
    const map = new Map<string, AppItem[]>()
    for (const app of filtered) {
      const dt = app.submitted_at || app.created_at || ''
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
      apps.sort((a, b) => (b.submitted_at || b.created_at || '').localeCompare(a.submitted_at || a.created_at || ''))
      groups.push({ date: dateKey, label, apps })
    }
    return groups
  }, [filtered])

  // Pagination
  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE))
  const startIdx = (page - 1) * PER_PAGE
  let itemCount = 0

  useEffect(() => { setPage(1); setSearch('') }, [activeTab])

  const handleTabChange = (key: string) => {
    router.replace(`/basvurular?tab=${key}`, { scroll: false })
  }

  const showTaskCols = ['kesin_kabul', 'nihai_olmayan', 'nihai_uye'].includes(activeTab)

  const TaskIcon = ({ done }: { done: boolean }) => done
    ? <span className="text-green-500 text-xs">✓</span>
    : <span className="text-gray-300 text-xs">○</span>

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="bg-white border-b border-gray-100 px-8 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Flow</h1>
        <div className="overflow-x-auto">
          <TabBar tabs={tabsWithCounts} activeTab={activeTab} onChange={handleTabChange} />
        </div>
      </div>

      <div className="p-6">
        {/* Search + info */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Ad, e-posta veya telefon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-w-[260px]"
          />
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} kayıt</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Bu statüde kayıt yok
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ad Soyad</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">E-Posta</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Telefon</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Değerlendiren</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Not</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                    {activeTab === 'kesin_ret' && (
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Mail</th>
                    )}
                    {showTaskCols && (
                      <>
                        <th className="text-center px-3 py-3 font-medium text-gray-600 text-xs">Kar.Env</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600 text-xs">Dis.Env</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600 text-xs">Oryant.</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600 text-xs">Uyarı</th>
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
                          <div className="sticky top-0 z-10 bg-gray-50 px-4 py-1.5 border-b border-gray-100">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{group.label}</span>
                            <span className="text-[10px] text-gray-400 ml-2">({group.apps.length})</span>
                          </div>
                          <table className="w-full">
                            <tbody>
                              {visibleApps.map(app => {
                                const time = (app.submitted_at || app.created_at || '').slice(11, 16)
                                const statusKey = app.status || 'basvuru'
                                return (
                                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2.5 font-medium text-gray-900 w-[200px]">{app.full_name || '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-600 text-xs w-[220px]">{app.email || '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-500 text-xs w-[130px]">{app.phone || '—'}</td>
                                    <td className="px-4 py-2.5 w-[120px]">
                                      <Badge className={STATUS_BADGE[statusKey] || 'bg-gray-100 text-gray-600'}>
                                        {STATUS_LABELS[statusKey] || statusKey}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-500 text-xs w-[100px]">{app.reviewer || '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[200px] truncate">{app.review_note || '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-400 text-xs w-[80px]">{time || '—'}</td>
                                    {activeTab === 'kesin_ret' && (
                                      <td className="px-4 py-2.5 w-[80px]">
                                        {app.mail_sent ? (
                                          <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Gönderildi</Badge>
                                        ) : (
                                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">Bekliyor</Badge>
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
                                              <Badge className={wCount >= 2 ? 'bg-red-50 text-red-700 border-red-200 text-[10px]' : 'bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]'}>{wCount}</Badge>
                                            ) : (
                                              <span className="text-gray-300 text-xs">0</span>
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  {totalItems} kayıttan {startIdx + 1}–{Math.min(startIdx + PER_PAGE, totalItems)} arası
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50">Önceki</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50">Sonraki</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FlowPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    }>
      <FlowContent />
    </Suspense>
  )
}
