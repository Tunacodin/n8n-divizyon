const SECRET = process.env.AUTH_SECRET || 'divizyon-dashboard-secret-2026'

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const raw = atob(s)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64url(new Uint8Array(sig))
}

export interface SessionPayload {
  email: string
  role: string
  mode: 'email' | 'circle_token'
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, iat: Date.now() })))
  const sig = await hmac(body)
  return `${body}.${sig}`
}

export function genSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return b64url(bytes)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return b64url(new Uint8Array(bits))
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt)
  if (actual.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  return diff === 0
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = await hmac(body)
  if (expected !== sig) return null
  try {
    const json = new TextDecoder().decode(b64urlDecode(body))
    const data = JSON.parse(json) as SessionPayload & { iat: number }
    if (Date.now() - (data.iat || 0) > 30 * 86400000) return null
    return { email: data.email, role: data.role, mode: data.mode }
  } catch {
    return null
  }
}
