'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getBrowserClient } from '@/lib/supabase-browser'

interface Notification {
  type: string
  severity: 'warning' | 'error' | 'info'
  message: string
  count: number
}

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Ağ Üyeleri', href: '/uyeler' },
  { label: 'Aktiviteler', href: '/aktivite' },
  { label: 'Analiz', href: '/analiz' },
  { label: 'Workflowlar', href: '/workflows' },
]

const severityStyles = {
  error:   { bar: 'bg-red-500',   iconBg: 'bg-red-50',   iconColor: 'text-red-600',   count: 'bg-red-50 text-red-700 border-red-200' },
  warning: { bar: 'bg-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', count: 'bg-amber-50 text-amber-700 border-amber-200' },
  info:    { bar: 'bg-blue-500',  iconBg: 'bg-blue-50',  iconColor: 'text-blue-600',  count: 'bg-blue-50 text-blue-700 border-blue-200' },
}

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const

const notificationLinks: Record<string, string> = {
  mail_bekleyen: '/basvurular?tab=kesin_ret',
  kontrol_bekleyen: '/basvurular?tab=kontrol',
  oryantasyon_bekleyen: '/uyeler?tab=oryantasyon',
  uyari_gerekli: '/uyeler?tab=oryantasyon',
}

const notificationMeta: Record<string, { title: string; label: string }> = {
  mail_bekleyen:        { title: 'Red maili gönderilmedi',       label: 'Kesin Ret' },
  kontrol_bekleyen:     { title: '1+ gündür kontrol bekliyor',   label: 'Kontrol' },
  oryantasyon_bekleyen: { title: 'Oryantasyon yapılmadı',        label: 'Oryantasyon' },
  uyari_gerekli:        { title: 'Haftalık uyarı gerekli',       label: 'Ağ Üyeleri' },
}

