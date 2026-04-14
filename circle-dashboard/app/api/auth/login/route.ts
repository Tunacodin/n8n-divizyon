import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSession, verifyPassword } from '@/lib/auth'

const CIRCLE_V2_KEY = process.env.Circle_APIV2_KEY || process.env.Circle_ADMIN_V2_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Circle Admin V2 API ile üye doğrulama.
// Admin V2 key'inin kendisi zaten Circle admin tarafından üretiliyor — bu yüzden
// "e-posta Circle'da aktif üye" kontrolü pratik olarak yeterli.
// Dönüş:
//   'ok'       — V2 key ile email aktif üye olarak bulundu
//   'not_found'— V2 key geçerli ama email üye değil / inaktif
//   'skipped'  — V2 key yok veya erişilemiyor (admin_users tek otorite)
async function checkCircleMember(email: string): Promise<'ok' | 'not_found' | 'skipped'> {
  if (!CIRCLE_V2_KEY) return 'skipped'
  try {
    const url = `https://app.circle.so/api/admin/v2/community_members/search?email=${encodeURIComponent(email)}`
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${CIRCLE_V2_KEY}` },
    })
    if (r.status === 401 || r.status === 403) return 'skipped'
    if (r.status === 404) return 'not_found'
    if (!r.ok) return 'skipped'
    const data = await r.json()
    if (data?.email && data?.active === true) return 'ok'
    return 'not_found'
  } catch {
    return 'skipped'
  }
}

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

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: user } = await supabase
    .from('admin_users')
    .select('email, password_hash, password_salt')
    .eq('email', email)
    .maybeSingle()

  if (!user) {
    return NextResponse.json({ success: false, error: 'E-posta veya şifre hatalı' }, { status: 401 })
  }

  const passwordOk = await verifyPassword(password, user.password_salt, user.password_hash)
  if (!passwordOk) {
    return NextResponse.json({ success: false, error: 'E-posta veya şifre hatalı' }, { status: 401 })
  }

  // Circle member kontrolu kaldirildi — admin_users tablosu tek yetki kaynagi.

  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('email', email)

  const tok = await createSession({ email, role: 'admin', mode: 'email' })
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
