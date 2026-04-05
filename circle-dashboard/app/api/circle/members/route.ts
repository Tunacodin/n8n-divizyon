import { NextResponse } from 'next/server'

const CIRCLE_API_KEY = process.env.Circle_API_KEY || ''
const CIRCLE_BASE = 'https://app.circle.so/api/v1'

interface CircleMember {
  id: number
  name: string
  first_name?: string
  last_name?: string
  email: string
  avatar_url?: string
  headline?: string
  bio?: string
  created_at: string
  last_seen_at?: string
  public_uid?: string
  is_admin?: boolean
  is_moderator?: boolean
  roles?: string[]
}

async function circleGet(path: string) {
  const res = await fetch(`${CIRCLE_BASE}${path}`, {
    headers: {
      Authorization: `Token ${CIRCLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Circle API ${res.status}: ${text}`)
  }
  return res.json()
}

async function getCommunityId(): Promise<number> {
  // Env'den geliyorsa direkt kullan
  if (process.env.CIRCLE_COMMUNITY_ID) {
    return Number(process.env.CIRCLE_COMMUNITY_ID)
  }
  // Yoksa communities listesinden ilkini al
  const data = await circleGet('/communities')
  const communities = Array.isArray(data) ? data : data.communities || data.records || []
  if (!communities.length) throw new Error('Circle: topluluk bulunamadı')
  return communities[0].id
}

async function fetchAllMembers(communityId: number): Promise<CircleMember[]> {
  const all: CircleMember[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const data = await circleGet(
      `/community_members?community_id=${communityId}&per_page=${perPage}&page=${page}&sort=created_at&sort_direction=desc`
    )

    const records: CircleMember[] = Array.isArray(data)
      ? data
      : data.community_members || data.records || []

    if (records.length === 0) break

    all.push(...records)

    // Tam perPage geldiyse sonraki sayfa olabilir, dene
    // Daha az geldiyse son sayfadayız
    if (records.length < perPage) break

    page++
    if (page > 50) break // güvenlik sınırı (5000 üye)
  }

  return all
}

export async function GET(req: Request) {
  if (!CIRCLE_API_KEY) {
    return NextResponse.json({ success: false, error: 'Circle API key eksik' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  try {
    const communityId = await getCommunityId()
    let members = await fetchAllMembers(communityId)

    // Sunucu tarafında arama filtresi
    if (search) {
      const q = search.toLowerCase()
      members = members.filter((m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.headline || '').toLowerCase().includes(q)
      )
    }

    const formatted = members.map((m) => ({
      id: m.id,
      name: m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
      email: m.email,
      avatar_url: m.avatar_url || null,
      headline: m.headline || '',
      bio: m.bio || '',
      is_admin: m.is_admin || false,
      is_moderator: m.is_moderator || false,
      joined_at: m.created_at,
      last_seen_at: m.last_seen_at || null,
      public_uid: m.public_uid || null,
      roles: m.roles || [],
    }))

    return NextResponse.json({
      success: true,
      community_id: communityId,
      total: formatted.length,
      members: formatted,
    })
  } catch (error: any) {
    console.error('Circle API error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
