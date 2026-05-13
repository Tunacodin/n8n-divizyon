// Karakteristik envanter test skoru → Circle persona tag'leri (leaf + parent).
// Nihai üye geçişinde otomatik çağrılır. Kurallar: TAG_ASSIGNMENT_RULES.md

import { prisma } from './prisma'

export const CHARACTER_TAG_MAP: Record<string, string> = {
  birlestirici:    'Birleştirici',
  caliskan:        'Çalışkan',
  canli:           'Canlı',
  challenger:      'Challenger',
  cozumcu:         'Çözümcü',
  gelecek_odakli:  'Gelecek Odaklı',
  geleneksel:      'Geleneksel',
  gozlemci:        'Gözlemci',
  ilham_verici:    'İlham Verici',
  inovatif:        'İnovatif',
  kendinden_emin:  'Kendinden Emin',
  mantikli:        'Mantıklı',
  pratik:          'Pratik',
  sistemli:        'Sistemli',
  tecrubeli:       'Tecrübeli',
  titiz:           'Titiz',
  tutkulu:         'Tutkulu',
  yaratici:        'Yaratıcı',
}

export const PARENT_MAP: Record<string, string> = {
  'Birleştirici':    'Öncü',
  'Pratik':          'Öncü',
  'Sistemli':        'Öncü',
  'İlham Verici':    'Öncü',
  'Tecrübeli':       'Öncü',
  'Challenger':      'Meydan Okuyan',
  'Mantıklı':        'Meydan Okuyan',
  'Tutkulu':         'Meydan Okuyan',
  'Yaratıcı':        'Zihin Kaşifi',
  'İnovatif':        'Zihin Kaşifi',
  'Geleneksel':      'Zihin Kaşifi',
  'Çalışkan':        'Hedef Takipçisi',
  'Titiz':           'Hedef Takipçisi',
  'Çözümcü':         'Hedef Takipçisi',
  'Gözlemci':        'Gözcü',
  'Kendinden Emin':  'Gözcü',
  'Canlı':           'Gözcü',
  'Gelecek Odaklı':  'Gözcü',
}

export type TagCandidate = { tag: string; score: number; count: number }

export type CircleSyncStatus = 'skipped_protected' | 'skipped_no_circle_id' | 'skipped_disabled' | 'ok' | 'partial' | 'failed'

export type AutoAssignResult = {
  leaf: string | null
  parent: string | null
  added: string[]
  reason: string
  candidates?: TagCandidate[]
  circleSync?: {
    status: CircleSyncStatus
    addedTagIds?: number[]
    error?: string
  }
}

export function pickLeafAndParent(
  scores: Record<string, unknown>,
  counts: Record<string, number>,
  existing: Set<string>,
): { leaf: string | null; parent: string | null; reason: string; candidates: TagCandidate[] } {
  const leafScores = Object.entries(scores)
    .map(([k, v]) => ({ key: k, score: typeof v === 'number' ? v : Number(v) || 0 }))
    .filter((e) => e.score > 0 && CHARACTER_TAG_MAP[e.key])
    .map((e) => ({ tag: CHARACTER_TAG_MAP[e.key], score: e.score }))

  if (leafScores.length === 0) {
    return { leaf: null, parent: null, reason: 'Anlamli leaf skoru yok', candidates: [] }
  }

  const maxScore = Math.max(...leafScores.map((l) => l.score))
  const maxLeafs = leafScores.filter((l) => l.score === maxScore)
  const availableMaxLeafs = maxLeafs.filter((l) => !existing.has(l.tag))

  const buildCandidates = (ls: Array<{ tag: string; score: number }>): TagCandidate[] =>
    ls.map((l) => ({
      tag: l.tag,
      score: l.score,
      count: counts[l.tag] ?? Number.MAX_SAFE_INTEGER,
    }))

  if (availableMaxLeafs.length === 0) {
    return {
      leaf: null,
      parent: null,
      reason: "Max skorlu tum leaf'ler kullanicida zaten var",
      candidates: buildCandidates(maxLeafs),
    }
  }

  const candidates = buildCandidates(availableMaxLeafs)
  candidates.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count
    return a.tag.localeCompare(b.tag, 'tr')
  })
  const chosen = candidates[0]
  const parent = PARENT_MAP[chosen.tag] ?? null
  const detail = candidates.length > 1 ? ` (${candidates.length} aday arasindan)` : ''
  return {
    leaf: chosen.tag,
    parent,
    reason: `Skor=${chosen.score}, count=${chosen.count}${detail}`,
    candidates,
  }
}

