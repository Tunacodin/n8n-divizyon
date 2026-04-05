import { NextResponse } from 'next/server'
import { mailchimp } from '@/lib/mailchimp'

const LIST_ID = 'fb6f4d3d63'

/** POST /api/mailchimp/send — Create & send a campaign to a single recipient */
export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, templateId, subject } =
      await request.json()

    if (!email || !templateId || !subject) {
      return NextResponse.json(
        { success: false, error: 'email, templateId ve subject zorunlu' },
        { status: 400 }
      )
    }

    // ✋ Duplicate kontrol: bu kişiye bu template daha önce gönderildi mi?
    const duplicateCheck = await mailchimp.hasReceivedTemplate(LIST_ID, email, Number(templateId))
    if (duplicateCheck.sent) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          error: `Bu mail daha önce gönderildi (${duplicateCheck.sentAt ? new Date(duplicateCheck.sentAt).toLocaleDateString('tr-TR') : 'bilinmiyor'})`,
          campaignId: duplicateCheck.campaignId,
        },
        { status: 409 }
      )
    }

    // 1. Subscriber yoksa ekle (Member Exists hatasını yut)
    try {
      await mailchimp.addSubscriber(LIST_ID, email, firstName || '', lastName || '')
    } catch (err: any) {
      if (err.title !== 'Member Exists') throw err
    }

    // 2. Bu email'e özel campaign oluştur
    const campaign = await mailchimp.createCampaign(LIST_ID, email, subject)

    // 3. Template içeriğini set et
    await mailchimp.setCampaignContent(campaign.id, Number(templateId))

    // 4. Gönder
    await mailchimp.sendCampaign(campaign.id)

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
    })
  } catch (error: any) {
    console.error('Mail send error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
