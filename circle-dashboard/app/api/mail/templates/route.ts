import { NextResponse } from 'next/server'
import { MAIL_TEMPLATES } from '@/lib/mail-templates'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

interface ResendTemplate {
  id: string
  name: string
  alias: string | null
  subject: string | null
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

// GET /api/mail/templates — Resend'den canli template listesi (fallback: lokal)
export async function GET() {
  const local = MAIL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    status: 'published' as const,
    alias: t.id,
    source: 'local' as const,
  }))

  if (!RESEND_API_KEY) {
    return NextResponse.json({ success: true, source: 'local', data: local })
  }

  try {
    const r = await fetch('https://api.resend.com/templates', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      cache: 'no-store',
    })
    if (!r.ok) throw new Error(`Resend API ${r.status}`)
    const body = (await r.json()) as { data: ResendTemplate[] }

    const remote = (body.data || []).map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject || '',
      status: t.status,
      alias: t.alias,
      source: 'resend' as const,
    }))

    return NextResponse.json({
      success: true,
      source: 'resend',
      data: [...remote, ...local],
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown'
    console.error('Resend templates fetch error:', message)
    return NextResponse.json({
      success: true,
      source: 'local',
      fallback_reason: message,
      data: local,
    })
  }
}
