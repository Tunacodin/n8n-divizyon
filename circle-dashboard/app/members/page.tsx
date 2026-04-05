'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

interface CircleMember {
  id: number
  name: string
  email: string
  avatar_url: string | null
  headline: string
  is_admin: boolean
  is_moderator: boolean
  joined_at: string
  last_seen_at: string | null
  public_uid: string | null
  roles: string[]
}

type TabKey = 'tumu' | 'adminler' | 'moderatorler' | 'uyeler'

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

function timeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Bugün'
    if (days === 1) return 'Dün'
    if (days < 7) return `${days} gün önce`
    if (days < 30) return `${Math.floor(days / 7)} hafta önce`
    if (days < 365) return `${Math.floor(days / 30)} ay önce`
    return `${Math.floor(days / 365)} yıl önce`
  } catch { return '—' }
}

function Avatar({ member }: { member: CircleMember }) {
  const [imgError, setImgError] = useState(false)
  const initials = member.name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2)
  const colors = ['bg-blue-500','bg-indigo-500','bg-purple-500','bg-pink-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-teal-500','bg-cyan-500','bg-orange-500']
  const color = colors[member.id % colors.length]

  if (member.avatar_url && !imgError) {
    return (
      <img
        src={member.avatar_url}
        alt={member.name}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${color} flex-shrink-0`}>
      {initials || '?'}
    </div>
  )
}

export default function MembersPage() {
  const [members, setMembers] = useState<CircleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [communityId, setCommunityId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('tumu')
  const [page, setPage] = useState(1)

  const PER_PAGE = 15

  const fetchMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/circle/members')
      const json = await res.json()
      if (json.success) {
        setMembers(json.members)
        setCommunityId(json.community_id)
      } else {
        setError(json.error || 'Veri alınamadı')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [])

  const filtered = useMemo(() => {
    let items = members

    if (activeTab === 'adminler') items = items.filter(m => m.is_admin)
    else if (activeTab === 'moderatorler') items = items.filter(m => m.is_moderator && !m.is_admin)
    else if (activeTab === 'uyeler') items = items.filter(m => !m.is_admin && !m.is_moderator)

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.headline.toLowerCase().includes(q)
      )
    }

    return items
  }, [members, activeTab, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [activeTab, search])

  const counts = useMemo(() => ({
    tumu: members.length,
    adminler: members.filter(m => m.is_admin).length,
    moderatorler: members.filter(m => m.is_moderator && !m.is_admin).length,
    uyeler: members.filter(m => !m.is_admin && !m.is_moderator).length,
  }), [members])

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tumu', label: 'Tümü' },
    { key: 'adminler', label: 'Adminler' },
    { key: 'moderatorler', label: 'Moderatörler' },
    { key: 'uyeler', label: 'Üyeler' },
  ]

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Circle Üyeleri</h1>
            <p className="text-sm text-gray-500 mt-1">
              {communityId ? `Community #${communityId}` : 'Circle topluluğu'} · {members.length} üye
            </p>
          </div>
          <button
            onClick={fetchMembers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      <div className="p-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
            <p className="font-medium">Circle API Hatası</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Toplam Üye', value: counts.tumu, color: 'text-gray-900' },
                  { label: 'Adminler', value: counts.adminler, color: 'text-blue-700' },
                  { label: 'Moderatörler', value: counts.moderatorler, color: 'text-purple-700' },
                  { label: 'Üyeler', value: counts.uyeler, color: 'text-gray-700' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs + Search */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                      {counts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="İsim, e-posta veya başlık ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <span className="text-sm text-gray-400 ml-auto">{filtered.length} kayıt</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    <span className="text-sm text-gray-500">Circle üyeleri yükleniyor...</span>
                  </div>
                </div>
              ) : paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <UserGroupIcon className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Kayıt bulunamadı</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Üye</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">E-Posta</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Katılma</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Son Görülme</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Circle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paged.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar member={member} />
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                {member.headline && (
                                  <p className="text-xs text-gray-400 truncate max-w-[200px]">{member.headline}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{member.email}</td>
                          <td className="px-4 py-3">
                            {member.is_admin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <ShieldCheckIcon className="w-3.5 h-3.5" />
                                Admin
                              </span>
                            ) : member.is_moderator ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                Moderatör
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Üye
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(member.joined_at)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{timeAgo(member.last_seen_at)}</td>
                          <td className="px-4 py-3">
                            {member.public_uid ? (
                              <a
                                href={`https://app.circle.so/users/${member.public_uid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Profil →
                              </a>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-500">
                    {filtered.length} üyeden {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} gösteriliyor
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => (
                        <span key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                          <button
                            onClick={() => setPage(p)}
                            className={`px-3 py-1.5 text-sm rounded-md border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
