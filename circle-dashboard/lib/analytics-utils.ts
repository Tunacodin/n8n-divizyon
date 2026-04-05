import { startOfMonth, format, subDays, parseISO, isValid } from 'date-fns'
import { tr } from 'date-fns/locale'

// ─── Date Parsing ────────────────────────────────────────────────────────────

export function parseDateFlexible(raw: any): Date | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s || s === '—') return null

  // DD.MM.YYYY HH:mm:ss or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (dmy) {
    const [, d, m, y, h = '0', min = '0', sec = '0'] = dmy
    const dt = new Date(+y, +m - 1, +d, +h, +min, +sec)
    if (isValid(dt)) return dt
  }

  // ISO / standard parseable
  try {
    const dt = new Date(s)
    if (isValid(dt) && dt.getFullYear() > 2000) return dt
  } catch { /* ignore */ }

  return null
}

// ─── Time Series ─────────────────────────────────────────────────────────────

export function buildTimeSeries(
  items: Record<string, any>[],
  dateField: string
): { date: string; count: number }[] {
  const counts: Record<string, number> = {}

  for (const item of items) {
    const raw = item[dateField] ?? item['Timestamp'] ?? item['timestamp'] ?? ''
    const dt = parseDateFlexible(raw)
    if (!dt) continue
    const key = format(startOfMonth(dt), 'yyyy-MM-01')
    counts[key] = (counts[key] ?? 0) + 1
  }

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export function buildCumulativeTimeSeries(
  series: { date: string; count: number }[]
): { date: string; count: number; cumulative: number }[] {
  let running = 0
  return series.map(p => {
    running += p.count
    return { ...p, cumulative: running }
  })
}

export function filterByPeriod<T extends { date: string }>(
  series: T[],
  period: '30gun' | '90gun' | '1yil' | 'tumu'
): T[] {
  if (period === 'tumu') return series
  const days = period === '30gun' ? 30 : period === '90gun' ? 90 : 365
  const cutoff = subDays(new Date(), days)
  return series.filter(p => new Date(p.date) >= cutoff)
}

// ─── Ret Sebebi ──────────────────────────────────────────────────────────────

export function classifyRetSebebi(row: Record<string, any>): '18yas' | 'toplulukIlkeleri' | 'diger' {
  if (row.sheet === '18 Yaş Altı') return '18yas'
  const not = String(row['Not'] ?? row['not'] ?? '').toLowerCase()
  if (not.includes('18') && (not.includes('yaş') || not.includes('yas'))) return '18yas'
  if (not.includes('topluluk')) return 'toplulukIlkeleri'
  return 'diger'
}

// ─── Disiplin ────────────────────────────────────────────────────────────────

const DISIPLIN_FIELD_CANDIDATES = [
  'Üretici Rolünü Tanımla',
  'Üretici Rolün',
  'Mesleğin / Alanın',
  'Mevcut profesyonel durumun',
  'Bölüm',
]

export function extractDisiplinler(
  basvuruRows: Record<string, any>[]
): { disiplin: string; count: number }[] {
  const counts: Record<string, number> = {}

  for (const row of basvuruRows) {
    let val = ''
    for (const field of DISIPLIN_FIELD_CANDIDATES) {
      if (row[field]) { val = String(row[field]).trim(); break }
    }
    if (!val) continue
    // Take first value if multiple comma/newline separated
    val = val.split(/[,\n]/)[0].trim()
    if (val.length > 1) counts[val] = (counts[val] ?? 0) + 1
  }

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([disiplin, count]) => ({ disiplin, count }))
}

// ─── Etkinlik ────────────────────────────────────────────────────────────────

export function extractEtkinlikAdi(row: Record<string, any>): string {
  const not = String(row['Not'] ?? row['not'] ?? '').trim()
  return not || 'Bilinmeyen Etkinlik'
}

// ─── Email Sets ──────────────────────────────────────────────────────────────

export function matchEmailSet(rows: Record<string, any>[]): Set<string> {
  const s = new Set<string>()
  for (const row of rows) {
    const email = String(
      row['E-Posta Adresin'] ?? row['Email'] ?? row['Mail'] ?? row['E-Posta'] ?? ''
    ).toLowerCase().trim()
    if (email && email.includes('@')) s.add(email)
  }
  return s
}

// ─── Pipeline Duration ───────────────────────────────────────────────────────

type DurationBucket = { bucket: string; count: number }

export function computePipelineDuration(
  basvuruRows: Record<string, any>[],
  kesinKabulRows: Record<string, any>[]
): { avgDays: number | null; buckets: DurationBucket[] } {
  const basvuruMap = new Map<string, Date>()
  for (const row of basvuruRows) {
    const email = String(row['E-Posta Adresin'] ?? '').toLowerCase().trim()
    const dt = parseDateFlexible(row['Timestamp'] ?? row['timestamp'] ?? '')
    if (email && dt) basvuruMap.set(email, dt)
  }

  const durations: number[] = []
  for (const row of kesinKabulRows) {
    const email = String(row['E-Posta Adresin'] ?? '').toLowerCase().trim()
    const kabulDt = parseDateFlexible(row['Timestamp'] ?? row['timestamp'] ?? '')
    const basvuruDt = basvuruMap.get(email)
    if (kabulDt && basvuruDt) {
      const days = Math.round((kabulDt.getTime() - basvuruDt.getTime()) / 86_400_000)
      if (days >= 0 && days < 365) durations.push(days)
    }
  }

  if (durations.length === 0) return { avgDays: null, buckets: [] }

  const avgDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  const BUCKETS = [
    { label: '0–7 gün', min: 0, max: 7 },
    { label: '8–14 gün', min: 8, max: 14 },
    { label: '15–30 gün', min: 15, max: 30 },
    { label: '31–60 gün', min: 31, max: 60 },
    { label: '60+ gün', min: 61, max: Infinity },
  ]
  const buckets: DurationBucket[] = BUCKETS.map(b => ({
    bucket: b.label,
    count: durations.filter(d => d >= b.min && d <= b.max).length,
  }))

  return { avgDays, buckets }
}

