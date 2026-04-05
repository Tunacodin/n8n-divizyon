import { NextResponse } from 'next/server'
import { mailchimp } from '@/lib/mailchimp'

/** GET /api/mailchimp/templates — List user-created templates */
export async function GET() {
  try {
    const templates = await mailchimp.getTemplates()

    return NextResponse.json({
      success: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
