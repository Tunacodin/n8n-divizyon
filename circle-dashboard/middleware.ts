import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from './lib/auth'

const PUBLIC_PREFIXES = ['/login', '/api/auth/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // n8n / external webhook bypass: Authorization: Bearer <N8N_WEBHOOK_SECRET>
  // Dashboard UI Bearer header göndermediği için bu path'ten düşmez.
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET
  if (webhookSecret) {
    const auth = req.headers.get('authorization') || ''
    if (auth === `Bearer ${webhookSecret}`) {
      return NextResponse.next()
    }
  }

  const cookie = req.cookies.get('admin_session')?.value
  const session = cookie ? await verifySession(cookie) : null

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|logo-.*\\.png|.*\\.png$).*)'],
}
