'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  type Activity,
  describeActivity,
  formatActivityDate,
  formatFullDate,
  groupByDay,
  ACTION_FILTERS,
} from './activity-utils'

// ─── Avatar renkleri ───

const ACTOR_COLORS: Record<string, string> = {
  Taha: 'from-violet-500 to-purple-600',
  Haksemin: 'from-blue-500 to-indigo-600',
  Tuna: 'from-emerald-500 to-teal-600',
  Aslı: 'from-rose-500 to-pink-600',
  Gülse: 'from-amber-500 to-orange-600',
  Buğra: 'from-cyan-500 to-blue-600',
  Ertuğrul: 'from-red-500 to-rose-600',
  system: 'from-gray-400 to-gray-500',
}
const DEFAULT_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-500',
]

function getActorColor(actor: string): string {
  if (ACTOR_COLORS[actor]) return ACTOR_COLORS[actor]
  let hash = 0
  for (let i = 0; i < actor.length; i++) hash = actor.charCodeAt(i) + ((hash << 5) - hash)
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length]
}

function getInitials(name: string): string {
  if (name === 'system') return 'S'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ─── Tek Aktivite Satırı ───

function ActivityCard({ activity }: { activity: Activity }) {
  const { summary, detail } = describeActivity(activity)
  const [expanded, setExpanded] = useState(false)
  const actorName = activity.actor === 'system' ? 'Sistem' : activity.actor

  return (
    <div
      className="px-4 py-3 rounded-lg border border-gray-100 bg-white cursor-pointer hover:border-gray-200 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        {/* Actor Avatar */}
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getActorColor(activity.actor)} flex items-center justify-center shrink-0 mt-0.5`}>
          <span className="text-[11px] font-bold text-white leading-none">{getInitials(activity.actor)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <p className="text-sm text-gray-500 leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: highlightPerson(summary, activity) }} />
            </p>
            <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap ml-auto">
              {formatActivityDate(activity.created_at)}
            </span>
          </div>

          {detail && (
            <p className="text-xs text-gray-400 mt-1">{detail}</p>
          )}

          {expanded && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-0.5">
              <p>{formatFullDate(activity.created_at)}</p>
              {activity.person_email && <p>{activity.person_email}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Kişi ismini bold yap ───

function highlightPerson(summary: string, activity: Activity): string {
  const name = activity.person_name
  if (!name || name === 'Bilinmeyen') return summary

  return summary.replace(
    name,
    `<strong class="font-semibold text-gray-900">${name}</strong>`
  )
}

// ─── Ana Feed Bileşeni ───

export function ActivityFeed() {
  const [actionFilter, setActionFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [extraPages, setExtraPages] = useState<Activity[]>([])

  const limit = 50

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

  const handleFilterChange = (v: string) => {
    setActionFilter(v)
    setPage(1)
    setExtraPages([])
  }

  const grouped = groupByDay(activities)

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-8">
        <input
          type="text"
          placeholder="Kişi veya işlem ara..."
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 outline-none w-72"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <select
          value={actionFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white outline-none"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400 ml-auto">{total} işlem</span>
      </div>

      {/* Feed */}
      {Object.keys(grouped).length === 0 && !loading ? (
        <div className="text-center py-20 text-gray-400">
          Aktivite kaydı bulunamadı.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-base font-semibold text-gray-800">{day}</h2>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-sm text-gray-400">{items.length} işlem</span>
              </div>

              <div className="space-y-2">
                {items.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && hasMore && activities.length > 0 && (
        <div className="flex justify-center pt-6">
          <button
            onClick={loadMore}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Daha fazla yükle ({total - activities.length} kayıt daha var)
          </button>
        </div>
      )}

      {!loading && !hasMore && activities.length > 0 && (
        <div className="flex justify-center pt-6">
          <span className="text-xs text-gray-400">
            Tüm kayıtlar gösteriliyor ({activities.length}/{total})
          </span>
        </div>
      )}
    </div>
  )
}
