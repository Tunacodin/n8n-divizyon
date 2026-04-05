import { NextResponse } from 'next/server'
import { mailchimp } from '@/lib/mailchimp'

const LIST_ID = process.env.NEXT_PUBLIC_MAILCHIMP_AUDIENCE_ID || 'fb6f4d3d63'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ success: false, error: 'email zorunlu' }, { status: 400 })
    }

    await mailchimp.unsubscribeMember(LIST_ID, email)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