export async function autoAssignCharacterTag(applicationId: string): Promise<AutoAssignResult> {
  const app = await prisma.applications.findUnique({
    where: { id: applicationId },
    select: { tags: true, is_protected: true, circle_id: true },
  })
  const existing = new Set<string>(app?.tags || [])
  const isProtected = !!app?.is_protected
  const circleId = app?.circle_id ?? null

  const inv = await prisma.inventory_tests.findFirst({
    where: { application_id: applicationId, test_type: 'karakteristik_envanter' },
    orderBy: { submitted_at: 'desc' },
    select: { scores: true },
  })

  const scores = inv?.scores as Record<string, unknown> | undefined
  if (!scores || typeof scores !== 'object') {
    return { leaf: null, parent: null, added: [], reason: 'Karakteristik envanter skoru yok' }
  }

  const allLeafNames = Object.keys(scores)
    .filter((k) => CHARACTER_TAG_MAP[k])
    .map((k) => CHARACTER_TAG_MAP[k])

  const counts: Record<string, number> = {}
  if (allLeafNames.length > 0) {
    const tagRows = await prisma.member_tags.findMany({
      where: { name: { in: allLeafNames } },
      select: { name: true, tagged_members_count: true },
    })
    for (const r of tagRows) counts[r.name] = r.tagged_members_count ?? 0
  }

  const pick = pickLeafAndParent(scores, counts, existing)
  if (!pick.leaf) {
    return { leaf: null, parent: null, added: [], reason: pick.reason, candidates: pick.candidates }
  }

  const added: string[] = []
  const seen = new Set<string>(existing)
  const newTags: string[] = Array.from(existing)
  if (!seen.has(pick.leaf)) { seen.add(pick.leaf); newTags.push(pick.leaf); added.push(pick.leaf) }
  if (pick.parent && !seen.has(pick.parent)) { seen.add(pick.parent); newTags.push(pick.parent); added.push(pick.parent) }

  if (added.length === 0) {
    return { leaf: pick.leaf, parent: pick.parent, added: [], reason: 'Leaf ve parent zaten atanmis', candidates: pick.candidates }
  }

  try {
    await prisma.applications.update({ where: { id: applicationId }, data: { tags: newTags } })
  } catch (e: unknown) {
    return { leaf: null, parent: null, added: [], reason: `DB update hata: ${(e as Error).message}`, candidates: pick.candidates }
  }

  const circleSync = await syncTagsToCircle({ isProtected, circleId, tagNames: added })

  return {
    leaf: pick.leaf,
    parent: pick.parent,
    added,
    reason: pick.reason,
    candidates: pick.candidates,
    circleSync,
  }
}

async function syncTagsToCircle(params: {
  isProtected: boolean
  circleId: number | null
  tagNames: string[]
}): Promise<AutoAssignResult['circleSync']> {
  if (params.isProtected) return { status: 'skipped_protected' }
  if (!params.circleId) return { status: 'skipped_no_circle_id' }
  if (params.tagNames.length === 0) return { status: 'ok', addedTagIds: [] }

  const { isCircleWriteEnabled, addMemberTags, getMemberTagIds } = await import('./circle')
  if (!isCircleWriteEnabled()) {
    return { status: 'skipped_disabled', error: 'Circle_API_KEY env yok' }
  }

  const tagRows = await prisma.member_tags.findMany({
    where: { name: { in: params.tagNames } },
    select: { id: true, name: true },
  })
  const desiredTagIds = tagRows.map((r) => r.id)
  const foundNames = new Set(tagRows.map((r) => r.name))
  const missing = params.tagNames.filter((n) => !foundNames.has(n))

  if (desiredTagIds.length === 0) {
    return {
      status: 'failed',
      error: `member_tags tablosunda tag id bulunamadi: ${params.tagNames.join(', ')}`,
    }
  }

  const existingIds = await getMemberTagIds(params.circleId)
  if (existingIds === null) {
    return { status: 'failed', error: 'Circle uyesi getirilemedi' }
  }

  const result = await addMemberTags(params.circleId, desiredTagIds, existingIds)
  if (!result.ok) {
    return { status: 'failed', error: result.error || `HTTP ${result.status}` }
  }

  return {
    status: missing.length > 0 ? 'partial' : 'ok',
    addedTagIds: desiredTagIds,
    error: missing.length > 0 ? `Eslesmeyen tag adlari: ${missing.join(', ')}` : undefined,
  }
}
