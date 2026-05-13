import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CIRCLE_KEY = process.env.Circle_API_KEY_V1 || process.env.Circle_API_KEY || ''
const CIRCLE_BASE = 'https://app.circle.so/api/v1'
const COMMUNITY_ID = Number(process.env.CIRCLE_COMMUNITY_ID || '405377')

async function circleGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${CIRCLE_BASE}${path}`, {
    headers: { Authorization: `Token ${CIRCLE_KEY}`, 'User-Agent': 'circle-sync/1.0' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Circle ${res.status}: ${await res.text()}`)
  return res.json()
}

type CircleMember = {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  created_at?: string
  avatar_url?: string
  bio?: string
  headline?: string
  location?: string
  linkedin_url?: string
  instagram_url?: string
  website_url?: string
  flattened_profile_fields?: Record<string, unknown>
  active?: boolean
  activity_score?: unknown
  last_seen_at?: string
  profile_confirmed_at?: string
  accepted_invitation?: string
  posts_count?: unknown
  comments_count?: unknown
  topics_count?: unknown
}

function trDateToIso(raw: unknown): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  const m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/)
  if (!m) return null
  const [, d, mo, y] = m
  const dt = new Date(Number(y), Number(mo) - 1, Number(d))
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10)
}

function enrichFromMember(m: CircleMember) {
  const flat = (m.flattened_profile_fields || {}) as Record<string, unknown>
  const asString = (v: unknown): string | null => {
    if (v == null) return null
    const s = typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : String(v)
    return s.trim() || null
  }
  const asArray = (v: unknown): string[] | null => {
    if (!v) return null
    if (Array.isArray(v)) return v.map(String).filter(Boolean)
    const s = asString(v)
    return s ? [s] : null
  }
  const asInt = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Math.trunc(Number(v))
    return null
  }

  const birthRaw = asString(flat.dogumtarihi) || asString(flat.birth_date)
  void trDateToIso(birthRaw) // birthIso parsed but not stored separately

  return {
    avatar_url: m.avatar_url || null,
    bio: m.bio || asString(flat.bio) || null,
    location: m.location || asString(flat.location) || null,
    linkedin_url: m.linkedin_url || asString(flat.linkedin_url) || null,
    instagram_url: m.instagram_url || null,
    website_url: m.website_url || asString(flat.website) || null,
    circle_headline: m.headline || asString(flat.headline) || null,
    activity_score: asInt(m.activity_score),
    last_seen_at: m.last_seen_at ? new Date(m.last_seen_at) : null,
    profile_confirmed_at: m.profile_confirmed_at ? new Date(m.profile_confirmed_at) : null,
    accepted_invitation_at: m.accepted_invitation
      ? new Date(m.accepted_invitation.replace(' UTC', 'Z').replace(' ', 'T'))
      : null,
    circle_active: m.active ?? null,
    circle_posts_count: asInt(m.posts_count) ?? 0,
    circle_comments_count: asInt(m.comments_count) ?? 0,
    circle_topics_count: asInt(m.topics_count) ?? 0,
    circle_company: asString(flat.company) || null,
    circle_disciplines: asArray(flat.disiplin) || [],
    circle_birth_date: birthRaw || null,
    circle_university: asString(flat.universite) || null,
    circle_department: asString(flat.bolum) || null,
    circle_phone: asString(flat.telefon_numarasi) || null,
  }
}

async function fetchAllMembers(): Promise<CircleMember[]> {
  const out: CircleMember[] = []
  for (let p = 1; p < 50; p++) {
    const data = await circleGet<CircleMember[] | { community_members?: CircleMember[] }>(
      `/community_members?community_id=${COMMUNITY_ID}&per_page=100&page=${p}`,
    )
    const recs = Array.isArray(data) ? data : data.community_members || []
    if (!recs.length) break
    out.push(...recs)
    if (recs.length < 100) break
  }
  return out
}

