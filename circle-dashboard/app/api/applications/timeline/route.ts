import { NextResponse } from 'next/server'
import { createClient, getTimelineData } from '@/lib/supabase'

export const revalidate = 60

// GET /api/applications/timeline?from=2025-01-01&to=2025-12-31&status=kesin_kabul
export async function GET(req: Request) {
  const db = createClient()
  const { searchParams } = new URL(req.url)

  try {
    const filters = {
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      status: searchParams.get('status') || undefined,
    }

    const { data, error } = await getTimelineData(db, filters)
    if (error) throw error

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      data: data || [],
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
