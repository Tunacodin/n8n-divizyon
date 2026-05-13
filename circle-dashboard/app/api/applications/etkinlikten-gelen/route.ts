import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 60

// GET /api/applications/etkinlikten-gelen
// Circle'da kayitli (is_protected=true) ama applications'da basvuru yapmamis uyeler.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = (searchParams.get('search') || '').trim().toLowerCase()

  try {
    const [protectedRows, appliedRows] = await Promise.all([
      prisma.applications.findMany({
        where: { is_protected: true },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.applications.findMany({
        where: { is_protected: false },
        select: { email: true },
      }),
    ])

    const appliedEmails = new Set<string>()
    for (const r of appliedRows) {
      const em = String(r.email ?? '').toLowerCase().trim()
      if (em) appliedEmails.add(em)
    }

    let items = protectedRows.filter((r) => {
      const em = String(r.email ?? '').toLowerCase().trim()
      return !em || !appliedEmails.has(em)
    })

    if (search) {
      items = items.filter((r) => {
        const name = String(r.full_name ?? '').toLowerCase()
        const email = String(r.email ?? '').toLowerCase()
        const phone = String(r.phone ?? r.circle_phone ?? '').toLowerCase()
        return name.includes(search) || email.includes(search) || phone.includes(search)
      })
    }

    let lastSyncedAt: Date | null = null
    for (const r of protectedRows) {
      if (r.updated_at && (!lastSyncedAt || r.updated_at > lastSyncedAt)) {
        lastSyncedAt = r.updated_at
      }
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      totalCircleMembers: protectedRows.length,
      lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
      data: items,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    console.error('GET /api/applications/etkinlikten-gelen error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
