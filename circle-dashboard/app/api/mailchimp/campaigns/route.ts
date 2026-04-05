import { NextResponse } from 'next/server'
import { mailchimp } from '@/lib/mailchimp'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined // sent | draft | sending | scheduled
  const count = Number(searchParams.get('count') || 500)

  try {
    const campaigns = await mailchimp.getCampaigns(status, count)

    const formatted = campaigns.map((c: any) => ({
      id: c.id,
      title: c.settings?.title || c.settings?.subject_line || '',
      subject: c.settings?.subject_line || '',
      from_name: c.settings?.from_name || '',
      status: c.status,
      sent_at: c.send_time || null,
      created_at: c.create_time || null,
      template_id: c.settings?.template_id || null,
      emails_sent: c.emails_sent || 0,
      // Tek kişiye gönderildiyse email adresini çıkar
      recipient_email: c.recipients?.segment_opts?.conditions?.[0]?.value || null,
      list_id: c.recipients?.list_id || null,
      opens: c.report_summary?.opens || 0,
      clicks: c.report_summary?.clicks || 0,
      open_rate: c.report_summary?.open_rate || 0,
      click_rate: c.report_summary?.click_rate || 0,
    }))

    return NextResponse.json({
      success: true,
      total: formatted.length,
      campaigns: formatted,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
