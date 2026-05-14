'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

interface Notification {
  type: string
  severity: 'warning' | 'error' | 'info'
  message: string
  count: number
}

const severityStyles = {
  error: {
    bar: 'bg-destructive',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    count: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  warning: {
    bar: 'bg-warning',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    count: 'bg-warning/10 text-warning border-warning/20',
  },
  info: {
    bar: 'bg-info',
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
    count: 'bg-info/10 text-info border-info/20',
  },
} as const

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const

const notificationLinks: Record<string, string> = {
  mail_bekleyen: '/basvurular?tab=kesin_ret',
  kontrol_bekleyen: '/basvurular?tab=kontrol',
  oryantasyon_bekleyen: '/uyeler?tab=oryantasyon',
  uyari_gerekli: '/uyeler?tab=oryantasyon',
}

const notificationMeta: Record<string, { title: string; label: string }> = {
  mail_bekleyen: { title: 'Red maili gönderilmedi', label: 'Kesin Ret' },
  kontrol_bekleyen: { title: '1+ gündür kontrol bekliyor', label: 'Kontrol' },
  oryantasyon_bekleyen: { title: 'Oryantasyon yapılmadı', label: 'Oryantasyon' },
  uyari_gerekli: { title: 'Haftalık uyarı gerekli', label: 'Ağ Üyeleri' },
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

interface SessionInfo {
  email: string
  role: string
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/notifications/history?status=resolved&limit=100').then((r) => r.json())
      if (res.success) setHistory(res.data || [])
    } catch {}
    finally { setHistoryLoading(false) }
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.replace('/login')
  }

  const fetchNotifications = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/notifications').then((r) => r.json())
      if (res.success) setNotifications(res.notifications || [])
      setLastFetch(new Date())
    } catch {}
    finally { setRefreshing(false) }
  }

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me').then((r) => r.json())
      if (res.authenticated && res.session) setSession(res.session)
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    fetchSession()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const totalCount = notifications.reduce((s, n) => s + n.count, 0)
  const hasError = notifications.some((n) => n.severity === 'error')
  const sortedNotifications = [...notifications].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )

  if (pathname === '/login') return null

  const userInitials = session?.email
    ? session.email
        .split('@')[0]
        .split(/[._-]/)
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2) || session.email[0]?.toUpperCase()
    : 'U'

  const roleLabel = session?.role === 'admin' ? 'Admin' : session?.role === 'evaluator' ? 'Değerlendirici' : 'Görüntüleyen'

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-6 px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
          <Image
            src="/divizyon-logo.png"
            alt="Divizyon"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-xl shadow-glow transition-transform group-hover:scale-105"
          />
          <span className="hidden text-base font-semibold tracking-tight text-foreground sm:block">
            Divizyon
          </span>
        </Link>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setOpen(!open)}
              className={cn(
                'relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors',
                open ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-label="Bildirimler"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {totalCount > 0 && (
                <span
                  className={cn(
                    'absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
                    hasError ? 'bg-destructive animate-pulse-ring' : 'bg-warning',
                    'h-[18px]',
                  )}
                >
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[380px] origin-top-right overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Bildirimler</h3>
                    {totalCount > 0 && (
                      <span className="text-[11px] text-muted-foreground">{totalCount} acil iş</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); fetchNotifications() }}
                    disabled={refreshing}
                    title="Yenile"
                    className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <svg
                      className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                {sortedNotifications.length === 0 && !showHistory ? (
                  <div className="px-4 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                      <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">Bildirim yok</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Her şey yolunda</p>
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
                          onClick={() => { if (link) { router.push(link); setOpen(false) } }}
                          className={cn(
                            'group relative flex w-full items-start gap-3 border-b border-border/50 py-3 pl-4 pr-3 text-left transition-colors last:border-b-0',
                            link ? 'cursor-pointer hover:bg-muted/60' : 'cursor-default',
                          )}
                        >
                          <span className={cn('absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full', s.bar)} />
                          <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', s.iconBg)}>
                            <SeverityIcon severity={n.severity} className={cn('h-4 w-4', s.iconColor)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {label && <span>{label}</span>}
                              {label && link && <span className="opacity-50">·</span>}
                              {link && (
                                <span className="inline-flex items-center gap-0.5 transition-colors group-hover:text-foreground">
                                  İncele
                                  <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                  </svg>
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={cn('flex h-[22px] min-w-[26px] shrink-0 items-center justify-center self-center rounded-full border px-1.5 text-[11px] font-semibold', s.count)}>
                            {n.count}
                          </span>
                        </button>
                      )
                    })}

                    {showHistory && (
                      <>
                        <div className="border-b border-t border-border bg-muted/30 px-4 py-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Geçmiş ({history.length})
                          </span>
                        </div>
                        {historyLoading ? (
                          <div className="px-4 py-6 text-center text-xs text-muted-foreground">Yükleniyor…</div>
                        ) : history.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-muted-foreground">Geçmiş kayıt yok</div>
                        ) : (
                          history.map((h) => {
                            const s = severityStyles[h.severity]
                            return (
                              <button
                                key={h.id}
                                onClick={() => { if (h.link_href) { router.push(h.link_href); setOpen(false) } }}
                                className={cn(
                                  'group relative flex w-full items-start gap-3 border-b border-border/50 py-3 pl-4 pr-3 text-left opacity-70 transition-colors last:border-b-0',
                                  h.link_href ? 'cursor-pointer hover:bg-muted/60 hover:opacity-100' : 'cursor-default',
                                )}
                              >
                                <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-muted-foreground/30" />
                                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', s.iconBg)}>
                                  <SeverityIcon severity={h.severity} className={cn('h-4 w-4', s.iconColor)} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm leading-snug text-muted-foreground line-through decoration-muted-foreground/40">
                                    {h.title}
                                  </p>
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    Çözüldü · {new Date(h.resolved_at || h.last_seen_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <span className="flex h-[22px] min-w-[26px] shrink-0 items-center justify-center self-center rounded-full border border-border bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
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
                <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
                  <button
                    onClick={() => {
                      const next = !showHistory
                      setShowHistory(next)
                      if (next && history.length === 0) loadHistory()
                    }}
                    className="cursor-pointer text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    {showHistory ? 'Geçmişi gizle' : 'Daha fazla ↓'}
                  </button>
                  {lastFetch && (
                    <span className="text-[10px] text-muted-foreground">
                      {lastFetch.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · 30sn yenilenir
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'flex h-9 cursor-pointer items-center gap-2 rounded-lg pl-1 pr-2 transition-colors',
                userMenuOpen ? 'bg-muted' : 'hover:bg-muted',
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-bold text-white">
                {userInitials}
              </span>
              <svg className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-border bg-popover shadow-elevated animate-scale-in">
                {/* User info */}
                {session && (
                  <div className="border-b border-border px-3 py-3">
                    <p className="truncate text-sm font-medium text-foreground">{session.email}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                        {roleLabel}
                      </span>
                    </p>
                  </div>
                )}
                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Çıkış Yap
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
