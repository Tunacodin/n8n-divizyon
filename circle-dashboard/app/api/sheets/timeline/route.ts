import { NextResponse } from 'next/server'
import { sheetsClient } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // Format: YYYY-MM-DD
    const status = searchParams.get('status') // age_reject, community_reject, control_list, all

    let timeline = await sheetsClient.getTimelineData()

    // Filter by date if provided
    if (date) {
      timeline = timeline.filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0]
        return itemDate === date
      })
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      timeline = timeline.filter(item => item.status === status)
    }

    // Group by date
    const grouped = timeline.reduce((acc: any, item: any) => {
      const date = new Date(item.timestamp).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(item)
      return acc
    }, {})

    return NextResponse.json({
      timeline,
      grouped,
      stats: {
        total: timeline.length,
        ageRejects: timeline.filter((i: any) => i.status === 'age_reject').length,
        communityRejects: timeline.filter((i: any) => i.status === 'community_reject').length,
        controlList: timeline.filter((i: any) => i.status === 'control_list').length,
      },
    })
  } catch (error) {
    console.error('Error fetching timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timeline data' },
      { status: 500 }
    )
  }
}
