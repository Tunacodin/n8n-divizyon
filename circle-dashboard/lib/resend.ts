import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY env degiskeni tanimlanmamis')
    _resend = new Resend(key)
  }
  return _resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Divizyon <noreply@tunabostancibasi.com>'

export interface SendMailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendMail({ to, subject, html, replyTo }: SendMailOptions) {
  const resend = getResend()

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    replyTo: replyTo || 'info@divizyon.com',
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