function SeverityIcon({ severity, className }: { severity: 'error' | 'warning' | 'info'; className?: string }) {
  if (severity === 'error') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (severity === 'warning') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

interface HistoryRow {
  id: string
  type: string
  severity: 'error' | 'warning' | 'info'
  title: string
  count: number
  link_href: string | null
  first_seen_at: string
  last_seen_at: string
  resolved_at: string | null
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/notifications/history?status=resolved&limit=100').then(r => r.json())
      if (res.success) setHistory(res.data || [])
    } catch {
      // sessiz
    } finally {
      setHistoryLoading(false)
    }
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    router.replace('/login')
  }

  const fetchNotifications = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/notifications').then(r => r.json())
      if (res.success) setNotifications(res.notifications || [])
      setLastFetch(new Date())
    } catch {
      // sessiz başarısızlık — bildirim zaten yan bileşen
    } finally {
      setRefreshing(false)
    }
  }

  // Bildirimleri çek — ilk yükleme + yavaş backup polling
  // Asıl anlık güncellemeler Realtime subscription üzerinden.
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // Realtime: applications / task_completions / warnings değişince anında yenile
  useEffect(() => {
    const supabase = getBrowserClient()
    let debounce: NodeJS.Timeout | null = null
    const refresh = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => fetchNotifications(), 500)
    }
    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warnings' }, refresh)
      .subscribe()
    return () => {
      if (debounce) clearTimeout(debounce)
      supabase.removeChannel(channel)
    }
  }, [])

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const totalCount = notifications.reduce((s, n) => s + n.count, 0)
  const hasError = notifications.some(n => n.severity === 'error')
  const sortedNotifications = [...notifications].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )

  if (pathname === '/login') return null

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#1E1E2E] border-b border-gray-800">
      <div className="flex items-center h-20 px-10 gap-10">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img src="/logo-light@2x.png" alt="Divizyon" className="h-7" />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-base font-medium transition-colors',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          {/* Bildirim zili */}
          <div ref={ref} className="relative">
            <button
              onClick={() => setOpen(!open)}
              className={cn(
                'relative p-2 rounded-lg transition-colors',
                open ? 'bg-white/10' : 'hover:bg-white/5'
              )}
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {totalCount > 0 && (
                <span className={cn(
                  'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1',
                  hasError ? 'bg-red-500' : 'bg-amber-500'
                )}>
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Bildirimler</h3>
                    {totalCount > 0 && (
                      <span className="text-[11px] text-gray-400">
                        {totalCount} acil iş
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); fetchNotifications() }}
                    disabled={refreshing}
                    title="Yenile"
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <svg
                      className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                {sortedNotifications.length === 0 && !showHistory ? (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Bildirim yok</p>
                    <p className="text-xs text-gray-400 mt-0.5">Her şey yolunda</p>
                  </div>
                ) : (
                  <div className="max-h-[70vh] overflow-y-auto">
                    {sortedNotifications.map((n) => {
                      const s = severityStyles[n.severity]
                      const link = notificationLinks[n.type]
                      const meta = notificationMeta[n.type]
                      const title = meta?.title ?? n.message
                      const label = meta?.label

                      return (
                        <button
                          key={n.type}
                          onClick={() => {
                            if (link) {
                              router.push(link)
                              setOpen(false)
                            }
                          }}
                          className={cn(
                            'group relative w-full text-left flex items-start gap-3 pl-4 pr-3 py-3 border-b border-gray-50 last:border-b-0 transition-colors',
                            link ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                          )}
                        >
                          {/* Sol severity bar */}
                          <span className={cn('absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full', s.bar)} />

                          {/* Severity icon */}
                          <div className={cn('mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0', s.iconBg)}>
                            <SeverityIcon severity={n.severity} className={cn('w-4 h-4', s.iconColor)} />
                          </div>

                          {/* İçerik */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400">
                              {label && <span>{label}</span>}
                              {label && link && <span className="text-gray-300">·</span>}
                              {link && (
                                <span className="inline-flex items-center gap-0.5 text-gray-500 group-hover:text-gray-900 transition-colors">
                                  İncele
                                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                  </svg>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Count pill */}
                          <span
                            className={cn(
                              'shrink-0 self-center min-w-[26px] h-[22px] px-1.5 text-[11px] font-semibold rounded-full border flex items-center justify-center',
                              s.count,
                            )}
                          >
                            {n.count}
                          </span>
                        </button>
                      )
                    })}

                    {/* Geçmiş (çözülmüş) bildirimler */}
                    {showHistory && (
                      <>
                        <div className="px-4 py-2 bg-gray-50/50 border-t border-b border-gray-100">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Geçmiş ({history.length})
                          </span>
                        </div>
                        {historyLoading ? (
                          <div className="px-4 py-6 text-center text-xs text-gray-400">Yükleniyor…</div>
                        ) : history.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-gray-400">Geçmiş kayıt yok</div>
                        ) : (
                          history.map((h) => {
                            const s = severityStyles[h.severity]
                            return (
                              <button
                                key={h.id}
                                onClick={() => {
                                  if (h.link_href) {
                                    router.push(h.link_href)
                                    setOpen(false)
                                  }
                                }}
                                className={cn(
                                  'group relative w-full text-left flex items-start gap-3 pl-4 pr-3 py-3 border-b border-gray-50 last:border-b-0 transition-colors opacity-70',
                                  h.link_href ? 'hover:bg-gray-50 hover:opacity-100 cursor-pointer' : 'cursor-default',
                                )}
                              >
                                <span className={cn('absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gray-300')} />
                                <div className={cn('mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0', s.iconBg)}>
                                  <SeverityIcon severity={h.severity} className={cn('w-4 h-4', s.iconColor)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700 leading-snug line-through decoration-gray-300">
                                    {h.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400">
                                    <span>Çözüldü · {new Date(h.resolved_at || h.last_seen_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                                <span className="shrink-0 self-center min-w-[26px] h-[22px] px-1.5 text-[11px] font-semibold rounded-full border bg-gray-50 text-gray-500 border-gray-200 flex items-center justify-center">
                                  {h.count}
                                </span>
                              </button>
                            )
                          })
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <button
                    onClick={() => {
                      const next = !showHistory
                      setShowHistory(next)
                      if (next && history.length === 0) loadHistory()
                    }}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {showHistory ? 'Geçmişi gizle' : 'Daha fazla ↓'}
                  </button>
                  {lastFetch && (
                    <span className="text-[10px] text-gray-400">
                      {lastFetch.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · 60sn yenilenir
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title="Çıkış yap"
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>

        </div>
      </div>
    </header>
  )
}
