'use client'

import { useState, useEffect, useMemo } from 'react'
import { UyeDetailDrawer } from './UyeDetailDrawer'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
// DB field names used directly
import {
  MagnifyingGlassIcon,
  StarIcon,
  TagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XCircleIcon,
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

type ContentProps = {
  endpoint?: string          // '/api/applications?...' — default nihai_uye
  emptyMessage?: string
  // Etkinlikten Gelen tab için: "başvuru yaptı mı?" kolonunu göster (email bazlı)
  showApplicationCheck?: boolean
}

export default function NihaiAgUyesiContent({
  endpoint = '/api/applications?status=nihai_uye&limit=1000',
  emptyMessage,
  showApplicationCheck = false,
}: ContentProps = {}) {
  const [data, setData] = useState<NihaiItem[]>([])
  const [appliedEmails, setAppliedEmails] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Deaktive akisi
  const [pendingDeactivate, setPendingDeactivate] = useState<{ appId: string; name: string } | null>(null)
  const [deactivatePerson, setDeactivatePerson] = useState('')
  const [deactivateNote, setDeactivateNote] = useState('')
  const [deactivateLoading, setDeactivateLoading] = useState<string | null>(null)

  const handleDeactivate = (appId: string, name: string) => {
    setPendingDeactivate({ appId, name })
    setDeactivatePerson('')
    setDeactivateNote('')
  }

  const submitDeactivate = async () => {
    if (!pendingDeactivate || !deactivatePerson.trim() || !deactivateNote.trim()) return
    const appId = pendingDeactivate.appId
    setDeactivateLoading(appId)
    setPendingDeactivate(null)
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: 'deaktive',
          changed_by: deactivatePerson,
          reason: deactivateNote,
          extra_updates: { reviewer: deactivatePerson, review_note: deactivateNote },
        }),
      })
      const result = await res.json()
      if (result.success) {
        setData((prev) => prev.filter((d) => (d as any).id !== appId))
      } else {
        alert(result.error || 'Deaktive islemi basarisiz')
      }
    } catch { alert('Baglanti hatasi') }
    setDeactivateLoading(null)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  // Realtime: applications veya task_completions değişince anında yenile
  useRealtimeRefresh(['applications', 'task_completions'], () => fetchData())

  const fetchData = async () => {
    try {
      const response = await fetch(endpoint)
      const result = await response.json()
      if (result.success) {
        setData(result.data || [])
      }
      // Etkinlikten Gelen tab'ı için: başvurudan gelen (is_protected=false) application'ların email'lerini al
      if (showApplicationCheck) {
        const appliedRes = await fetch('/api/applications?limit=2000').then((r) => r.json())
        if (appliedRes.success) {
          const emails = new Set<string>(
            (appliedRes.data || [])
              .filter((a: any) => !a.is_protected)
              .map((a: any) => String(a.email || '').toLowerCase().trim())
              .filter(Boolean)
          )
          setAppliedEmails(emails)
        }
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
      const tagsArr: string[] = Array.isArray((item as any).tags) ? (item as any).tags : []
      if (tagsArr.length > 0) {
        for (const t of tagsArr) dist[t] = (dist[t] || 0) + 1
      } else {
        const fallback = (item as any).main_role || getField(item, 'Atanan Tag') || getField(item, 'Tag') || 'Belirsiz'
        dist[fallback] = (dist[fallback] || 0) + 1
      }
    })
    return dist
  }, [data])

  const filtered = useMemo(() => {
    let items = data

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => {
        const name = (item as any).full_name || getField(item, 'Adın Soyadın') || getField(item, 'Ad Soyad') || getField(item, 'İsim') || ''
        const email = (item as any).email || getField(item, 'E-Posta Adresin') || getField(item, 'E-Posta') || getField(item, 'Mail') || ''
        const tagsArr: string[] = Array.isArray((item as any).tags) ? (item as any).tags : []
        const anyTag = (item as any).main_role || getField(item, 'Atanan Tag') || getField(item, 'Tag') || ''
        const tagsText = tagsArr.concat([anyTag]).join(' ').toLowerCase()
        return name.toLowerCase().includes(term) || email.toLowerCase().includes(term) || tagsText.includes(term)
      })
    }

    if (activeTab !== 'all') {
      items = items.filter(item => {
        const tagsArr: string[] = Array.isArray((item as any).tags) ? (item as any).tags : []
        if (tagsArr.some((t) => matchesTagFilter(t, activeTab))) return true
        const fallback = (item as any).main_role || getField(item, 'Atanan Tag') || getField(item, 'Tag') || ''
        return matchesTagFilter(fallback, activeTab)
      })
    }

    // Sıralama: Circle'a katılım tarihi (accepted_invitation_at) öncelikli — en yeni üstte.
    // Pipeline üyeleri (is_protected=false) için updated_at / submitted_at kullanılır.
    // last_seen sadece tiebreaker.
    const joinedTs = (r: any): number =>
      r.is_protected && r.accepted_invitation_at
        ? new Date(r.accepted_invitation_at).getTime()
        : (r.updated_at ? new Date(r.updated_at).getTime() :
           r.submitted_at ? new Date(r.submitted_at).getTime() : 0)

    const lastSeenTs = (r: any): number =>
      r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0

    items = [...items].sort((a, b) => {
      const diff = joinedTs(b) - joinedTs(a)
      if (diff !== 0) return diff
      return lastSeenTs(b) - lastSeenTs(a)
    })

    return items
  }, [data, searchTerm, activeTab])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const countByTag = (filterKey: string) => {
    return data.filter(item => {
      const tagsArr: string[] = Array.isArray((item as any).tags) ? (item as any).tags : []
      if (tagsArr.some((t) => matchesTagFilter(t, filterKey))) return true
      const fallback = (item as any).main_role || getField(item, 'Atanan Tag') || getField(item, 'Tag') || ''
      return matchesTagFilter(fallback, filterKey)
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
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Atanan Tag</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Nereden Geldi</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, idx) => {
                      const name = (item as any).full_name || getField(item, 'Adın Soyadın') || getField(item, 'Ad Soyad') || getField(item, 'İsim') || '—'
                      const email = (item as any).email || getField(item, 'E-Posta Adresin') || getField(item, 'E-Posta') || getField(item, 'Mail') || '—'
                      // applications.tags (TEXT[]) — Circle'dan senkronize edilmiş
                      const itemTags: string[] = Array.isArray((item as any).tags) ? (item as any).tags : []
                      const tag = itemTags[0] || (item as any).main_role || getField(item, 'Atanan Tag') || getField(item, 'Tag') || '—'
                      const skor = getField(item, 'En Yüksek Skor') || getField(item, 'Score') || '—'
                      // Nereden Geldi:
                      //   circle_pre_panel → '—' (panel öncesi eski veri, takip edilmiyor)
                      //   circle_event → 'Etkinlik'
                      //   circle_existing_match / null (form kaynaklı) → 'Başvuru'
                      const ps = (item as any).protected_source
                      const nereden = ps === 'circle_pre_panel' ? '—'
                        : ps === 'circle_event' ? 'Etkinlik'
                        : 'Başvuru'
                      // Toplam süreç: approved_at + 14 (nihai_uye geçiş tarihine kadar) — approximated
                      const approvedAt = (item as any).approved_at
                      const updatedAt = (item as any).updated_at
                      const toplamGun = approvedAt && updatedAt
                        ? String(Math.max(0, Math.floor((new Date(updatedAt).getTime() - new Date(approvedAt).getTime()) / 86400000)))
                        : (getField(item, 'Toplam Süreç Gün') || getField(item, 'Toplam Surec Gun') || '')
                      const tagAtamaTarihi = (item as any).updated_at
                        ? new Date((item as any).updated_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : (getField(item, 'Tag Atama Tarihi') || '')

                      const tagColors = getTagConfigByName(tag)
                      const initials = name.split(' ').map((p: string) => p.charAt(0)).join('').toUpperCase().slice(0, 2)

                      const avatarUrl: string | undefined = (item as any).avatar_url

                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelected(item)}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700">
                                  {initials}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900">{name}</span>
                              {(item as any).is_protected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold" title="Korumalı (Circle üyesi)">
                                  🔒
                                </span>
                              )}
                              {(item as any).protected_source === 'circle_event' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-medium" title="Etkinlik üzerinden ağa katılmış">
                                  Etkinlikten
                                </span>
                              )}
                              {showApplicationCheck && (() => {
                                const lower = String(email || '').toLowerCase().trim()
                                const applied = lower && appliedEmails.has(lower)
                                return applied ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium" title="Başvuru formu doldurulmuş">
                                    ✓ Başvurdu
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium" title="Henüz başvuru yapmamış">
                                    ⏳ Başvuru yok
                                  </span>
                                )
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{email}</span>
                          </td>
                          <td className="px-6 py-4">
                            {itemTags.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[340px]">
                                {itemTags.slice(0, 4).map((t) => {
                                  const cfg = getTagConfigByName(t)
                                  return (
                                    <span key={t}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}
                                      title={t}
                                    >
                                      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                                      {t.length > 20 ? t.slice(0, 20) + '…' : t}
                                    </span>
                                  )
                                })}
                                {itemTags.length > 4 && (
                                  <span className="text-[10px] text-gray-500 px-2 py-0.5"
                                    title={itemTags.slice(4).join(', ')}>
                                    +{itemTags.length - 4}
                                  </span>
                                )}
                              </div>
                            ) : tag !== '—' ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tagColors.bg} ${tagColors.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${tagColors.dot}`} />
                                {tag}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {nereden !== '—' ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                nereden === 'Etkinlik'
                                  ? 'bg-cyan-100 text-cyan-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {nereden}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {(() => {
                              const isProtected = !!(item as any).is_protected
                              const appId = (item as any).id as string | undefined
                              const isLoading = deactivateLoading === appId
                              if (isProtected) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 px-2 py-1 rounded-md cursor-not-allowed"
                                    title="Korumalı (Circle üyesi) — deaktive edilemez"
                                  >
                                    🔒 Korumalı
                                  </span>
                                )
                              }
                              if (!appId) return <span className="text-xs text-gray-300">—</span>
                              return (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeactivate(appId, name) }}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Üyeyi deaktive et"
                                >
                                  <XCircleIcon className="w-3.5 h-3.5" />
                                  {isLoading ? 'İşleniyor…' : 'Deaktive'}
                                </button>
                              )
                            })()}
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
                    {(() => {
                      // Compact pagination: 1 … (cur-1) cur (cur+1) … last
                      const pages: (number | 'dots')[] = []
                      const window = 1 // current etrafındaki ±
                      const push = (p: number | 'dots') => {
                        if (p !== 'dots' && (pages as number[]).includes(p as number)) return
                        if (p === 'dots' && pages[pages.length - 1] === 'dots') return
                        pages.push(p)
                      }
                      push(1)
                      if (currentPage - window > 2) push('dots')
                      for (let p = Math.max(2, currentPage - window); p <= Math.min(totalPages - 1, currentPage + window); p++) push(p)
                      if (currentPage + window < totalPages - 1) push('dots')
                      if (totalPages > 1) push(totalPages)
                      return pages.map((p, i) =>
                        p === 'dots' ? (
                          <span key={`d${i}`} className="px-1 text-xs text-gray-400 select-none">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p as number)}
                            className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                              currentPage === p
                                ? 'bg-amber-600 text-white'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )
                    })()}
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

      <UyeDetailDrawer member={selected} onClose={() => setSelected(null)} />

      {/* Deaktive onay dialog */}
      {pendingDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeactivate(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5 mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Deaktive Et</h3>
            <p className="text-xs text-gray-500 mb-3">
              {pendingDeactivate.name} nihai ağ üyeliğinden çıkarılacak.
            </p>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Onaylayan kişi <span className="text-red-500">*</span>
            </label>
            <select
              value={deactivatePerson}
              onChange={(e) => setDeactivatePerson(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-400 outline-none mb-3"
            >
              <option value="">Kişi seç...</option>
              <option value="Tuna">Tuna</option>
              <option value="Taha">Taha</option>
            </select>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Sebep <span className="text-red-500">*</span>
            </label>
            <textarea
              value={deactivateNote}
              onChange={(e) => setDeactivateNote(e.target.value)}
              rows={3}
              placeholder="Neden deaktive ediliyor?"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-400 outline-none mb-3 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setPendingDeactivate(null)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">İptal</button>
              <button
                onClick={submitDeactivate}
                disabled={!deactivatePerson.trim() || !deactivateNote.trim()}
                title={(!deactivatePerson.trim() || !deactivateNote.trim()) ? 'Onaylayan ve sebep zorunlu' : ''}
                className="flex-1 px-3 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Deaktive Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
