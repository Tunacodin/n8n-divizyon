'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

// ─── Types ───

interface NavItem {
  label: string
  href: string
  badge?: 'dot'
  badgeColor?: string
}

interface NavGroup {
  id: string
  label: string
  icon: React.ReactNode
  items: NavItem[]
}

interface NavSingle {
  id: string
  label: string
  href: string
  icon: React.ReactNode
}

type NavEntry = NavSingle | NavGroup

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry
}

interface Notification {
  type: string
  severity: 'warning' | 'error' | 'info'
  message: string
  count: number
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

// ─── Icons ───

const icons = {
  home: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  inbox: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  ),
  users: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  activity: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  envelope: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  settings: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chevron: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  collapseLeft: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  expandRight: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
  bell: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  refresh: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  ),
}

// ─── Navigation Config ───

const navigation: NavEntry[] = [
  { id: 'dashboard',   label: 'Dashboard',         href: '/',             icon: icons.home },
  { id: 'basvurular',  label: 'Başvurular',        href: '/basvurular',   icon: icons.inbox },
  { id: 'members',     label: 'Başvuru Yönetimi',  href: '/uyeler',       icon: icons.users },
  { id: 'uyelik',      label: 'Üyelik Süreci',     href: '/uyelik-sureci', icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7 8.25v6.75l-4-2.25v-4.5L3 4.5z" />
      </svg>
    ) },
  { id: 'activity',    label: 'Aktiviteler',       href: '/aktivite',     icon: icons.activity },
  { id: 'mail',        label: 'Mail Servisi',      href: '/mail-servisi', icon: icons.envelope },
  { id: 'analytics',   label: 'Raporlama',         href: '/analiz',       icon: icons.chart },
  { id: 'workflows',   label: 'Workflowlar',       href: '/workflows',    icon: icons.settings },
]

// ─── Severity styles for notifications ───

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

