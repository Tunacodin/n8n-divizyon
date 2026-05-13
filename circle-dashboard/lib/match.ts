import { prisma } from './prisma'

const TR_MAP: Record<string, string> = {
  'ç': 'c', 'Ç': 'c',
  'ğ': 'g', 'Ğ': 'g',
  'ı': 'i', 'İ': 'i',
  'ö': 'o', 'Ö': 'o',
  'ş': 's', 'Ş': 's',
  'ü': 'u', 'Ü': 'u',
}

export function normalizeName(input: string | null | undefined): string {
  if (!input) return ''
  const lowered = input.toLowerCase()
  const mapped = lowered.replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => TR_MAP[ch] ?? ch)
  return mapped.trim().replace(/\s+/g, ' ')
}

export function isNameMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  return na.length > 0 && na === nb
}

export type MatchResult = {
  application: { id: string; email: string; full_name: string; status?: string } | null
  matchedBy: 'email' | 'name' | null
  ambiguous?: boolean
}

const ACTIVE_PRIORITY = ['kesin_kabul', 'nihai_olmayan', 'kontrol', 'basvuru']

function pickBest<T extends { status?: string; created_at?: Date | string | null }>(rows: T[]): T | null {
  if (!rows || rows.length === 0) return null
  if (rows.length === 1) return rows[0]
  for (const s of ACTIVE_PRIORITY) {
    const matches = rows.filter((r) => r.status === s)
    if (matches.length > 0) {
      return matches.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
    }
  }
  return [...rows].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
}

export async function findApplication(input: { email?: string | null; fullName?: string | null }): Promise<MatchResult> {
  const email = input.email?.toLowerCase().trim()
  const fullName = input.fullName?.trim()

  if (email) {
    const rows = await prisma.applications.findMany({
      where: { email },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: { id: true, email: true, full_name: true, status: true, created_at: true },
    })

    if (rows.length > 0) {
      const best = pickBest(rows)
      if (best) {
        return {
          application: best as { id: string; email: string; full_name: string; status?: string },
          matchedBy: 'email',
          ambiguous: rows.length > 1,
        }
      }
    }
  }

  if (fullName) {
    const normalized = normalizeName(fullName)
    if (!normalized) return { application: null, matchedBy: null }

    const candidates = await prisma.applications.findMany({
      where: { full_name: { contains: fullName.split(/\s+/)[0], mode: 'insensitive' } },
      take: 50,
      select: { id: true, email: true, full_name: true, status: true, created_at: true },
    })

    const matched = candidates.filter((a) => normalizeName(a.full_name) === normalized)
    if (matched.length > 0) {
      const best = pickBest(matched)
      if (best) {
        return {
          application: best as { id: string; email: string; full_name: string; status?: string },
          matchedBy: 'name',
          ambiguous: matched.length > 1,
        }
      }
    }
  }

  return { application: null, matchedBy: null }
}
