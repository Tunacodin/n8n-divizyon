import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Circle admin token (V1 sheet endpoint'leri için)
const CIRCLE_KEY = process.env.Circle_API_KEY_V1 || process.env.Circle_API_KEY || ''
const CIRCLE_BASE = 'https://app.circle.so/api/v1'
const COMMUNITY_ID = Number(process.env.CIRCLE_COMMUNITY_ID || '405377')

async function circleGet<T = any>(path: string): Promise<T> {
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
  // Aktivite alanları
  active?: boolean
  activity_score?: unknown  // number | {} | null — Circle tutarsız döner
  last_seen_at?: string
  profile_confirmed_at?: string
  accepted_invitation?: string
  posts_count?: unknown
  comments_count?: unknown
  topics_count?: unknown
}

// Türkçe tarih 'DD.MM.YYYY' → ISO string
function trDateToIso(raw: unknown): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  const m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/)
  if (!m) return null
  const [, d, mo, y] = m
  const dt = new Date(Number(y), Number(mo) - 1, Number(d))
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10)
}

// Circle'dan gelen alanlardan applications için zenginleştirme
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

  // Circle profile_fields → applications kolonlarına map
  const birthRaw = asString(flat.dogumtarihi) || asString(flat.birth_date)
  const birthIso = birthRaw ? trDateToIso(birthRaw) : null

  return {
    // Profil ve sosyal (mevcut)
    avatar_url: m.avatar_url || null,
    bio: m.bio || asString(flat.bio) || null,
    location: m.location || asString(flat.location) || null,
    linkedin_url: m.linkedin_url || asString(flat.linkedin_url) || null,
    instagram_url: m.instagram_url || null,
    website_url: m.website_url || asString(flat.website) || null,
    circle_headline: m.headline || asString(flat.headline) || null,
    // Aktivite (yeni) — Circle bazı sayısal alanları {} olarak dönüyor, güvenli cast
    activity_score: asInt(m.activity_score),
    last_seen_at: m.last_seen_at || null,
    profile_confirmed_at: m.profile_confirmed_at || null,
    accepted_invitation_at: m.accepted_invitation
      ? new Date(m.accepted_invitation.replace(' UTC', 'Z').replace(' ', 'T')).toISOString()
      : null,
    circle_active: m.active ?? null,
    circle_posts_count: asInt(m.posts_count) ?? 0,
    circle_comments_count: asInt(m.comments_count) ?? 0,
    circle_topics_count: asInt(m.topics_count) ?? 0,
    // Profil alanları (ayrı kolonlar — başvurudan gelenleri override etme)
    circle_company: asString(flat.company) || null,
    circle_disciplines: asArray(flat.disiplin),
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
      `/community_members?community_id=${COMMUNITY_ID}&per_page=100&page=${p}`
    )
    const recs = Array.isArray(data) ? data : data.community_members || []
    if (!recs.length) break
    out.push(...recs)
    if (recs.length < 100) break
  }
  return out
}

// POST /api/circle-sync — n8n cron buraya vurur
// Yeni Circle üyelerini yakalar, applications'a yazar.
// Email match var (başvuru sheet'ten geldi) → circle_existing_match, mevcut status korunur
// Email match yok → etkinlik + circle_event
export async function POST(req: Request) {
  if (!CIRCLE_KEY) {
    return NextResponse.json({ success: false, error: 'Circle_API_KEY eksik' }, { status: 500 })
  }

  // Basit shared secret guard (opsiyonel)
  const authHeader = req.headers.get('x-sync-secret')
  const expected = process.env.CIRCLE_SYNC_SECRET
  if (expected && authHeader !== expected) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  const db = createClient()

  try {
    const members = await fetchAllMembers()

    // Mevcut circle_id'leri al — idempotent sync
    const { data: existing } = await db
      .from('applications')
      .select('circle_id')
      .not('circle_id', 'is', null)
    const existingIds = new Set((existing || []).map((r: { circle_id: number }) => r.circle_id))

    // Applications email map (applications.is_protected=false olanlar = başvurudan gelmiş)
    const { data: existingApps } = await db
      .from('applications')
      .select('id, email')
      .eq('is_protected', false)
    const byEmail = new Map<string, string>()
    for (const a of existingApps || []) {
      const e = (a.email || '').toLowerCase().trim()
      if (e) byEmail.set(e, a.id)
    }

    let matchedExisting = 0
    let insertedEvent = 0
    let enrichedExisting = 0
    const errors: string[] = []

    for (const m of members) {
      if (!m.id) continue

      // Zaten sync edilmiş → sadece enrichment'ı güncelle (avatar/bio/location vs.)
      if (existingIds.has(m.id)) {
        const enrichment = enrichFromMember(m)
        const hasAnyValue = Object.values(enrichment).some(v => v != null)
        if (hasAnyValue) {
          const { error } = await db
            .from('applications')
            .update(enrichment)
            .eq('circle_id', m.id)
          if (error) errors.push(`enrich ${m.id}: ${error.message}`)
          else enrichedExisting++
        }
        continue
      }

      const email = (m.email || '').toLowerCase().trim()
      const name = m.name || `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || '(Circle üyesi)'

      const enrichment = enrichFromMember(m)

      if (email && byEmail.has(email)) {
        const appId = byEmail.get(email)!
        const { error } = await db
          .from('applications')
          .update({
            is_protected: true,
            circle_id: m.id,
            protected_source: 'circle_existing_match',
            ...enrichment,
          })
          .eq('id', appId)
        if (error) errors.push(`update ${appId}: ${error.message}`)
        else matchedExisting++
      } else {
        const { error } = await db.from('applications').insert({
          email: email || `circle-${m.id}@no-email.local`,
          full_name: name,
          status: 'etkinlik',
          is_protected: true,
          circle_id: m.id,
          protected_source: 'circle_event',
          source: 'circle',
          submitted_at: m.created_at || new Date().toISOString(),
          ...enrichment,
        })
        if (error) errors.push(`insert ${m.id}: ${error.message}`)
        else insertedEvent++
      }
    }

    return NextResponse.json({
      success: true,
      total_circle_members: members.length,
      already_synced: existingIds.size,
      enriched_existing: enrichedExisting,
      matched_existing: matchedExisting,
      inserted_event: insertedEvent,
      errors,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'bilinmeyen'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// GET — durum gözlemi
export async function GET() {
  const db = createClient()
  const { data } = await db
    .from('applications')
    .select('protected_source, status')
    .eq('is_protected', true)
  const counts: Record<string, number> = {}
  for (const r of data || []) {
    const k = `${(r as any).protected_source}/${(r as any).status}`
    counts[k] = (counts[k] || 0) + 1
  }
  return NextResponse.json({ success: true, counts })
}
