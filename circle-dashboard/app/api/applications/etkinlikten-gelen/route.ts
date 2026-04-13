import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const revalidate = 60

// GET /api/applications/etkinlikten-gelen
// Mantık: Circle'da kayıtlı (is_protected=true) ama n8n başvuru akışında
// (is_protected IS NOT TRUE) aynı email ile kayıt olmayan üyeleri döndür.
// Yani: Circle üyeleri − n8n başvurusu yapmış olanlar.
export async function GET(req: Request) {
  const db = createClient()
  const { searchParams } = new URL(req.url)
  const search = (searchParams.get('search') || '').trim().toLowerCase()

  try {
    const [{ data: protectedRows, error: e1 }, { data: appliedRows, error: e2 }] = await Promise.all([
      db.from('applications')
        .select('*')
        .eq('is_protected', true)
        .order('updated_at', { ascending: false, nullsFirst: false }),
      db.from('applications')
        .select('email')
        .or('is_protected.is.null,is_protected.eq.false'),
    ])
    if (e1) throw e1
    if (e2) throw e2

    const appliedEmails = new Set<string>()
    for (const r of appliedRows ?? []) {
      const em = String((r as { email?: string }).email ?? '').toLowerCase().trim()
      if (em) appliedEmails.add(em)
    }

    let items = (protectedRows ?? []).filter((r) => {
      const em = String((r as { email?: string }).email ?? '').toLowerCase().trim()
      return !em || !appliedEmails.has(em)
    })

    if (search) {
      items = items.filter((r) => {
        const row = r as Record<string, unknown>
        const name = String(row.full_name ?? '').toLowerCase()
        const email = String(row.email ?? '').toLowerCase()
        const phone = String(row.phone ?? row.circle_phone ?? '').toLowerCase()
        return name.includes(search) || email.includes(search) || phone.includes(search)
      })
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      data: items,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    console.error('GET /api/applications/etkinlikten-gelen error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
