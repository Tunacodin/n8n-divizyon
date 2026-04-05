import { NextResponse } from 'next/server'
import { createClient, getDashboardStats, STATUS_LABELS, STATUS_COLORS } from '@/lib/supabase'

export const revalidate = 30

// GET /api/applications/stats
export async function GET() {
  const db = createClient()

  try {
    const { data, error } = await getDashboardStats(db)

    if (error) throw error

    // Her status icin label ve color ekle
    const enrichedBreakdown: Record<string, { count: number; label: string; color: string }> = {}
    for (const [status, count] of Object.entries(data!.breakdown)) {
      enrichedBreakdown[status] = {
        count,
        label: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280',
      }
    }

    return NextResponse.json({
      success: true,
      total: data!.total,
      breakdown: enrichedBreakdown,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
