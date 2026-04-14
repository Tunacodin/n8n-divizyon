import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/notifications/history?status=all|active|resolved&limit=200
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'
  const limit = Math.min(500, Number(searchParams.get('limit') || '200'))

  const db = createClient()
  let query = db
    .from('notifications')
    .select('id, type, severity, title, count, link_href, first_seen_at, last_seen_at, resolved_at')
    .order('last_seen_at', { ascending: false })
    .limit(limit)

  if (status === 'active') query = query.is('resolved_at', null)
  else if (status === 'resolved') query = query.not('resolved_at', 'is', null)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data || [], total: data?.length || 0 })
}