// POST /api/circle-sync
export async function POST(req: Request) {
  if (!CIRCLE_KEY) {
    return NextResponse.json({ success: false, error: 'Circle_API_KEY eksik' }, { status: 500 })
  }

  const authHeader = req.headers.get('x-sync-secret')
  const expected = process.env.CIRCLE_SYNC_SECRET
  if (expected && authHeader !== expected) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const members = await fetchAllMembers()

    const existing = await prisma.applications.findMany({
      where: { circle_id: { not: null } },
      select: { circle_id: true },
    })
    const existingIds = new Set(existing.map((r) => r.circle_id).filter((v) => v != null) as number[])

    const existingApps = await prisma.applications.findMany({
      where: { is_protected: false },
      select: { id: true, email: true },
    })
    const byEmail = new Map<string, string>()
    for (const a of existingApps) {
      const e = (a.email || '').toLowerCase().trim()
      if (e) byEmail.set(e, a.id)
    }

    let matchedExisting = 0
    let insertedEvent = 0
    let enrichedExisting = 0
    let markedRemoved = 0
    let unmarkedRemoved = 0
    const errors: string[] = []
    const seenCircleIds = new Set<number>()
    const syncStartedAt = new Date()

    for (const m of members) {
      if (!m.id) continue
      seenCircleIds.add(m.id)

      if (existingIds.has(m.id)) {
        const enrichment = enrichFromMember(m)
        const updates = {
          ...enrichment,
          circle_last_seen_in_sync_at: syncStartedAt,
          circle_removed_at: null,
        }
        try {
          await prisma.applications.updateMany({
            where: { circle_id: m.id },
            data: updates as never,
          })
          enrichedExisting++
        } catch (e: unknown) {
          errors.push(`enrich ${m.id}: ${(e as Error).message}`)
        }
        continue
      }

      const email = (m.email || '').toLowerCase().trim()
      const name = m.name || `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || '(Circle üyesi)'

      const enrichment = enrichFromMember(m)

      if (email && byEmail.has(email)) {
        const appId = byEmail.get(email)!
        try {
          await prisma.applications.update({
            where: { id: appId },
            data: {
              is_protected: true,
              circle_id: m.id,
              protected_source: 'circle_existing_match',
              ...enrichment,
            } as never,
          })
          matchedExisting++
        } catch (e: unknown) {
          errors.push(`update ${appId}: ${(e as Error).message}`)
        }
      } else {
        try {
          await prisma.applications.create({
            data: {
              email: email || `circle-${m.id}@no-email.local`,
              full_name: name,
              status: 'etkinlik',
              is_protected: true,
              circle_id: m.id,
              protected_source: 'circle_event',
              source: 'circle',
              submitted_at: m.created_at ? new Date(m.created_at) : new Date(),
              ...enrichment,
            } as never,
          })
          insertedEvent++
        } catch (e: unknown) {
          errors.push(`insert ${m.id}: ${(e as Error).message}`)
        }
      }
    }

    if (members.length >= 50) {
      const protectedAll = await prisma.applications.findMany({
        where: { is_protected: true, circle_id: { not: null } },
        select: { id: true, circle_id: true, circle_removed_at: true },
      })

      const toMarkRemoved: string[] = []
      const toUnmark: string[] = []

      for (const r of protectedAll) {
        if (!r.circle_id) continue
        if (!seenCircleIds.has(r.circle_id) && !r.circle_removed_at) {
          toMarkRemoved.push(r.id)
        } else if (seenCircleIds.has(r.circle_id) && r.circle_removed_at) {
          toUnmark.push(r.id)
        }
      }

      if (toMarkRemoved.length > 0) {
        try {
          await prisma.applications.updateMany({
            where: { id: { in: toMarkRemoved } },
            data: { circle_removed_at: syncStartedAt },
          })
          markedRemoved = toMarkRemoved.length
        } catch (e: unknown) {
          errors.push(`mark_removed: ${(e as Error).message}`)
        }
      }
      if (toUnmark.length > 0) {
        try {
          await prisma.applications.updateMany({
            where: { id: { in: toUnmark } },
            data: { circle_removed_at: null },
          })
          unmarkedRemoved = toUnmark.length
        } catch (e: unknown) {
          errors.push(`unmark_removed: ${(e as Error).message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_circle_members: members.length,
      already_synced: existingIds.size,
      enriched_existing: enrichedExisting,
      matched_existing: matchedExisting,
      inserted_event: insertedEvent,
      marked_removed: markedRemoved,
      unmarked_removed: unmarkedRemoved,
      errors,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'bilinmeyen'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// GET — durum gözlemi
export async function GET() {
  const data = await prisma.applications.findMany({
    where: { is_protected: true },
    select: { protected_source: true, status: true },
  })
  const counts: Record<string, number> = {}
  for (const r of data) {
    const k = `${r.protected_source}/${r.status}`
    counts[k] = (counts[k] || 0) + 1
  }
  return NextResponse.json({ success: true, counts })
}
