// Karakteristik envanter test skoru → Circle persona tag'leri (leaf + parent).
// Nihai üye geçişinde otomatik çağrılır. Kurallar: TAG_ASSIGNMENT_RULES.md

import type { createClient } from './supabase'

// Envanter scores anahtari → Circle leaf tag adi
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

// Leaf (Circle tag adi) → Parent (Circle tag adi). Deterministik tek esleme.
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

export type AutoAssignResult = {
  leaf: string | null
  parent: string | null
  added: string[]
  reason: string
  candidates?: TagCandidate[]
}

// Saf seçim mantigi — DB'siz test edilebilir
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

/**
 * Nihai üye geçişinde çağrılır. Max skor + (count min → alfabetik) algoritmasıyla
 * leaf tag seçer, parent'ını bulur, applications.tags'a ekler.
 */
export async function autoAssignCharacterTag(
  db: ReturnType<typeof createClient>,
  applicationId: string,
): Promise<AutoAssignResult> {
  const { data: app } = await db
    .from('applications')
    .select('tags')
    .eq('id', applicationId)
    .single()
  const existing = new Set<string>((app as { tags?: string[] } | null)?.tags || [])

  const { data: invs } = await db
    .from('inventory_tests')
    .select('scores')
    .eq('application_id', applicationId)
    .eq('test_type', 'karakteristik_envanter')
    .order('submitted_at', { ascending: false })
    .limit(1)

  const scores = (invs?.[0] as { scores?: Record<string, unknown> } | undefined)?.scores
  if (!scores || typeof scores !== 'object') {
    return { leaf: null, parent: null, added: [], reason: 'Karakteristik envanter skoru yok' }
  }

  // Max skorlu leaf adaylarinin count'unu al
  const allLeafNames = Object.keys(scores)
    .filter((k) => CHARACTER_TAG_MAP[k])
    .map((k) => CHARACTER_TAG_MAP[k])

  const counts: Record<string, number> = {}
  if (allLeafNames.length > 0) {
    const { data: tagRows } = await db
      .from('member_tags')
      .select('name, tagged_members_count')
      .in('name', allLeafNames)
    for (const r of (tagRows || []) as Array<{ name: string; tagged_members_count: number }>) {
      counts[r.name] = r.tagged_members_count ?? 0
    }
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

  const { error } = await db
    .from('applications')
    .update({ tags: newTags })
    .eq('id', applicationId)

  if (error) {
    return { leaf: null, parent: null, added: [], reason: `DB update hata: ${error.message}`, candidates: pick.candidates }
  }

  return {
    leaf: pick.leaf,
    parent: pick.parent,
    added,
    reason: pick.reason,
    candidates: pick.candidates,
  }
}