// ─── Değerlendiren Stats ─────────────────────────────────────────────────────

export interface DegerlendirenStat {
  name: string
  kabul: number
  ret: number
  beklemede: number
  total: number
}

export function buildDegerlendirenStats(
  kontrol: Record<string, any>[],
  kesinRet: Record<string, any>[],
  kesinKabul: Record<string, any>[]
): DegerlendirenStat[] {
  const map = new Map<string, { kabul: number; ret: number; beklemede: number }>()

  const upsert = (name: string, onay: string) => {
    const key = name || 'Atanmamış'
    if (!map.has(key)) map.set(key, { kabul: 0, ret: 0, beklemede: 0 })
    const entry = map.get(key)!
    const o = String(onay ?? '').toLowerCase()
    if (o.includes('kabul')) entry.kabul++
    else if (o.includes('ret')) entry.ret++
    else entry.beklemede++
  }

  for (const row of kontrol) {
    const d = String(row['Değerlendiren'] ?? '').trim()
    const o = String(row['Onay Durumu'] ?? '').trim()
    if (d || o) upsert(d, o)
  }
  for (const row of kesinRet) {
    const d = String(row['Değerlendiren'] ?? '').trim()
    upsert(d, 'Ret')
  }
  for (const row of kesinKabul) {
    const d = String(row['Değerlendiren'] ?? '').trim()
    upsert(d, 'Kabul')
  }

  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v, total: v.kabul + v.ret + v.beklemede }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
}

// ─── Ret Disiplin Dağılımı ───────────────────────────────────────────────────

const DISIPLIN_CANDIDATES = [
  'Üretici Rolünü Tanımla',
  'Üretici Rolün',
  'Mesleğin / Alanın',
  'Mevcut profesyonel durumun',
  'Bölüm',
]

function pickDisiplin(row: Record<string, any>): string | null {
  for (const f of DISIPLIN_CANDIDATES) {
    const v = String(row[f] ?? '').trim()
    if (v) return v.split(/[,\n]/)[0].trim()
  }
  return null
}

export function buildRetDisiplinDagilimi(
  retRows: Record<string, any>[],
  basvuruRows: Record<string, any>[]
): { disiplin: string; count: number }[] {
  // email → basvuru satırı map
  const basvuruByEmail = new Map<string, Record<string, any>>()
  for (const row of basvuruRows) {
    const email = String(row['E-Posta Adresin'] ?? '').toLowerCase().trim()
    if (email) basvuruByEmail.set(email, row)
  }

  const counts: Record<string, number> = {}

  for (const row of retRows) {
    const email = String(row['E-Posta Adresin'] ?? '').toLowerCase().trim()
    // önce ret satırında bak, yoksa basvuru'da ara
    let disiplin = pickDisiplin(row)
    if (!disiplin && email) {
      const basvuruRow = basvuruByEmail.get(email)
      if (basvuruRow) disiplin = pickDisiplin(basvuruRow)
    }
    if (!disiplin) disiplin = 'Belirtilmemiş'
    counts[disiplin] = (counts[disiplin] ?? 0) + 1
  }

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([disiplin, count]) => ({ disiplin, count }))
}

// ─── Uyarı Dağılımı ──────────────────────────────────────────────────────────

export function buildUyariDagilimi(
  nihaiOlmayanRows: Record<string, any>[]
): { uyari: string; count: number }[] {
  const counts: Record<string, number> = { '0': 0, '1': 0, '2': 0 }
  for (const row of nihaiOlmayanRows) {
    const raw = String(row['Uyarı Sayısı'] ?? row['Uyari Sayisi'] ?? '0').trim()
    const n = parseInt(raw) || 0
    const key = String(Math.min(n, 2))
    counts[key] = (counts[key] ?? 0) + 1
  }
  return [
    { uyari: '0 Uyarı', count: counts['0'] },
    { uyari: '1 Uyarı', count: counts['1'] },
    { uyari: '2 Uyarı', count: counts['2'] },
  ]
}

// ─── Deaktive Sebepleri ──────────────────────────────────────────────────────

export function buildDeaktiveSebepleri(
  deaktiveRows: Record<string, any>[]
): { sebep: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const row of deaktiveRows) {
    let sebep = String(
      row['Deaktive Sebebi'] ?? row['Sebep'] ?? row['sebep'] ?? ''
    ).trim()
    if (!sebep) {
      // infer from Note field
      const not = String(row['Not'] ?? '').toLowerCase()
      if (not.includes('envanter')) sebep = 'Envanter Eksik'
      else if (not.includes('başvuru')) sebep = 'Başvuru Yapmadı'
      else sebep = 'Diğer'
    }
    counts[sebep] = (counts[sebep] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([sebep, count]) => ({ sebep, count }))
}
