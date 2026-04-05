'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Notification {
  type: string
  severity: 'warning' | 'error' | 'info'
  message: string
  count: number
}

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Flow', href: '/basvurular' },
  { label: 'Ağ Üyeleri', href: '/uyeler' },
  { label: 'Circle Üyeleri', href: '/members' },
  { label: 'Analiz', href: '/analiz' },
  { label: 'Aktivite Logu', href: '/aktivite' },
]

const severityStyles = {
  error: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '!' },
  warning: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '⚠' },
  info: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'i' },
}

export function Header() {
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  // Bildirimleri çek — her 60 saniyede bir
  useEffect(() => {
    const fetchNotifications = () => {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(res => {
          if (res.success) setNotifications(res.notifications || [])
        })
        .catch(() => {})
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200/60">
      <div className="flex items-center h-14 px-6 gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:block">Divizyon</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {/* Bildirim zili */}
          <div ref={ref} className="relative">
            <button
              onClick={() => setOpen(!open)}
              className={cn(
                'relative p-2 rounded-lg transition-colors',
                open ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Bildirimler</h3>
                  {notifications.length > 0 && (
                    <span className="text-[11px] text-gray-400">{notifications.length} bildirim</span>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">Bildirim yok</p>
                    <p className="text-xs text-gray-300 mt-1">Her şey yolunda!</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map((n) => {
                      const s = severityStyles[n.severity]
                      return (
                        <div key={n.type} className={cn('px-4 py-3', s.bg)}>
                          <div className="flex items-start gap-2.5">
                            <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', s.dot)} />
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium', s.text)}>{n.message}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {n.type === 'mail_bekleyen' && 'Başvurular → Kesin Ret'}
                                {n.type === 'kontrol_bekleyen' && 'Dashboard → Kontrol'}
                                {n.type === 'oryantasyon_bekleyen' && 'Ağ Üyeleri → Oryantasyon'}
                                {n.type === 'uyari_gerekli' && 'Ağ Üyeleri → Oryantasyon'}
                              </p>
                            </div>
                            <span className={cn('text-xs font-bold shrink-0 px-1.5 py-0.5 rounded-full', s.bg, s.text, s.border, 'border')}>
                              {n.count}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">DZ</span>
            </div>
            <span className="text-xs font-medium text-gray-600 hidden sm:block">Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
