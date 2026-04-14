import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth'

export async function GET() {
  const c = cookies().get('admin_session')?.value
  const session = c ? await verifySession(c) : null
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({ authenticated: true, session })
}
