'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Nav Types ───

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

// ─── Icons (minimal, consistent) ───

const icons = {
  home: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  pipeline: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  ),
  users: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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
}

// ─── Navigation Config ───

const navigation: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: icons.home },
  { id: 'members', label: 'Ağ Üyeleri', href: '/uyeler', icon: icons.users },
  { id: 'activity', label: 'Aktiviteler', href: '/aktivite', icon: icons.activity },
  { id: 'analytics', label: 'Analiz', href: '/analiz', icon: icons.chart },
  { id: 'workflows', label: 'Workflowlar', href: '/workflows', icon: icons.settings },
]

// ─── Sidebar Component ───

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

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

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200/60 flex flex-col transition-all duration-200 shrink-0 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-gray-100 shrink-0">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Divizyon</span>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">D</span>
            </div>
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Menuyu Ac"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0.5">
          {navigation.map((entry) => {
            if (!isGroup(entry)) {
              // Single item
              const active = isActive(entry.href)
              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  title={collapsed ? entry.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <span className={cn('shrink-0', active ? 'text-indigo-500' : 'text-gray-400')}>
                    {entry.icon}
                  </span>
                  {!collapsed && <span className="truncate">{entry.label}</span>}
                </Link>
              )
            }

            // Group
            const groupOpen = openGroups.has(entry.id)
            const groupHasActive = entry.items.some(i => isActive(i.href))

            if (collapsed) {
              // Collapsed: show only icon, active indicator
              return (
                <div key={entry.id} className="relative">
                  <button
                    onClick={() => setCollapsed(false)}
                    title={entry.label}
                    className={cn(
                      'w-full flex items-center justify-center py-2 rounded-lg transition-colors',
                      groupHasActive
                        ? 'bg-indigo-50 text-indigo-500'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {entry.icon}
                  </button>
                  {groupHasActive && (
                    <div className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </div>
              )
            }

            // Expanded group
            return (
              <div key={entry.id}>
                <button
                  onClick={() => toggleGroup(entry.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors',
                    groupHasActive && !groupOpen
                      ? 'text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <span className={cn('shrink-0', groupHasActive ? 'text-indigo-500' : 'text-gray-400')}>
                    {entry.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{entry.label}</span>
                  <span className={cn(
                    'shrink-0 transition-transform duration-200 text-gray-400',
                    groupOpen && 'rotate-180'
                  )}>
                    {icons.chevron}
                  </span>
                </button>

                {/* Sub-items */}
                <div className={cn(
                  'overflow-hidden transition-all duration-200',
                  groupOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                )}>
                  <div className="ml-[18px] pl-3 border-l border-gray-100 mt-0.5 mb-1 space-y-0.5">
                    {entry.items.map((item) => {
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                            active
                              ? 'bg-indigo-50 text-indigo-600 font-medium'
                              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                          )}
                        >
                          {item.badge === 'dot' && (
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', item.badgeColor || 'bg-gray-300')} />
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

      {/* Footer */}
      {!collapsed && (
        <div className="p-2 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-gray-500">
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">DZ</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">Divizyon Team</p>
              <p className="text-[11px] text-gray-400 truncate">Admin Panel</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
