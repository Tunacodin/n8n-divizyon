// Circle.so API yazma helper'lari.
//
// KURAL: Circle'a YAZMA islemi SADECE is_protected=false (sheet'ten/basvurudan
// gelmis, henuz Circle'a katilmamis) kayitlarda yapilabilir. Mevcut Circle
// uyelerinde (is_protected=true) yazma yasaktir — CLAUDE.md.
//
// Tag yansima icin character-tags.ts kullanir.

const CIRCLE_KEY = process.env.Circle_API_KEY_V1 || process.env.Circle_API_KEY || ''
const CIRCLE_BASE = 'https://app.circle.so/api/v1'
const COMMUNITY_ID = Number(process.env.CIRCLE_COMMUNITY_ID || '405377')

export type CircleWriteResult = {
  ok: boolean
  status?: number
  error?: string
  body?: unknown
}

export function isCircleWriteEnabled(): boolean {
  return Boolean(CIRCLE_KEY)
}

async function circleRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<CircleWriteResult> {
  if (!CIRCLE_KEY) return { ok: false, error: 'Circle_API_KEY eksik' }

  try {
    const res = await fetch(`${CIRCLE_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Token ${CIRCLE_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'circle-dashboard/1.0',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    const text = await res.text()
    let parsed: unknown = null
    try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
    if (!res.ok) {
      return { ok: false, status: res.status, error: typeof parsed === 'string' ? parsed : `HTTP ${res.status}`, body: parsed }
    }
    return { ok: true, status: res.status, body: parsed }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/**
 * Bir Circle uyesine tag ekler. Tag id'leri Supabase member_tags tablosundan
 * cozulmelidir. Mevcut tag'leri korur, sadece ekler (set logic). Circle API
 * V1 community_members PUT endpoint'i member_tag_ids array'iyle replace
 * yaptigi icin, mevcut tag id'lerini de iceren tam set gondeririz.
 *
 * @param circleId Circle community_member.id
 * @param desiredTagIds Eklenecek tag id'leri (mevcutlara ek)
 * @param existingTagIds Uyenin halihazir sahip oldugu tag id'leri (Circle'dan cekilir veya cache'den)
 */
export async function addMemberTags(
  circleId: number,
  desiredTagIds: number[],
  existingTagIds: number[] = [],
): Promise<CircleWriteResult> {
  if (!circleId) return { ok: false, error: 'circle_id eksik' }
  if (desiredTagIds.length === 0) return { ok: true, status: 0, body: { skipped: 'desiredTagIds bos' } }

  const merged = Array.from(new Set([...existingTagIds, ...desiredTagIds]))

  return circleRequest(
    'PUT',
    `/community_members/${circleId}?community_id=${COMMUNITY_ID}`,
    { member_tag_ids: merged },
  )
}

/**
 * Bir uyenin guncel Circle tag id'lerini ceker. Detail endpoint'i member_tags
 * dizisini icerir (sync-circle-tags.py:fetch_member_detail ile ayni).
 */
export async function getMemberTagIds(circleId: number): Promise<number[] | null> {
  const r = await circleRequest('GET', `/community_members/${circleId}?community_id=${COMMUNITY_ID}`)
  if (!r.ok || !r.body || typeof r.body !== 'object') return null
  const tags = (r.body as { member_tags?: Array<{ id?: number }> }).member_tags || []
  return tags.map((t) => t.id).filter((x): x is number => typeof x === 'number')
}
