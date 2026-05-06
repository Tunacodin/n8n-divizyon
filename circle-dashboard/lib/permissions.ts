// RBAC: rol bazli yetkilendirme. SessionPayload.role'u (admin/evaluator/viewer)
// kullanarak endpoint'lere giris kontrolu yapar.
//
// Kullanim (route handler icinde):
//   import { requirePermission } from '@/lib/permissions'
//   const denied = await requirePermission(req, 'mutate:application')
//   if (denied) return denied
//
// Yetki listesi asagida — yeni eylem eklerken matrise ekle.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, type SessionPayload } from './auth'

export type Permission =
  | 'mutate:application'   // status, field update, delete
  | 'mutate:tasks'         // task ekle/tamamla
  | 'mutate:warnings'      // uyari ekle
  | 'mutate:evaluations'   // degerlendirme ekle
  | 'mutate:mail'          // mail gonderimi
  | 'mutate:events'        // etkinlik olustur/sil
  | 'admin:users'          // admin_users tablosu — eklenmemis ama hazir
  | 'read'                 // genel okuma (tum roller)

const PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'mutate:application',
    'mutate:tasks',
    'mutate:warnings',
    'mutate:evaluations',
    'mutate:mail',
    'mutate:events',
    'admin:users',
    'read',
  ],
  evaluator: [
    'mutate:application',
    'mutate:tasks',
    'mutate:warnings',
    'mutate:evaluations',
    'read',
  ],
  viewer: ['read'],
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = cookies().get('admin_session')?.value
  if (!c) return null
  return verifySession(c)
}

export function hasPermission(session: SessionPayload | null, perm: Permission): boolean {
  if (!session) return false
  const allowed = PERMISSIONS[session.role] || []
  return allowed.includes(perm)
}

export async function requirePermission(_req: Request, perm: Permission): Promise<NextResponse | null> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'unauthenticated' }, { status: 401 })
  }
  if (!hasPermission(session, perm)) {
    return NextResponse.json(
      { success: false, error: `Bu islem icin yetki yok (gerekli: ${perm}, rolun: ${session.role})` },
      { status: 403 },
    )
  }
  return null
}
