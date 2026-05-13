'use client'

import { useState, useEffect, useMemo } from 'react'
// DB field names used directly
import {
  MagnifyingGlassIcon,
  QrCodeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface EtkinlikItem {
  id: string
  full_name: string
  email: string
  phone: string
  [key: string]: unknown
}

export default function EtkinliktenGelenlerPage() {
  const [data, setData] = useState<EtkinlikItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/applications?status=etkinlik')
      const result = await response.json()
      if (result.success) {
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter(item => {
      return (item.full_name || '').toLowerCase().includes(term) ||
        (item.email || '').toLowerCase().includes(term) ||
        (item.phone || '').includes(term)
    })
  }, [data, searchTerm])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const showPlaceholder = !loading && data.length === 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-20 z-30 bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Etkinlikten Gelenler</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Circle&apos;a etkinlik QR&apos;ı ile giriş yapan geçici üyelerin takibi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700">
              {data.length} kişi
            </span>
          </div>
        </div>
      </div>

      <div className="p-8">
        {showPlaceholder ? (
          /* Placeholder - sheet bos */
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex flex-col items-center justify-center py-24 px-8">
              <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mb-6">
                <QrCodeIcon className="w-8 h-8 text-cyan-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Henüz kayıt yok
              </h2>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                Etkinlik QR&apos;ı ile Circle&apos;a giriş yapan geçici üyeler burada listelenecek.
                Sheet bağlantısı yapılandırıldı, veri geldiğinde otomatik görünecektir.
              </p>
              <div className="bg-muted/50 rounded-lg border border-border p-4 max-w-md w-full">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sheet Kolonları</p>
                <div className="flex flex-wrap gap-2">
                  {['Ad', 'Soyad', 'Email', 'Telefon'].map(col => (
                    <span key={col} className="px-2.5 py-1 bg-card border border-border rounded-md text-xs text-muted-foreground">{col}</span>
                  ))}
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Planlanan Ek Kolonlar</p>
                <div className="flex flex-wrap gap-2">
                  {['Başvuru Yaptı mı?', 'Uyarı Sayısı', 'Uyarı Yapan', 'Uyarı Zamanı', 'Taşınma Tarihi', 'Durum'].map(col => (
                    <span key={col} className="px-2.5 py-1 bg-card border border-dashed border-border rounded-md text-xs text-muted-foreground">{col}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Aktif tablo */
          <div className="space-y-4">
            {/* Search */}
            <div className="flex justify-end">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ad, e-posta veya telefon ara..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Ad Soyad</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">E-Posta</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Telefon</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-6 py-4"><div className="h-4 w-32 bg-secondary rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-40 bg-secondary rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-28 bg-secondary rounded animate-pulse" /></td>
                      </tr>
                    ))
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-muted-foreground text-sm">
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, idx) => {
                      const name = item.full_name || '—'
                      const email = item.email || '—'
                      const telefon = item.phone || '—'

                      const initials = name.split(' ').map((p: string) => p.charAt(0)).join('').toUpperCase().slice(0, 2)

                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-50 hover:bg-muted/50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-xs font-semibold text-cyan-700">
                                {initials}
                              </div>
                              <span className="text-sm font-medium text-foreground">{name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">{email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">{telefon}</span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/50/50">
                  <span className="text-xs text-muted-foreground">
                    {filtered.length} kayıttan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} gösteriliyor
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-cyan-600 text-white'
                            : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
