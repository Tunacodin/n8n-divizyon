import { NextResponse } from 'next/server'
import { mailchimp } from '@/lib/mailchimp'

const LIST_ID = process.env.NEXT_PUBLIC_MAILCHIMP_AUDIENCE_ID || 'fb6f4d3d63'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const count = Number(searchParams.get('count') || 1000)
  const offset = Number(searchParams.get('offset') || 0)

  try {
    const { members, total_items } = await mailchimp.getSubscribers(LIST_ID, count, offset)

    const formatted = members.map((m: any) => ({
      id: m.id,
      email: m.email_address,
      first_name: m.merge_fields?.FNAME || '',
      last_name: m.merge_fields?.LNAME || '',
      status: m.status, // subscribed, unsubscribed, cleaned, pending
      subscribed_at: m.timestamp_opt || m.timestamp_signup || null,
      last_changed: m.last_changed || null,
      avg_open_rate: m.stats?.avg_open_rate ?? null,
      avg_click_rate: m.stats?.avg_click_rate ?? null,
      campaigns_sent: m.stats?.campaign_last_sent ? 1 : 0,
      tags: (m.tags || []).map((t: any) => t.name),
      source: m.source || '',
    }))

    return NextResponse.json({
      success: true,
      total: total_items,
      count: formatted.length,
      subscribers: formatted,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
