import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CIRCLE_API_KEY = process.env.Circle_API_KEY || ''
const CIRCLE_BASE = 'https://app.circle.so/api/v1'

async function circleGet(path: string) {
  const res = await fetch(`${CIRCLE_BASE}${path}`, {
    headers: { Authorization: `Token ${CIRCLE_API_KEY}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Circle API ${res.status}`)
  return res.json()
}

async function getCommunityId(): Promise<number> {
  if (process.env.CIRCLE_COMMUNITY_ID) return Number(process.env.CIRCLE_COMMUNITY_ID)
  const data = await circleGet('/communities')
  const communities = Array.isArray(data) ? data : data.communities || data.records || []
  if (!communities.length) throw new Error('Topluluk bulunamadı')
  return communities[0].id
}

interface CircleMemberRaw {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  avatar_url?: string
  created_at?: string
  last_seen_at?: string
}

async function fetchAllMembers(communityId: number): Promise<CircleMemberRaw[]> {
  const all: CircleMemberRaw[] = []
  let page = 1
  while (true) {
    const data = await circleGet(`/community_members?community_id=${communityId}&per_page=100&page=${page}`)
    const records = Array.isArray(data) ? data : data.community_members || data.records || []
    if (records.length === 0) break
    all.push(...records)
    if (records.length < 100) break
    page++
    if (page > 50) break
  }
  return all
}

// GET /api/circle/compare
export async function GET() {
  if (!CIRCLE_API_KEY) {
    return NextResponse.json({ success: false, error: 'Circle API key eksik' }, { status: 500 })
  }

  try {
    const communityId = await getCommunityId()

    const [circleMembers, dbApps] = await Promise.all([
      fetchAllMembers(communityId),
      prisma.applications.findMany({ select: { email: true, full_name: true, status: true } }),
    ])

    const dbEmails = new Set(
      dbApps.map((a) => a.email?.toLowerCase().trim()).filter(Boolean) as string[],
    )
    const dbByEmail = new Map(
      dbApps
        .map((a) => [a.email?.toLowerCase().trim(), a] as const)
        .filter(([k]) => !!k) as Array<[string, { email: string; full_name: string; status: string }]>,
    )

    const basvurudan: Array<Record<string, unknown>> = []
    const circleOnly: Array<Record<string, unknown>> = []

    for (const m of circleMembers) {
      const email = (m.email || '').toLowerCase().trim()
      const formatted = {
        circle_id: m.id,
        name: m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
        email,
        avatar_url: m.avatar_url || null,
        joined_at: m.created_at,
        last_seen_at: m.last_seen_at || null,
      }

      if (email && dbEmails.has(email)) {
        const dbRecord = dbByEmail.get(email)
        basvurudan.push({
          ...formatted,
          source: 'basvuru',
          db_status: dbRecord?.status || null,
          db_name: dbRecord?.full_name || null,
        })
      } else {
        circleOnly.push({ ...formatted, source: 'circle' })
      }
    }

    return NextResponse.json({
      success: true,
      total_circle: circleMembers.length,
      total_basvuru: basvurudan.length,
      total_circle_only: circleOnly.length,
      basvurudan,
      circleOnly,
      etkinlikten: circleOnly,
      total_etkinlik: circleOnly.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
