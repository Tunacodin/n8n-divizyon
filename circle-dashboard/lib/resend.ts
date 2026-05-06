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

// Transient (retry-edilebilir) sayilan hatalar: ag/timeout/5xx/rate-limit.
// Permanent (4xx auth, validation, 422 invalid recipient) hatalar retry edilmez.
function isTransientError(err: unknown): boolean {
  const e = err as { name?: string; statusCode?: number; status?: number; message?: string }
  const status = e?.statusCode ?? e?.status
  if (status && (status === 408 || status === 429 || status >= 500)) return true
  const msg = (e?.message || '').toLowerCase()
  if (e?.name === 'AbortError') return true
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('etimedout')) return true
  if (msg.includes('network') || msg.includes('fetch failed') || msg.includes('socket hang up')) return true
  return false
}

const RETRY_DELAYS_MS = [500, 1500, 4000] // toplam 3 deneme (ilk + 3 retry'den oncesi degisken)

export async function sendMail({ to, subject, html, replyTo }: SendMailOptions) {
  const resend = getResend()

  let lastErr: unknown = null
  let attempt = 0
  const totalAttempts = RETRY_DELAYS_MS.length + 1

  while (attempt < totalAttempts) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        replyTo: replyTo || 'info@divizyon.com',
      })

      if (error) {
        // Resend SDK error: statusCode varsa onu kullan
        const wrapped = Object.assign(new Error(error.message), {
          statusCode: (error as { statusCode?: number }).statusCode,
          name: (error as { name?: string }).name,
        })
        throw wrapped
      }

      return data
    } catch (err) {
      lastErr = err
      if (!isTransientError(err) || attempt >= RETRY_DELAYS_MS.length) {
        break
      }
      // Exponential-ish backoff + jitter
      const base = RETRY_DELAYS_MS[attempt]
      const jitter = Math.floor(Math.random() * 200)
      await new Promise((r) => setTimeout(r, base + jitter))
      attempt++
    }
  }

  const e = lastErr as Error
  throw new Error(e?.message || 'Mail gonderim hatasi')
}
