'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Severity = 'error' | 'warning' | 'info'

interface NotificationRow {
  id: string
  type: string
  severity: Severity
  title: string
  count: number
  link_href: string | null
  first_seen_at: string
  last_seen_at: string
  resolved_at: string | null
}

type StatusFilter = 'all' | 'active' | 'resolved'

const severityBadge: Record<Severity, string> = {
  error:   'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
}

const severityLabel: Record<Severity, string> = {
  error: 'Acil',
  warning: 'Uyarı',
  info: 'Bilgi',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function durationBetween(a: string, b: string): string {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  if (ms < 60000) return '<1 dk'
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min} dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} saat`
  return `${Math.floor(hr / 24)} gün`
}

export default function BildirimlerPage() {
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications/history?status=${filter}&limit=500`).then(r => r.json())
      if (res.success) setRows(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase().trim()
    return rows.filter(r => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q))
  }, [rows, search])

  const counts = useMemo(() => {
    let active = 0, resolved = 0
    for (const r of rows) {
      if (r.resolved_at) resolved++
      else active++
    }
    return { active, resolved, total: rows.length }
  }, [rows])

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-20 z-30 bg-card border-b border-border px-8 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">Bildirimler</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {counts.total} kayıt · <span className="text-red-600 font-medium">{counts.active} aktif</span> · {counts.resolved} çözülmüş
            </p>
          </div>
          <input
            type="text"
            placeholder="Başlık veya tip ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64"
          />
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1 w-fit">
          {(['all', 'active', 'resolved'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f ? 'bg-indigo-50 text-indigo-700' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : 'Çözülmüş'}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">Durum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Başlık</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Adet</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-44">İlk Görülme</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-44">Son Görülme / Çözülme</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Süre</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground w-28">İncele</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Yükleniyor…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Kayıt bulunamadı</td></tr>
              ) : (
                filtered.map(r => {
                  const closed = !!r.resolved_at
                  const duration = durationBetween(r.first_seen_at, r.resolved_at || r.last_seen_at)
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-muted/50/50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${severityBadge[r.severity]}`}>
                          {severityLabel[r.severity]}
                        </span>
                        {closed && (
                          <span className="ml-1 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                            ✓
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">{r.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.count}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(r.first_seen_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(r.resolved_at || r.last_seen_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{duration}</td>
                      <td className="px-4 py-3 text-center">
                        {r.link_href ? (
                          <Link
                            href={r.link_href}
                            className="whitespace-nowrap text-[11px] px-2.5 py-1.5 rounded-lg font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                          >
                            İncele →
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
