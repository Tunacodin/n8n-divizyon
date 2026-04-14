'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
// DB field names used directly
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline'

interface DeaktiveItem {
  id: string
  full_name: string
  email: string
  phone: string
  review_note: string
  submitted_at: string
  warning_count: number
  [key: string]: unknown
}

type TabKey = 'tumu' | 'envanterEksik' | 'basvuruYapmayan'

export default function DeaktiveContent() {
  const [data, setData] = useState<DeaktiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('tumu')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const PER_PAGE = 10

  const fetchData = useCallback(() => {
    fetch('/api/applications?status=deaktive')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useRealtimeRefresh(['applications'], () => fetchData())

  const filtered = useMemo(() => {
    let items = [...data]

    if (activeTab === 'envanterEksik') {
      items = items.filter((d) => {
        const neden = (d.review_note || '').toLowerCase()
        return neden.includes('envanter') || neden.includes('test')
      })
    } else if (activeTab === 'basvuruYapmayan') {
      items = items.filter((d) => {
        const neden = (d.review_note || '').toLowerCase()
        return neden.includes('basvuru') || neden.includes('başvuru')
      })
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((d) => {
        return (d.full_name || '').toLowerCase().includes(q) || (d.email || '').toLowerCase().includes(q)
      })
    }

    if (dateFrom || dateTo) {
      items = items.filter((d) => {
        if (!d.submitted_at) return false
        const dt = new Date(d.submitted_at)
        if (isNaN(dt.getTime())) return false
        if (dateFrom && dt < new Date(dateFrom)) return false
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59)
          if (dt > toDate) return false
        }
        return true
      })
    }

    const tsOf = (r: any) => Math.max(
      r.updated_at ? new Date(r.updated_at).getTime() : 0,
      r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0,
      r.submitted_at ? new Date(r.submitted_at).getTime() : 0,
    )
    items.sort((a, b) => tsOf(b) - tsOf(a))

    return items
  }, [data, activeTab, search, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [activeTab, search, dateFrom, dateTo])

  const counts = useMemo(() => {
    const envanterEksik = data.filter((d) => {
      const neden = (d.review_note || '').toLowerCase()
      return neden.includes('envanter') || neden.includes('test')
    }).length
    const basvuruYapmayan = data.filter((d) => {
      const neden = (d.review_note || '').toLowerCase()
      return neden.includes('basvuru') || neden.includes('başvuru')
    }).length
    return { tumu: data.length, envanterEksik, basvuruYapmayan }
  }, [data])

  const hasActiveFilters = !!(dateFrom || dateTo)
  const clearFilters = () => { setDateFrom(''); setDateTo('') }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'tumu', label: 'Tümü', count: counts.tumu },
    { key: 'envanterEksik', label: 'Envanter Testi Eksik', count: counts.envanterEksik },
    { key: 'basvuruYapmayan', label: 'Başvuru Yapmayan', count: counts.basvuruYapmayan },
  ]

  // Dinamik kolon tespiti (ilk kayıttan)
  const extraColumns: string[] = []

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deaktive Edilen Üyeler</h1>
            <p className="text-sm text-gray-500 mt-1">
              Envanter testini tamamlamayan veya başvuru yapmayan kullanıcılar
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            {data.length} kayıt
          </span>
        </div>
      </div>

      <div className="p-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-gray-200 text-gray-700' : 'bg-gray-200 text-gray-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ad soyad veya e-posta ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-gray-400 outline-none min-w-[220px]"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-gray-400 outline-none"
            title="Başlangıç tarihi"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-gray-400 outline-none"
            title="Bitiş tarihi"
          />
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <XMarkIcon className="w-4 h-4" />
              Temizle
            </button>
          )}
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} kayıt</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <UserMinusIcon className="w-7 h-7 text-gray-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-700 mb-1">Henüz deaktive edilmiş üye yok</h2>
              <p className="text-sm text-gray-400 text-center max-w-sm">
                Envanter testini tamamlamayan veya başvuru yapmayan kullanıcılar burada görünecek.
              </p>
            </div>
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
                    {extraColumns.map((col) => (
                      <th key={col} className="text-left px-4 py-3 font-medium text-gray-600">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={3 + extraColumns.length} className="text-center py-12 text-gray-400">
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    paged.map((row, i) => {
                      const name = row.full_name || '—'
                      const email = row.email || '—'
                      const telefon = row.phone || '—'
                      const initials = name.split(' ').map((p: string) => p.charAt(0)).join('').toUpperCase().slice(0, 2)

                      return (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                                {initials || '?'}
                              </div>
                              <span className="font-medium text-gray-900">{name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{email}</td>
                          <td className="px-4 py-3 text-gray-600">{telefon}</td>
                          {extraColumns.map((col) => (
                            <td key={col} className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">
                              {String(row[col] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  {filtered.length} sonuctan {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} arası
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`px-3 py-1.5 text-sm rounded-md border ${p === page ? 'bg-gray-700 text-white border-gray-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
