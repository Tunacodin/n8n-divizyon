'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'

type SourceFilter = 'tumu' | 'basvuru' | 'circle'

interface MemberItem {
  circle_id: number
  name: string
  email: string
  avatar_url: string | null
  joined_at: string
  last_seen_at: string | null
  source: 'basvuru' | 'circle'
  db_status?: string | null
  db_name?: string | null
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
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

const STATUS_LABELS: Record<string, string> = {
  basvuru: 'Başvuru',
  kontrol: 'Kontrol',
  kesin_kabul: 'Kesin Kabul',
  kesin_ret: 'Kesin Ret',
  nihai_olmayan: 'Kesin Kabul',
  nihai_uye: 'Nihai Üye',
  deaktive: 'Deaktive',
  circle: 'Circle',
}

function Avatar({ name, avatarUrl, id }: { name: string; avatarUrl: string | null; id: number }) {
  const [imgError, setImgError] = useState(false)
  const initials = name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2)
  const colors = ['bg-blue-500','bg-indigo-500','bg-purple-500','bg-pink-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-teal-500']
  const color = colors[id % colors.length]

  if (avatarUrl && !imgError) {
    return <img src={avatarUrl} alt={name} onError={() => setImgError(true)} className="w-9 h-9 rounded-full object-cover shrink-0" />
  }
  return <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${color} shrink-0`}>{initials || '?'}</div>
}

export default function MembersPage() {
  const { data: res, error: fetchError, isLoading: loading } = useSWR<any>('/api/circle/compare')

  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('tumu')
  const [page, setPage] = useState(1)

  const PER_PAGE = 20

  const basvurudan: MemberItem[] = res?.basvurudan || []
  const circleOnly: MemberItem[] = res?.circleOnly || res?.etkinlikten || []
  const error = fetchError ? 'Bağlantı hatası' : (!res?.success && res ? (res.error || 'Veri alınamadı') : null)

  const allMembers = useMemo(() => [...basvurudan, ...circleOnly], [basvurudan, circleOnly])

  const filtered = useMemo(() => {
    let items = [...allMembers]

    if (sourceFilter === 'basvuru') items = items.filter(m => m.source === 'basvuru')
    else if (sourceFilter === 'circle') items = items.filter(m => m.source === 'circle')

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    }

    const joined = (r: any) =>
      r.accepted_invitation_at ? new Date(r.accepted_invitation_at).getTime() :
      r.joined_at ? new Date(r.joined_at).getTime() : 0
    const seen = (r: any) => r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0
    items.sort((a: any, b: any) => {
      const d = joined(b) - joined(a)
      return d !== 0 ? d : seen(b) - seen(a)
    })
    return items
  }, [allMembers, sourceFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [sourceFilter, search])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Circle Üyeleri</h1>
            <p className="text-sm text-muted-foreground mt-1">Circle ağı ile başvuru veritabanı karşılaştırması</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-sm px-3 py-1">
              {allMembers.length} üye
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Toplam Circle Üyesi</p>
            <p className="text-2xl font-bold text-foreground">{allMembers.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Başvurudan Gelen</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{basvurudan.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">TypeForm ile başvurmuş</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sadece Circle</p>
            </div>
            <p className="text-2xl font-bold text-cyan-600">{circleOnly.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">DB'de başvurusu yok</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            type="text"
            placeholder="Ad veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[220px]"
          />

          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {([
              { key: 'tumu' as SourceFilter, label: 'Tümü', cnt: allMembers.length },
              { key: 'basvuru' as SourceFilter, label: 'Başvurudan', cnt: basvurudan.length },
              { key: 'circle' as SourceFilter, label: 'Circle', cnt: circleOnly.length },
            ]).map(({ key, label, cnt }) => (
              <button
                key={key}
                onClick={() => setSourceFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  sourceFilter === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {key === 'basvuru' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                {key === 'circle' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${sourceFilter === key ? 'bg-blue-100 text-blue-700' : 'bg-secondary text-muted-foreground'}`}>{cnt}</span>
              </button>
            ))}
          </div>

          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} sonuç</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Üye</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-Posta</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kaynak</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">DB Durumu</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Katılım</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Son Görülme</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Kayıt bulunamadı</td></tr>
                  ) : paged.map((m) => (
                    <tr key={m.circle_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} avatarUrl={m.avatar_url} id={m.circle_id} />
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{m.email}</td>
                      <td className="px-4 py-3">
                        {m.source === 'basvuru' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Başvurudan</Badge>
                        ) : (
                          <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200">Circle</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.db_status ? (
                          <Badge className="bg-muted text-muted-foreground border-border">{STATUS_LABELS[m.db_status] || m.db_status}</Badge>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(m.joined_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{timeAgo(m.last_seen_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} sonuçtan {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} arası
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-muted/50 disabled:opacity-50">Önceki</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-muted/50 disabled:opacity-50">Sonraki</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
