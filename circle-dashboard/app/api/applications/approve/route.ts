import { NextResponse } from 'next/server'
import { n8nClient } from '@/lib/n8n'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, action, notes } = body

    if (!email || !action) {
      return NextResponse.json(
        { error: 'Email and action are required' },
        { status: 400 }
      )
    }

    // Trigger n8n webhook (manuel-onay)
    const webhookPath = `manuel-onay/${encodeURIComponent(email)}?action=${action}`

    const result = await n8nClient.triggerWebhook(webhookPath)

    return NextResponse.json({
      success: true,
      message: `Application ${action}ed successfully`,
      email,
      result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
