import { PrismaClient } from '@prisma/client'
import { webcrypto } from 'node:crypto'

const prisma = new PrismaClient()

type Role = 'admin' | 'evaluator' | 'viewer'

const SAMPLE_USERS: Array<{ email: string; password: string; role: Role }> = [
  { email: 'admin@divizyon.org',     password: 'Admin1234!',     role: 'admin' },
  { email: 'evaluator@divizyon.org', password: 'Evaluator1234!', role: 'evaluator' },
  { email: 'viewer@divizyon.org',    password: 'Viewer1234!',    role: 'viewer' },
]

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return Buffer.from(s, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function hashPassword(pw: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await webcrypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  )
  return b64url(new Uint8Array(bits))
}

async function main() {
  console.log('--- Örnek admin kullanıcıları seed ediliyor ---')
  for (const u of SAMPLE_USERS) {
    const email = u.email.trim().toLowerCase()
    const salt = b64url(webcrypto.getRandomValues(new Uint8Array(16)))
    const passwordHash = await hashPassword(u.password, salt)

    const user = await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash, passwordSalt: salt, role: u.role },
      create: { email, passwordHash, passwordSalt: salt, role: u.role },
    })
    console.log(`  ${user.email}  rol=${user.role}  sifre=${u.password}`)
  }
  console.log('--- Bitti ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
