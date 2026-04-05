import { NextResponse } from 'next/server'
import { MAIL_TEMPLATES } from '@/lib/mail-templates'

// GET /api/mail/templates — Lokal template listesi
export async function GET() {
  return NextResponse.json({
    success: true,
    data: MAIL_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
    })),
  })
}
