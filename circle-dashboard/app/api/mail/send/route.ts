import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuditLog, PROTECTED_BLOCK_MSG } from '@/lib/supabase'
import { sendMail } from '@/lib/resend'
import { getTemplate } from '@/lib/mail-templates'
import { requirePermission } from '@/lib/permissions'

// POST /api/mail/send
export async function POST(req: Request) {
  const denied = await requirePermission(req, 'mutate:mail')
  if (denied) return denied

  try {
    const body = await req.json()
    const sentBy = body.sent_by || 'system'

    const filterProtectedEmails = async (emails: string[]): Promise<Set<string>> => {
      const lower = emails.map((e) => (e || '').toLowerCase().trim()).filter(Boolean)
      if (lower.length === 0) return new Set()
      const rows = await prisma.applications.findMany({
        where: { email: { in: lower }, is_protected: true },
        select: { email: true },
      })
      return new Set(rows.map((r) => r.email.toLowerCase().trim()))
    }

    // Toplu gonderim
    if (body.emails && Array.isArray(body.emails)) {
      const batchId = crypto.randomUUID()
      const results: { email: string; success: boolean; error?: string; resend_id?: string }[] = []

      const protectedSet = await filterProtectedEmails(body.emails.map((i: { email: string }) => i.email))

      for (const item of body.emails) {
        const lower = (item.email || '').toLowerCase().trim()
        if (protectedSet.has(lower)) {
          results.push({ email: item.email, success: false, error: PROTECTED_BLOCK_MSG })
          continue
        }
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

          const sendResult = await sendMail({
            to: item.email,
            subject: item.subject || body.subject || template.subject,
            html,
          })

          results.push({ email: item.email, success: true, resend_id: sendResult?.id })
        } catch (err) {
          results.push({
            email: item.email,
            success: false,
            error: err instanceof Error ? err.message : 'Gonderim hatasi',
          })
        }
      }

      const successItems = results.filter((r) => r.success)
      if (successItems.length > 0) {
        const logs = successItems.map((item) => ({
          email_to: item.email.toLowerCase().trim(),
          subject: body.subject || '',
          template_name: body.template_id,
          provider: 'resend',
          batch_id: batchId,
          status: 'sent',
          sent_by: sentBy,
          metadata: item.resend_id ? ({ resend_id: item.resend_id } as never) : (null as never),
        }))

        await prisma.mail_logs.createMany({ data: logs as never })

        await withAuditLog({
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

    // Tek mail
    if (!body.email) {
      return NextResponse.json({ success: false, error: 'email zorunlu' }, { status: 400 })
    }
    if (!body.template_id) {
      return NextResponse.json({ success: false, error: 'template_id zorunlu' }, { status: 400 })
    }

    {
      const lower = body.email.toLowerCase().trim()
      const prot = await prisma.applications.findFirst({
        where: { email: lower, is_protected: true },
        select: { id: true },
      })
      if (prot) {
        return NextResponse.json({ success: false, error: PROTECTED_BLOCK_MSG }, { status: 403 })
      }
    }

    const isResendTemplate = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.template_id)
    let template: { id: string; name: string; subject: string; render: (vars: { firstName: string; lastName?: string }) => string } | null = null

    if (isResendTemplate) {
      try {
        const tr = await fetch(`https://api.resend.com/templates/${body.template_id}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          cache: 'no-store',
        })
        if (tr.ok) {
          const rt = await tr.json()
          const rawHtml: string = rt.html || ''
          const renderVars = (vars: { firstName: string; lastName?: string }) => rawHtml
            .replace(/\{\{\s*firstName\s*\}\}/g, vars.firstName || '')
            .replace(/\{\{\s*lastName\s*\}\}/g, vars.lastName || '')
            .replace(/\{\{\s*name\s*\}\}/g, `${vars.firstName || ''}${vars.lastName ? ' ' + vars.lastName : ''}`.trim())
          template = { id: rt.id, name: rt.name, subject: rt.subject || '', render: renderVars }
        }
      } catch (e) {
        console.error('Resend template fetch error:', e)
      }
    }

    if (!template) template = getTemplate(body.template_id) ?? null

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template bulunamadi' }, { status: 400 })
    }

    let applicationId: string | null = body.application_id ?? null
    if (!applicationId) {
      const app = await prisma.applications.findFirst({
        where: { email: body.email.toLowerCase().trim() },
        select: { id: true },
      })
      applicationId = app?.id || null
    }

    if (applicationId) {
      const existing = await prisma.mail_logs.findFirst({
        where: {
          application_id: applicationId,
          template_name: body.template_id,
          status: 'sent',
        },
        select: { id: true, sent_at: true },
      })

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Bu template daha once gonderilmis (${existing.sent_at ? new Date(existing.sent_at).toLocaleDateString('tr-TR') : ''})`,
            duplicate: true,
          },
          { status: 409 },
        )
      }
    }

    const html = template.render({
      firstName: body.firstName || body.email.split('@')[0],
      lastName: body.lastName,
    })

    const mailSubject = body.subject || template.subject
    let result: { id?: string } | null | undefined
    try {
      result = await sendMail({ to: body.email, subject: mailSubject, html })
    } catch (sendErr) {
      const errMsg = sendErr instanceof Error ? sendErr.message : 'gonderim hatasi'
      await prisma.mail_logs.create({
        data: {
          application_id: applicationId,
          email_to: body.email.toLowerCase().trim(),
          subject: mailSubject,
          template_name: body.template_id,
          provider: 'resend',
          status: 'failed',
          sent_by: sentBy,
          metadata: { error: errMsg } as never,
        },
      })
      throw sendErr
    }

    let logData
    try {
      logData = await prisma.mail_logs.create({
        data: {
          application_id: applicationId,
          email_to: body.email.toLowerCase().trim(),
          subject: mailSubject,
          template_name: body.template_id,
          provider: 'resend',
          status: 'sent',
          sent_by: sentBy,
          metadata: result?.id ? ({ resend_id: result.id } as never) : (null as never),
        },
      })
    } catch (logError) {
      console.error('Mail log kayit hatasi:', logError)
    }

    if (applicationId) {
      await prisma.applications.update({
        where: { id: applicationId },
        data: { mail_sent: true, mail_template: template.name },
      })
    }

    await withAuditLog({
      entityType: 'application',
      entityId: applicationId || 'unknown',
      action: 'mail_sent',
      actor: sentBy,
      newValues: { email: body.email, template: template.name, subject: mailSubject },
    })

    return NextResponse.json({ success: true, resend_id: result?.id, log: logData }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
