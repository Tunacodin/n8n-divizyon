import { NextResponse } from 'next/server'
import { createClient, withAuditLog } from '@/lib/supabase'
import { sendMail } from '@/lib/resend'
import { getTemplate } from '@/lib/mail-templates'

// POST /api/mail/send
// Body: { email, firstName, lastName, template_id, subject?, sent_by? }
// Toplu: { emails: [{email, firstName, template_id}], sent_by? }
export async function POST(req: Request) {
  const db = createClient()

  try {
    const body = await req.json()
    const sentBy = body.sent_by || 'system'

    // Toplu gonderim
    if (body.emails && Array.isArray(body.emails)) {
      const batchId = crypto.randomUUID()
      const results: { email: string; success: boolean; error?: string }[] = []

      for (const item of body.emails) {
        const template = getTemplate(item.template_id || body.template_id)
        if (!template) {
          results.push({ email: item.email, success: false, error: 'Template bulunamadi' })
          continue
        }

        try {
          const html = template.render({
            firstName: item.firstName || item.email.split('@')[0],
            lastName: item.lastName,
          })

          await sendMail({
            to: item.email,
            subject: item.subject || body.subject || template.subject,
            html,
          })

          results.push({ email: item.email, success: true })
        } catch (err) {
          results.push({
            email: item.email,
            success: false,
            error: err instanceof Error ? err.message : 'Gonderim hatasi',
          })
        }
      }

      // Basarili olanlari logla
      const successItems = results.filter((r) => r.success)
      if (successItems.length > 0) {
        const logs = successItems.map((item) => ({
          email_to: item.email.toLowerCase().trim(),
          subject: body.subject || '',
          template_name: body.template_id,
          provider: 'resend',
          batch_id: batchId,
          status: 'sent',
        }))

        await db.from('mail_logs').insert(logs)

        await withAuditLog(db, {
          entityType: 'mail',
          entityId: batchId,
          action: 'batch_send',
          actor: sentBy,
          newValues: { count: successItems.length, template: body.template_id },
        })
      }

      return NextResponse.json({
        success: true,
        batch_id: batchId,
        total: results.length,
        sent: successItems.length,
        failed: results.length - successItems.length,
        results,
      })
    }

    // Tek mail gonderim
    if (!body.email) {
      return NextResponse.json({ success: false, error: 'email zorunlu' }, { status: 400 })
    }
    if (!body.template_id) {
      return NextResponse.json({ success: false, error: 'template_id zorunlu' }, { status: 400 })
    }

    const template = getTemplate(body.template_id)
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template bulunamadi' }, { status: 400 })
    }

    // Application ile esle
    let applicationId = body.application_id
    if (!applicationId) {
      const { data: app } = await db
        .from('applications')
        .select('id')
        .eq('email', body.email.toLowerCase().trim())
        .single()
      applicationId = app?.id || null
    }

    // Duplicate kontrolu
    if (applicationId) {
      const { data: existing } = await db
        .from('mail_logs')
        .select('id, sent_at')
        .eq('application_id', applicationId)
        .eq('template_name', body.template_id)
        .eq('status', 'sent')
        .limit(1)
        .single()

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Bu template daha once gonderilmis (${new Date(existing.sent_at).toLocaleDateString('tr-TR')})`,
            duplicate: true,
          },
          { status: 409 }
        )
      }
    }

    // HTML render
    const html = template.render({
      firstName: body.firstName || body.email.split('@')[0],
      lastName: body.lastName,
    })

    // Resend ile gonder
    const mailSubject = body.subject || template.subject
    const result = await sendMail({
      to: body.email,
      subject: mailSubject,
      html,
    })

    // Log kaydet
    const { data: logData, error: logError } = await db
      .from('mail_logs')
      .insert({
        application_id: applicationId,
        email_to: body.email.toLowerCase().trim(),
        subject: mailSubject,
        template_name: body.template_id,
        provider: 'resend',
        status: 'sent',
      })
      .select()
      .single()

    if (logError) {
      console.error('Mail log kayit hatasi:', logError)
    }

    // Application guncelle
    if (applicationId) {
      await db
        .from('applications')
        .update({ mail_sent: true, mail_template: template.name })
        .eq('id', applicationId)
    }

    await withAuditLog(db, {
      entityType: 'application',
      entityId: applicationId || 'unknown',
      action: 'mail_sent',
      actor: sentBy,
      newValues: { email: body.email, template: template.name, subject: mailSubject },
    })

    return NextResponse.json({
      success: true,
      resend_id: result?.id,
      log: logData,
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
