'use client'

import { useState, useEffect, useMemo } from 'react'
// DB field names used directly
import {
  MagnifyingGlassIcon,
  StarIcon,
  TagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface NihaiItem {
  sheet: string
  [key: string]: any
}

type TabFilter = 'all' | 'oncu' | 'meydanOkuyan' | 'zihinKasifi' | 'hedefTakipcisi' | 'gozcu'

// 5 Ana Tag ve renkleri
const TAG_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string; keywords: string[] }> = {
  oncu: {
    bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500',
    label: 'Öncü',
    keywords: ['öncü', 'oncu'],
  },
  meydanOkuyan: {
    bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500',
    label: 'Meydan Okuyan',
    keywords: ['meydan okuyan', 'meydan'],
  },
  zihinKasifi: {
    bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500',
    label: 'Zihin Kaşifi',
    keywords: ['zihin kaşifi', 'zihin kasifi', 'zihin'],
  },
  hedefTakipcisi: {
    bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500',
    label: 'Hedef Takipçisi',
    keywords: ['hedef takipçisi', 'hedef takipcisi', 'hedef'],
  },
  gozcu: {
    bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500',
    label: 'Gözcü',
    keywords: ['gözcü', 'gozcu'],
  },
}

// Karakteristik → Tag eşleştirme
const KARAKTERISTIK_TAG_MAP: Record<string, string> = {
  birlestirici: 'Öncü',
  pratik: 'Öncü',
  sistemli: 'Öncü',
  ilham_verici: 'Öncü',
  tecrubeli: 'Öncü',
  challenger: 'Meydan Okuyan',
  mantikli: 'Meydan Okuyan',
  tutkulu: 'Meydan Okuyan',
  yaratici: 'Zihin Kaşifi',
  inovatif: 'Zihin Kaşifi',
  geleneksel: 'Zihin Kaşifi',
  caliskan: 'Hedef Takipçisi',
  titiz: 'Hedef Takipçisi',
  cozumcu: 'Hedef Takipçisi',
  gozlemci: 'Gözcü',
  kendinden_emin: 'Gözcü',
  canli: 'Gözcü',
  gelecek_odakli: 'Gözcü',
}

function getTagConfigByName(tagName: string) {
  const lower = tagName.toLowerCase()
  for (const [, config] of Object.entries(TAG_CONFIG)) {
    if (config.keywords.some(kw => lower.includes(kw))) {
      return config
    }
  }
  return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: tagName, keywords: [] }
}

function matchesTagFilter(tag: string, filterKey: string): boolean {
  const config = TAG_CONFIG[filterKey]
  if (!config) return false
  const lower = tag.toLowerCase()
  return config.keywords.some(kw => lower.includes(kw))
}

