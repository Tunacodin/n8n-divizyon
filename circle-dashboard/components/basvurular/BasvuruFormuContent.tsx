'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  CalendarDaysIcon,
  ClockIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import BasvuruDetailModal from '@/components/basvuru/BasvuruDetailModal'

type TabKey = 'all' | 'today' | 'thisWeek' | 'thisMonth'

interface BasvuruItem {
  id: string
  full_name: string
  email: string
  phone: string
  birth_date: string
  submitted_at: string
  [key: string]: unknown
}

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Tümü', icon: FunnelIcon },
  { key: 'today', label: 'Bugün', icon: ClockIcon },
  { key: 'thisWeek', label: 'Bu Hafta', icon: CalendarIcon },
  { key: 'thisMonth', label: 'Bu Ay', icon: CalendarDaysIcon },
]

function getSubmissionDate(item: BasvuruItem): Date | null {
  if (!item.submitted_at) return null
  const d = new Date(item.submitted_at)
  return isNaN(d.getTime()) ? null : d
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

function isThisWeek(date: Date): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return date >= startOfWeek && date < endOfWeek
}

function isThisMonth(date: Date): boolean {
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export default function BasvuruFormuContent() {
  const [data, setData] = useState<BasvuruItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<BasvuruItem | null>(null)
  const itemsPerPage = 10

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/applications?status=basvuru')
      const result = await response.json()
      if (result.success) {
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching basvuru data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter by tab
  const tabFiltered = useMemo(() => {
    return data.filter((item) => {
      if (activeTab === 'all') return true
      const date = getSubmissionDate(item)
      if (!date) return false
      switch (activeTab) {
        case 'today':
          return isToday(date)
        case 'thisWeek':
          return isThisWeek(date)
        case 'thisMonth':
          return isThisMonth(date)
        default:
          return true
      }
    })
  }, [data, activeTab])

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!searchTerm.trim()) return tabFiltered
    const term = searchTerm.toLowerCase()
    return tabFiltered.filter((item) => {
      const name = (item.full_name || '').toLowerCase()
      const email = (item.email || '').toLowerCase()
      return name.includes(term) || email.includes(term)
    })
  }, [tabFiltered, searchTerm])

  // Sort by date (newest first)
  const sorted = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      const dateA = getSubmissionDate(a)
      const dateB = getSubmissionDate(b)
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return dateB.getTime() - dateA.getTime()
    })
  }, [searchFiltered])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage, itemsPerPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm])

  // Tab counts
  const tabCounts = useMemo(() => {
    let today = 0
    let thisWeek = 0
    let thisMonth = 0

    data.forEach((item) => {
      const date = getSubmissionDate(item)
      if (!date) return
      if (isToday(date)) today++
      if (isThisWeek(date)) thisWeek++
      if (isThisMonth(date)) thisMonth++
    })

    return { all: data.length, today, thisWeek, thisMonth }
  }, [data])

  const handleModalClose = () => {
    setSelectedItem(null)
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Basvuru Formu</h1>
            <p className="text-sm text-gray-500 mt-1">
              Typeform uzerinden gelen ham basvurulari goruntuleyin
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
            <InboxIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              {data.length} basvuru
            </span>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-wrap border-b border-gray-100">
            {TABS.map((tab) => {
              const count = tabCounts[tab.key]
              const isActive = activeTab === tab.key
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search Bar */}
          <div className="p-4">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ad soyad veya e-posta ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="animate-spin h-8 w-8 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm text-gray-500">Veriler yukleniyor...</span>
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <InboxIcon className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Kayit bulunamadi</p>
              <p className="text-xs mt-1">Bu filtreye uygun basvuru yok</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Ad Soyad
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        E-Posta
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Telefon
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Dogum Tarihi
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Gonderim Tarihi
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedData.map((item, index) => {
                      const name = item.full_name || '-'
                      const email = item.email || '-'
                      const phone = item.phone || '-'
                      const birthDate = item.birth_date || '-'
                      const dateStr = item.submitted_at
                        ? new Date(item.submitted_at).toLocaleDateString('tr-TR')
                        : '-'

                      // Initials for avatar
                      const initials = name
                        .split(' ')
                        .map((p: string) => p.charAt(0))
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)

                      const colors = [
                        'bg-blue-500',
                        'bg-indigo-500',
                        'bg-purple-500',
                        'bg-pink-500',
                        'bg-rose-500',
                        'bg-amber-500',
                        'bg-emerald-500',
                        'bg-teal-500',
                      ]
                      const colorIndex =
                        name
                          .split('')
                          .reduce(
                            (acc: number, char: string) => acc + char.charCodeAt(0),
                            0
                          ) % colors.length
                      const avatarColor = colors[colorIndex]

                      return (
                        <tr
                          key={`${email}-${index}`}
                          onClick={() => setSelectedItem(item)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor} flex-shrink-0`}
                              >
                                {initials}
                              </div>
                              <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                                {name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600">{email}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600">{phone}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600">{birthDate}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-gray-400">{dateStr}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Basvuruda
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Toplam <span className="font-semibold text-gray-700">{sorted.length}</span> kayit
                  {sorted.length > 0 && (
                    <>
                      {' '}
                      &middot; Sayfa{' '}
                      <span className="font-semibold text-gray-700">{currentPage}</span> /{' '}
                      <span className="font-semibold text-gray-700">{totalPages}</span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <BasvuruDetailModal data={selectedItem} onClose={handleModalClose} />
    </div>
  )
}
