import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/mail/logs?email=ali@test.com&template=kabul&limit=100
export async function GET(req: Request) {
  const db = createClient()
  const { searchParams } = new URL(req.url)

  const email = searchParams.get('email')
  const template = searchParams.get('template')
  const applicationId = searchParams.get('application_id')
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    let query = db
      .from('mail_logs')
      .select('*, applications(full_name, email, status)')
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (email) query = query.eq('email_to', email.toLowerCase())
    if (template) query = query.eq('template_name', template)
    if (applicationId) query = query.eq('application_id', applicationId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, total: data?.length || 0, data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
