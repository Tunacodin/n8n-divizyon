import { NextResponse } from 'next/server'
import { mailchimp } from '@/lib/mailchimp'

/** GET /api/mailchimp/audiences — List audiences */
export async function GET() {
  try {
    const lists = await mailchimp.getAudiences()
    const audiences = lists.map((l: any) => ({
      id: l.id,
      name: l.name,
      member_count: l.stats?.member_count ?? 0,
    }))
    return NextResponse.json({ success: true, audiences })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

/** POST /api/mailchimp/audiences — Create a new audience */
export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const audience = await mailchimp.createAudience(name)
    return NextResponse.json({
      success: true,
      audience: {
        id: audience.id,
        name: audience.name,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
