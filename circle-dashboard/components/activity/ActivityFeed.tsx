'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  type Activity,
  describeActivity,
  getActivityMeta,
  formatActivityDate,
  formatFullDate,
  groupByDay,
  ACTION_FILTERS,
} from './activity-utils'

// ─── Tek Aktivite Kartı ───

function ActivityCard({ activity }: { activity: Activity }) {
  const { summary, detail } = describeActivity(activity)
  const meta = getActivityMeta(activity.action)
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`relative flex gap-3 py-3 px-4 rounded-xl border transition-all duration-150 hover:shadow-sm cursor-pointer ${meta.bgColor} ${meta.borderColor}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* İkon */}
      <div className="text-lg shrink-0 mt-0.5 select-none">{meta.icon}</div>

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-relaxed ${meta.color}`}>
          <span className="font-semibold">{activity.actor === 'system' ? 'Sistem' : activity.actor}</span>
          {', '}
          <span dangerouslySetInnerHTML={{ __html: highlightPerson(summary, activity) }} />
        </p>

        {detail && (
          <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{detail}</p>
        )}

        {/* Genişletilmiş detay */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-1">
            <p className="text-[11px] text-gray-400">
              Tam tarih: {formatFullDate(activity.created_at)}
            </p>
            {activity.person_email && (
              <p className="text-[11px] text-gray-400">
                E-posta: {activity.person_email}
              </p>
            )}
            <p className="text-[11px] text-gray-400">
              İşlem: {activity.action} | ID: {activity.entity_id.slice(0, 8)}...
            </p>
          </div>
        )}
      </div>

      {/* Zaman */}
      <div className="text-[11px] text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">
        {formatActivityDate(activity.created_at)}
      </div>
    </div>
  )
}

// ─── Kişi ismini bold yap ───

function highlightPerson(summary: string, activity: Activity): string {
  const name = activity.person_name
  if (!name || name === 'Bilinmeyen') return summary

  // Actor'ü çıkar, sadece geri kalanı highlight et
  const actorPrefix = `${activity.actor === 'system' ? 'Sistem' : activity.actor}, `
  const rest = summary.startsWith(actorPrefix) ? summary.slice(actorPrefix.length) : summary

  return rest.replace(
    name,
    `<strong class="font-semibold text-gray-900">${name}</strong>`
  )
}

// ─── Ana Feed Bileşeni ───

export function ActivityFeed() {
  // Filtreler
  const [actionFilter, setActionFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [extraPages, setExtraPages] = useState<Activity[]>([])

  const limit = 50

  // SWR key filtreler degisince otomatik guncellenir
  const swrKey = useMemo(() => {
    const params = new URLSearchParams({ page: '1', limit: String(limit) })
    if (actionFilter) params.set('type', actionFilter)
    if (searchQuery) params.set('search', searchQuery)
    return `/api/activity?${params}`
  }, [actionFilter, searchQuery])

  const { data: res, isLoading: loading } = useSWR<any>(swrKey)

  const firstPageData: Activity[] = res?.data || []
  const total = res?.total || 0
  const activities = page === 1 ? firstPageData : [...firstPageData, ...extraPages]
  const hasMore = activities.length < total

  const loadMore = async () => {
    const next = page + 1
    const params = new URLSearchParams({ page: String(next), limit: String(limit) })
    if (actionFilter) params.set('type', actionFilter)
    if (searchQuery) params.set('search', searchQuery)
    const r = await fetch(`/api/activity?${params}`)
    const d = await r.json()
    if (d.success) {
      setExtraPages((prev) => [...prev, ...d.data])
      setPage(next)
    }
  }

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPage(1)
    setExtraPages([])
  }

  // Filtre degisince ek sayfalari sifirla
  const handleFilterChange = (v: string) => {
    setActionFilter(v)
    setPage(1)
    setExtraPages([])
  }

  const grouped = groupByDay(activities)

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Arama */}
        <div className="flex gap-2 flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            placeholder="Kişi veya işlem yapan ara..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
          >
            Ara
          </button>
        </div>

        {/* İşlem tipi filtresi */}
        <select
          value={actionFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Toplam */}
        <div className="text-[13px] text-gray-400 ml-auto">
          {total} işlem
        </div>
      </div>

      {/* Aktivite Akışı */}
      {Object.keys(grouped).length === 0 && !loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Henüz aktivite kaydı bulunamadı.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              {/* Gün başlığı */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-[13px] font-semibold text-gray-700">{day}</div>
                <div className="flex-1 h-px bg-gray-100" />
                <div className="text-[11px] text-gray-400">{items.length} işlem</div>
              </div>

              {/* O günün aktiviteleri */}
              <div className="space-y-2">
                {items.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yükleniyor */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Daha fazla */}
      {!loading && hasMore && activities.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
          >
            Daha fazla yükle
          </button>
        </div>
      )}
    </div>
  )
}
