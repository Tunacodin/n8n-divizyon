// Karakteristik envanter test skoru (scores JSONB) → Circle member_tag ismi eşlemesi
// 18 kişilik özelliği → Circle'daki tag adı (member_tags.name ile eşleşir)

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

import type { createClient } from './supabase'

/**
 * Kullanıcının karakteristik envanter skorlarından, Circle'da en az kullanılan
 * "ağır bastığı" özelliği seçip applications.tags'a ekler.
 *
 * Algoritma:
 *  1. inventory_tests.scores (karakteristik_envanter) → 18 özellik skoru
 *  2. En yüksek N (TOP=5) özelliği seç
 *  3. Her birini CHARACTER_TAG_MAP'ten Circle tag adına çevir
 *  4. member_tags.tagged_members_count en düşük olanı seç
 *  5. applications.tags dizisine ekle (zaten varsa dokunma)
 *
 * Dönüş: { assigned: string | null, reason: string }
 */
export async function autoAssignCharacterTag(
  db: ReturnType<typeof createClient>,
  applicationId: string,
  opts: { topN?: number } = {},
): Promise<{ assigned: string | null; reason: string; candidates?: Array<{ tag: string; score: number; count: number }> }> {
  const topN = opts.topN ?? 5

  // 1) Mevcut tags (zaten kullanıcıya atanmış olanları aday listeden çıkar)
  const { data: app } = await db
    .from('applications')
    .select('tags')
    .eq('id', applicationId)
    .single()
  const existingTags = new Set<string>((app as { tags?: string[] } | null)?.tags || [])

  // 2) Karakteristik envanter scores
  const { data: invs } = await db
    .from('inventory_tests')
    .select('scores')
    .eq('application_id', applicationId)
    .eq('test_type', 'karakteristik_envanter')
    .order('submitted_at', { ascending: false })
    .limit(1)

  const scores = (invs?.[0] as { scores?: Record<string, unknown> } | undefined)?.scores
  if (!scores || typeof scores !== 'object') {
    return { assigned: null, reason: 'Karakteristik envanter skoru yok — tag atanamaz' }
  }

  // 3) Top N özellik
  const entries = Object.entries(scores)
    .map(([k, v]) => ({ key: k, score: typeof v === 'number' ? v : Number(v) || 0 }))
    .filter((e) => e.score > 0 && CHARACTER_TAG_MAP[e.key])
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)

  if (entries.length === 0) {
    return { assigned: null, reason: 'Anlamlı skor yok' }
  }

  // 4) Tag adları + Circle'daki count bilgisi
  const tagNames = entries.map((e) => CHARACTER_TAG_MAP[e.key])
  const { data: tagRows } = await db
    .from('member_tags')
    .select('name, tagged_members_count')
    .in('name', tagNames)

  const countByName = new Map<string, number>()
  for (const r of (tagRows || []) as Array<{ name: string; tagged_members_count: number }>) {
    countByName.set(r.name, r.tagged_members_count ?? 0)
  }

  // 5) Aday: mevcutta olmayan + Circle count'u en düşük + skoru en yüksek
  const candidates = entries
    .map((e) => ({
      tag: CHARACTER_TAG_MAP[e.key],
      score: e.score,
      count: countByName.get(CHARACTER_TAG_MAP[e.key]) ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((c) => !existingTags.has(c.tag))

  if (candidates.length === 0) {
    return { assigned: null, reason: 'Tüm aday tag\'ler zaten atanmış', candidates: entries.map((e) => ({ tag: CHARACTER_TAG_MAP[e.key], score: e.score, count: countByName.get(CHARACTER_TAG_MAP[e.key]) ?? 0 })) }
  }

  // En az Circle sayısı olan; eşitlik durumunda en yüksek kullanıcı skoru
  candidates.sort((a, b) => (a.count - b.count) || (b.score - a.score))
  const chosen = candidates[0]

  // 6) applications.tags'a ekle
  const seen = new Set<string>()
  const newTags: string[] = []
  existingTags.forEach((t) => { if (!seen.has(t)) { seen.add(t); newTags.push(t) } })
  if (!seen.has(chosen.tag)) newTags.push(chosen.tag)
  const { error } = await db
    .from('applications')
    .update({ tags: newTags })
    .eq('id', applicationId)

  if (error) {
    return { assigned: null, reason: `DB update hata: ${error.message}`, candidates }
  }

  return { assigned: chosen.tag, reason: `Skor=${chosen.score}, Circle üye sayısı=${chosen.count}`, candidates }
}
