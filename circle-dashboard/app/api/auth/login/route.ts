import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession, verifyPassword } from '@/lib/auth'

export async function POST(req: Request) {
  let body: { email?: string; password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Geçersiz istek' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'E-posta ve şifre gerekli' }, { status: 400 })
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: { email: true, passwordHash: true, passwordSalt: true, role: true },
  })

  if (!user) {
    return NextResponse.json({ success: false, error: 'E-posta veya şifre hatalı' }, { status: 401 })
  }

  const passwordOk = await verifyPassword(password, user.passwordSalt, user.passwordHash)
  if (!passwordOk) {
    return NextResponse.json({ success: false, error: 'E-posta veya şifre hatalı' }, { status: 401 })
  }

  await prisma.adminUser.update({
    where: { email },
    data: { lastLoginAt: new Date() },
  })

  const tok = await createSession({ email, role: user.role, mode: 'email' })
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_session', tok, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 86400,
  })
  return res
}
