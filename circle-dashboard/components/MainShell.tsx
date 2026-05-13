'use client'

import { usePathname } from 'next/navigation'

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) return <main className="min-h-screen">{children}</main>

  return <main className="min-h-[calc(100vh-4rem)]">{children}</main>
}
