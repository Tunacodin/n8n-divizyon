'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Başvurular', href: '/basvurular' },
  { label: 'Ağ Üyeleri', href: '/uyeler' },
]

export function Header() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200/60">
      <div className="flex items-center h-14 px-6 gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">Divizyon</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
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