export default function NihaiAgUyesiContent() {
  const [data, setData] = useState<NihaiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/applications?status=nihai_uye')
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

  const getField = (item: NihaiItem, key: string) => {
    return item[key] || ''
  }

  // Tag dağılımı hesapla
  const tagDistribution = useMemo(() => {
    const dist: Record<string, number> = {}
    data.forEach(item => {
      const tag = getField(item, 'Atanan Tag') || getField(item, 'Tag') || 'Belirsiz'
      dist[tag] = (dist[tag] || 0) + 1
    })
    return dist
  }, [data])

  const filtered = useMemo(() => {
    let items = data

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => {
        const name = getField(item, 'Adın Soyadın') || getField(item, 'Ad Soyad') || getField(item, 'İsim')
        const email = getField(item, 'E-Posta Adresin') || getField(item, 'E-Posta') || getField(item, 'Mail')
        const tag = getField(item, 'Atanan Tag') || getField(item, 'Tag')
        return name.toLowerCase().includes(term) || email.toLowerCase().includes(term) || tag.toLowerCase().includes(term)
      })
    }

    if (activeTab !== 'all') {
      items = items.filter(item => {
        const tag = getField(item, 'Atanan Tag') || getField(item, 'Tag')
        return matchesTagFilter(tag, activeTab)
      })
    }

    return items
  }, [data, searchTerm, activeTab])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const countByTag = (filterKey: string) => {
    return data.filter(item => {
      const tag = getField(item, 'Atanan Tag') || getField(item, 'Tag')
      return matchesTagFilter(tag, filterKey)
    }).length
  }

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tümü', count: data.length },
    { key: 'oncu', label: 'Öncü', count: countByTag('oncu') },
    { key: 'meydanOkuyan', label: 'Meydan Okuyan', count: countByTag('meydanOkuyan') },
    { key: 'zihinKasifi', label: 'Zihin Kaşifi', count: countByTag('zihinKasifi') },
    { key: 'hedefTakipcisi', label: 'Hedef Takipçisi', count: countByTag('hedefTakipcisi') },
    { key: 'gozcu', label: 'Gözcü', count: countByTag('gozcu') },
  ]

  const showPlaceholder = !loading && data.length === 0

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nihai Ağ Üyeleri</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tüm süreci tamamlamış ve tag atanmış aktif üyeler
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
              {data.length} üye
            </span>
          </div>
        </div>
      </div>

      <div className="p-8">
        {showPlaceholder ? (
          /* Placeholder */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center justify-center py-24 px-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-6">
                <StarIcon className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Henüz nihai ağ üyesi yok
              </h2>
              <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                Başvuru, değerlendirme, envanter testleri ve oryantasyon süreçlerini tamamlayan
                üyeler burada listelenecek. Tag ataması yapıldıktan sonra bu sayfada görünürler.
              </p>

              {/* Tag yapısı bilgisi */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-w-lg w-full">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">5 Ana Tag</p>
                <div className="space-y-2">
                  {Object.entries(TAG_CONFIG).map(([key, config]) => {
                    const karakteristikler = Object.entries(KARAKTERISTIK_TAG_MAP)
                      .filter(([, tag]) => tag === config.label)
                      .map(([k]) => k.replace(/_/g, ' '))
                    return (
                      <div key={key} className="flex items-start gap-3 p-2 bg-white rounded-md border border-gray-100">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} flex-shrink-0 mt-0.5`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {karakteristikler.map(k => (
                            <span key={k} className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-500 capitalize">{k}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4 max-w-lg w-full">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Beklenen Kolonlar</p>
                <div className="flex flex-wrap gap-2">
                  {['Ad Soyad', 'E-Posta', 'Telefon', 'Cinsiyet', 'Atanan Tag', 'Tag Atama Tarihi', 'En Yüksek Skor', 'Nereden Geldi'].map(col => (
                    <span key={col} className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-600">{col}</span>
                  ))}
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Süreç Takibi</p>
                <div className="flex flex-wrap gap-2">
                  {['İlk Başvuru Tarihi', 'Kesin Kabul Tarihi', 'Circle Giriş Tarihi', 'Oryantasyon Tarihi', 'Toplam Süreç Gün'].map(col => (
                    <span key={col} className="px-2.5 py-1 bg-white border border-dashed border-gray-300 rounded-md text-xs text-gray-400">{col}</span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-200">
                <TagIcon className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">
                  Karakteristik Envanter skorlarına göre otomatik tag atanacak
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Aktif tablo */
          <div className="space-y-4">
            {/* Tag Dağılımı Kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(TAG_CONFIG).map(([key, config]) => {
                const count = tagDistribution[config.label] || 0
                return (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key as TabFilter); setCurrentPage(1) }}
                    className={`bg-white rounded-lg border p-4 text-left transition-all ${
                      activeTab === key
                        ? 'border-amber-300 ring-2 ring-amber-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                      <span className="text-xs font-medium text-gray-500">{config.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {data.length > 0 ? `${Math.round((count / data.length) * 100)}%` : '0%'}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1) }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === tab.key ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="İsim, e-posta veya tag ara..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Üye</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">E-Posta</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Telefon</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Atanan Tag</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">En Yüksek Skor</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Nereden Geldi</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Süreç</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, idx) => {
                      const name = getField(item, 'Adın Soyadın') || getField(item, 'Ad Soyad') || getField(item, 'İsim') || '—'
                      const email = getField(item, 'E-Posta Adresin') || getField(item, 'E-Posta') || getField(item, 'Mail') || '—'
                      const telefon = getField(item, 'Telefon Numaran') || getField(item, 'Telefon Numarası') || getField(item, 'Telefon') || '—'
                      const tag = getField(item, 'Atanan Tag') || getField(item, 'Tag') || '—'
                      const skor = getField(item, 'En Yüksek Skor') || getField(item, 'Score') || '—'
                      const nereden = getField(item, 'Nereden Geldi') || '—'
                      const toplamGun = getField(item, 'Toplam Süreç Gün') || getField(item, 'Toplam Surec Gun') || ''
                      const tagAtamaTarihi = getField(item, 'Tag Atama Tarihi') || ''

                      const tagColors = getTagConfigByName(tag)
                      const initials = name.split(' ').map((p: string) => p.charAt(0)).join('').toUpperCase().slice(0, 2)

                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700">
                                {initials}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{telefon}</span>
                          </td>
                          <td className="px-6 py-4">
                            {tag !== '—' ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tagColors.bg} ${tagColors.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${tagColors.dot}`} />
                                {tag}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{skor}</span>
                          </td>
                          <td className="px-6 py-4">
                            {nereden !== '—' ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                nereden.toLowerCase().includes('etkinlik')
                                  ? 'bg-cyan-100 text-cyan-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {nereden}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {toplamGun ? (
                              <span className="text-sm text-gray-600">{toplamGun} gün</span>
                            ) : tagAtamaTarihi ? (
                              <span className="text-xs text-gray-400">{tagAtamaTarihi}</span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
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
                    {filtered.length} kayıttan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} gösteriliyor
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-amber-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
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
    </div>
  )
}