// ─── Sidebar Component ───

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // User
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  // Auto-open the group that contains the active page
  useEffect(() => {
    for (const entry of navigation) {
      if (isGroup(entry)) {
        const hasActive = entry.items.some(item =>
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        )
        if (hasActive) {
          setOpenGroups(prev => new Set(Array.from(prev).concat(entry.id)))
        }
      }
    }
  }, [pathname])

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

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/notifications/history?status=resolved&limit=100').then((r) => r.json())
      if (res.success) setHistory(res.data || [])
    } catch {}
    finally { setHistoryLoading(false) }
  }

  useEffect(() => {
    if (pathname === '/login') return
    fetchNotifications()
    fetchSession()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.replace('/login')
  }

  // Login sayfasinda sidebar gosterme
  if (pathname === '/login') return null

  const totalCount = notifications.reduce((s, n) => s + n.count, 0)
  const hasError = notifications.some((n) => n.severity === 'error')
  const sortedNotifications = [...notifications].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )

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
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-200 shrink-0 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header (logo + collapse) */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <Image
              src="/divizyon-logo.png"
              alt="Divizyon"
              width={32}
              height={32}
              priority
              className="w-8 h-8 rounded-lg shadow-sm"
            />
            <span className="text-sm font-semibold text-foreground">Divizyon</span>
          </Link>
        ) : (
          <Link href="/" className="mx-auto cursor-pointer">
            <Image
              src="/divizyon-logo.png"
              alt="Divizyon"
              width={32}
              height={32}
              priority
              className="w-8 h-8 rounded-lg shadow-sm"
            />
          </Link>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Menüyü daralt"
          >
            {icons.collapseLeft}
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Menüyü aç"
          aria-label="Menüyü aç"
        >
          {icons.expandRight}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0.5">
          {navigation.map((entry) => {
            if (!isGroup(entry)) {
              const active = isActive(entry.href)
              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  title={collapsed ? entry.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>
                    {entry.icon}
                  </span>
                  {!collapsed && <span className="truncate">{entry.label}</span>}
                </Link>
              )
            }

            const groupOpen = openGroups.has(entry.id)
            const groupHasActive = entry.items.some(i => isActive(i.href))

            if (collapsed) {
              return (
                <div key={entry.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    title={entry.label}
                    className={cn(
                      'w-full flex items-center justify-center py-2 rounded-lg transition-colors cursor-pointer',
                      groupHasActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    {entry.icon}
                  </button>
                  {groupHasActive && (
                    <div className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              )
            }

            return (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
                    groupHasActive && !groupOpen
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span className={cn('shrink-0', groupHasActive ? 'text-primary' : 'text-muted-foreground')}>
                    {entry.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{entry.label}</span>
                  <span className={cn(
                    'shrink-0 transition-transform duration-200 text-muted-foreground',
                    groupOpen && 'rotate-180'
                  )}>
                    {icons.chevron}
                  </span>
                </button>

                <div className={cn(
                  'overflow-hidden transition-all duration-200',
                  groupOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                )}>
                  <div className="ml-[18px] pl-3 border-l border-border mt-0.5 mb-1 space-y-0.5">
                    {entry.items.map((item) => {
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer',
                            active
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          {item.badge === 'dot' && (
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', item.badgeColor || 'bg-muted-foreground')} />
                          )}
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      {/* ───── Footer: Notifications + Theme + User ───── */}

      <div className="border-t border-sidebar-border shrink-0">
        {/* Notification + Theme row */}
        <div className={cn(
          'flex items-center gap-1 p-2',
          collapsed && 'flex-col gap-1'
        )}>
          {/* Notifications */}
          <div ref={notifRef} className="relative flex-1">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              title="Bildirimler"
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
                collapsed && 'justify-center px-0',
                notifOpen
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              aria-label="Bildirimler"
            >
              <span className="relative shrink-0">
                {icons.bell}
                {totalCount > 0 && (
                  <span
                    className={cn(
                      'absolute -right-1.5 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white h-[16px]',
                      hasError ? 'bg-destructive animate-pulse-ring' : 'bg-warning',
                    )}
                  >
                    {totalCount > 99 ? '99+' : totalCount}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Bildirimler</span>
                  {totalCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{totalCount}</span>
                  )}
                </>
              )}
            </button>

            {notifOpen && (
              <div
                className={cn(
                  'absolute z-50 bottom-full mb-2 w-[340px] origin-bottom-left overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated animate-scale-in',
                  collapsed ? 'left-full ml-2' : 'left-0'
                )}
                style={collapsed ? { bottom: 'auto', top: 0 } : undefined}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Bildirimler</h3>
                    {totalCount > 0 && (
                      <span className="text-[11px] text-muted-foreground">{totalCount} acil iş</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fetchNotifications() }}
                    disabled={refreshing}
                    title="Yenile"
                    className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <span className={cn(refreshing && 'animate-spin inline-block')}>{icons.refresh}</span>
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
                  <div className="max-h-[60vh] overflow-y-auto">
                    {sortedNotifications.map((n) => {
                      const s = severityStyles[n.severity]
                      const link = notificationLinks[n.type]
                      const meta = notificationMeta[n.type]
                      const title = meta?.title ?? n.message
                      const label = meta?.label

                      return (
                        <button
                          key={n.type}
                          type="button"
                          onClick={() => { if (link) { router.push(link); setNotifOpen(false) } }}
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
                                type="button"
                                onClick={() => { if (h.link_href) { router.push(h.link_href); setNotifOpen(false) } }}
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
                    type="button"
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

          {/* Theme toggle */}
          <ThemeToggle className="shrink-0" />
        </div>

        {/* User row */}
        <div ref={userRef} className="relative border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer',
              collapsed && 'justify-center px-0',
              userMenuOpen ? 'bg-muted' : 'hover:bg-muted'
            )}
            title={collapsed ? (session?.email || 'Kullanıcı') : undefined}
          >
            <span className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {userInitials}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-medium text-foreground truncate">{session?.email || '—'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
              </div>
            )}
            {!collapsed && (
              <span className="shrink-0 text-muted-foreground">{icons.chevron}</span>
            )}
          </button>

          {userMenuOpen && (
            <div
              className={cn(
                'absolute z-50 w-56 origin-bottom-left overflow-hidden rounded-xl border border-border bg-popover shadow-elevated animate-scale-in',
                collapsed
                  ? 'left-full bottom-2 ml-2'
                  : 'left-2 right-2 bottom-full mb-2 w-auto'
              )}
            >
              {session && (
                <div className="border-b border-border px-3 py-3">
                  <p className="truncate text-sm font-medium text-foreground">{session.email}</p>
                  <p className="mt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                      {roleLabel}
                    </span>
                  </p>
                </div>
              )}
              <div className="p-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  {icons.logout}
                  Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
