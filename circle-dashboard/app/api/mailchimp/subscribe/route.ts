import { NextResponse } from 'next/server'
import { mailchimp } from '@/lib/mailchimp'

/** POST /api/mailchimp/subscribe — Add subscriber to audience */
export async function POST(request: Request) {
  try {
    const { listId, email, firstName, lastName } = await request.json()

    if (!listId || !email) {
      return NextResponse.json(
        { success: false, error: 'listId and email are required' },
        { status: 400 }
      )
    }

    const member = await mailchimp.addSubscriber(
      listId,
      email,
      firstName || '',
      lastName || ''
    )

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        email: member.email_address,
        status: member.status,
      },
    })
  } catch (error: any) {
    // Mailchimp returns "Member Exists" title when subscriber already exists
    if (error.title === 'Member Exists') {
      return NextResponse.json(
        { success: false, error: 'Bu kişi zaten listede' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
