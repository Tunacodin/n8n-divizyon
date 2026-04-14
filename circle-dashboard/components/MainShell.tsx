'use client'

import { usePathname } from 'next/navigation'

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      {/* Fixed navbar için fiziksel spacer — content altına kaymasın */}
      <div className="h-20 w-full" aria-hidden="true" />
      <main className="min-h-[calc(100vh-5rem)]">{children}</main>
    </>
  )
}
