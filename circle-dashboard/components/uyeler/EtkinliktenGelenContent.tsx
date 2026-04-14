'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { UyeDetailDrawer } from './UyeDetailDrawer'
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TicketIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

type Member = { id: string } & Record<string, unknown>

type SourceKey = 'all' | 'circle_event' | 'circle_pre_panel' | 'circle_existing_match' | 'manual' | 'other'

const SOURCE_META: Record<Exclude<SourceKey, 'all'>, { label: string; color: string }> = {
  circle_event:            { label: 'Etkinlik',        color: 'bg-cyan-100 text-cyan-700' },
  circle_pre_panel:        { label: 'Panel Öncesi',    color: 'bg-violet-100 text-violet-700' },
  circle_existing_match:   { label: 'Mevcut Eşleşme',  color: 'bg-blue-100 text-blue-700' },
  manual:                  { label: 'Manuel',          color: 'bg-gray-100 text-gray-700' },
  other:                   { label: 'Diğer',           color: 'bg-gray-100 text-gray-600' },
}

function mapSource(raw: unknown): Exclude<SourceKey, 'all'> {
  const s = String(raw ?? '').trim()
  if (s === 'circle_event' || s === 'circle_pre_panel' || s === 'circle_existing_match' || s === 'manual') {
    return s
  }
  return 'other'
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'henüz çalışmadı'
  const then = new Date(iso).getTime()
  if (isNaN(then)) return 'bilinmiyor'
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} gün önce`
  const months = Math.floor(days / 30)
  return `${months} ay önce`
}

function fmtDate(raw: unknown): string {
  if (!raw) return '—'
  try {
    const d = new Date(String(raw))
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function EtkinliktenGelenContent() {
  const [data, setData] = useState<Member[]>([])
  const [totalCircle, setTotalCircle] = useState<number | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [selected, setSelected] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<SourceKey>('all')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const fetchData = useCallback(() => {
    fetch('/api/applications/etkinlikten-gelen')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data ?? [])
          setTotalCircle(res.totalCircleMembers ?? null)
          setLastSyncedAt(res.lastSyncedAt ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useRealtimeRefresh(['applications'], () => fetchData())

  // Source bazlı dağılım
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of data) counts[mapSource(m.protected_source)] = (counts[mapSource(m.protected_source)] ?? 0) + 1
    return counts
  }, [data])

  const filtered = useMemo(() => {
    let items = data
    if (source !== 'all') items = items.filter((m) => mapSource(m.protected_source) === source)
    if (search.trim()) {
      const term = search.toLowerCase().trim()
      items = items.filter((m) => {
        const name = String(m.full_name ?? '').toLowerCase()
        const email = String(m.email ?? '').toLowerCase()
        const phone = String(m.phone ?? m.circle_phone ?? '').toLowerCase()
        return name.includes(term) || email.includes(term) || phone.includes(term)
      })
    }
    // Circle'a katılım tarihi öncelikli; tiebreaker: last_seen.
    const joined = (r: any) => r.accepted_invitation_at ? new Date(r.accepted_invitation_at).getTime() : 0
    const seen = (r: any) => r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0
    return [...items].sort((a: any, b: any) => {
      const d = joined(b) - joined(a)
      return d !== 0 ? d : seen(b) - seen(a)
    })
  }, [data, source, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const sourceTabs = (
    [
      { key: 'all', label: 'Tümü', count: data.length },
      { key: 'circle_event', label: 'Etkinlik', count: breakdown.circle_event ?? 0 },
      { key: 'circle_pre_panel', label: 'Panel Öncesi', count: breakdown.circle_pre_panel ?? 0 },
      { key: 'circle_existing_match', label: 'Mevcut Eşleşme', count: breakdown.circle_existing_match ?? 0 },
      { key: 'manual', label: 'Manuel', count: breakdown.manual ?? 0 },
    ] as const
  ).filter((t) => t.key === 'all' || t.count > 0)

  const isEmpty = !loading && data.length === 0

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Etkinlikten Gelen Üyeler</h1>
            <p className="text-sm text-gray-500 mt-1">
              Circle'da kayıtlı olan ama n8n başvuru formuna düşmemiş üyeler
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Son kontrol: <span className="font-medium text-gray-700">{formatRelative(lastSyncedAt)}</span>
                {lastSyncedAt && (
                  <span className="text-gray-400">
                    ({new Date(lastSyncedAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </span>
              {totalCircle !== null && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>Circle'da toplam <span className="font-medium text-gray-700">{totalCircle}</span> üye</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700">
              {data.length} üye
            </span>
          </div>
        </div>
      </div>

      <div className="p-8">
        {isEmpty ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 px-8">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Tüm Circle üyeleri başvuru yapmış
            </h2>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Circle'da kayıtlı her üyenin n8n başvuru formunda da bir kaydı var.
              Etkinlikten veya dışarıdan sisteme girenler burada listelenir.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPI: Source dağılımı */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['circle_event', 'circle_pre_panel', 'circle_existing_match', 'manual'] as const).map((k) => {
                const count = breakdown[k] ?? 0
                const meta = SOURCE_META[k]
                const active = source === k
                return (
                  <button
                    key={k}
                    onClick={() => { setSource(active ? 'all' : (k as SourceKey)); setPage(1) }}
                    className={`bg-white rounded-lg border p-3 text-left transition-all ${
                      active ? 'border-cyan-300 ring-2 ring-cyan-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-500">{meta.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{count}</p>
                  </button>
                )
              })}
            </div>

            {/* Tabs + Arama */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
                {sourceTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setSource(t.key); setPage(1) }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      source === t.key ? 'bg-cyan-50 text-cyan-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                      source === t.key ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="İsim, e-posta veya telefon..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Tablo */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Üye</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">E-Posta</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Telefon</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Kaynak</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Circle'a Katılım</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    paginated.map((m, idx) => {
                      const name = String(m.full_name ?? '—')
                      const email = String(m.email ?? '—')
                      const phone = String(m.phone ?? m.circle_phone ?? '—')
                      const src = mapSource(m.protected_source)
                      const srcMeta = SOURCE_META[src]
                      const joinedAt = fmtDate(m.accepted_invitation_at ?? m.created_at)
                      const avatar = m.avatar_url ? String(m.avatar_url) : null
                      const initials = name.split(' ').map((p) => p.charAt(0)).join('').toUpperCase().slice(0, 2)
                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelected(m)}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-xs font-semibold text-cyan-700">
                                  {initials || '—'}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900">{name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold" title="Circle üyesi — salt okunur">
                                🔒
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{email}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{phone}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${srcMeta.color}`}>
                              <TicketIcon className="w-3 h-3" />
                              {srcMeta.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{joinedAt}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
                  <span className="text-xs text-gray-500">
                    {filtered.length} kayıttan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} gösteriliyor
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-xs text-gray-600 px-2">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <UyeDetailDrawer member={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
