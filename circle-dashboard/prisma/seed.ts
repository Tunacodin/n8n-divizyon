import { PrismaClient } from '@prisma/client'
import { webcrypto } from 'node:crypto'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// Admin users
// ─────────────────────────────────────────────────────────────

type Role = 'admin' | 'evaluator' | 'viewer'

const SAMPLE_USERS: Array<{ email: string; password: string; role: Role }> = [
  { email: 'admin@divizyon.org',     password: 'Admin1234!',     role: 'admin' },
  { email: 'evaluator@divizyon.org', password: 'Evaluator1234!', role: 'evaluator' },
  { email: 'viewer@divizyon.org',    password: 'Viewer1234!',    role: 'viewer' },
]

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return Buffer.from(s, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function hashPassword(pw: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await webcrypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  )
  return b64url(new Uint8Array(bits))
}

async function seedAdmins() {
  console.log('\n--- Admin kullanicilari ---')
  for (const u of SAMPLE_USERS) {
    const email = u.email.trim().toLowerCase()
    const salt = b64url(webcrypto.getRandomValues(new Uint8Array(16)))
    const passwordHash = await hashPassword(u.password, salt)
    const user = await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash, passwordSalt: salt, role: u.role },
      create: { email, passwordHash, passwordSalt: salt, role: u.role },
    })
    console.log(`  ${user.email}  rol=${user.role}  sifre=${u.password}`)
  }
}

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

const EVENTS = [
  {
    name: 'Acilis Etkinligi 2026',
    description: 'Divizyon toplulugunun ilk buyuk bulusmasi.',
    event_date: new Date('2026-02-15'),
    location: 'Istanbul, Cibali',
    qr_token: 'EVT-2026-OPENING',
  },
  {
    name: 'Bahar Bulusmasi',
    description: 'Yaratici disiplinler arasi bahar workshop\'u.',
    event_date: new Date('2026-04-20'),
    location: 'Ankara, Cankaya',
    qr_token: 'EVT-2026-SPRING',
  },
  {
    name: 'Workshop: Uretken AI',
    description: 'AI tabanli yaratici uretim atolyesi.',
    event_date: new Date('2026-05-10'),
    location: 'Online',
    qr_token: 'EVT-2026-AI-WORKSHOP',
  },
]

async function seedEvents() {
  console.log('\n--- Etkinlikler ---')
  const ids: Record<string, string> = {}
  for (const e of EVENTS) {
    const ev = await prisma.events.upsert({
      where: { qr_token: e.qr_token },
      update: {
        name: e.name,
        description: e.description,
        event_date: e.event_date,
        location: e.location,
      },
      create: e,
    })
    ids[e.qr_token] = ev.id
    console.log(`  ${e.name}  (${e.event_date.toISOString().slice(0, 10)})`)
  }
  return ids
}

// ─────────────────────────────────────────────────────────────
// Applications
// ─────────────────────────────────────────────────────────────

const UNIVERSITIES = [
  'Bogazici Universitesi', 'ODTU', 'ITU', 'Galatasaray Universitesi',
  'Bilkent Universitesi', 'Sabanci Universitesi', 'Koc Universitesi',
  'Mimar Sinan GSU', 'Marmara Universitesi', 'Yildiz Teknik',
  'Istanbul Bilgi', 'Hacettepe Universitesi',
]

const DEPARTMENTS = [
  'Bilgisayar Muhendisligi', 'Endustri Muhendisligi', 'Grafik Tasarim',
  'Gorsel Iletisim', 'Mimarlik', 'Ic Mimarlik', 'Sosyoloji',
  'Isletme', 'Psikoloji', 'Sinema-TV', 'Iletisim Tasarimi',
  'Yeni Medya', 'Endustriyel Tasarim',
]

const ROLES = [
  'role_uiux', 'role_visual_designer', 'role_creative_content',
  'role_web_app', 'role_video_content', 'role_animation',
  'role_digital_product', 'role_interactive', 'role_game',
]

// PDF'teki Karakteristik Envanter sonucu — 18 tag
const KARAKTERISTIK_TAGS = [
  'Oncu Birlestirici', 'Oncu Pratik', 'Oncu Sistemli', 'Oncu Ilham Verici', 'Oncu Tecrubeli',
  'Meydan Okuyan Challenger', 'Meydan Okuyan Mantikli', 'Meydan Okuyan Tutkulu',
  'Zihin Kasifi Yaratici', 'Zihin Kasifi Inovatif', 'Zihin Kasifi Geleneksel',
  'Hedef Takipcisi Caliskan', 'Hedef Takipcisi Titiz', 'Hedef Takipcisi Cozumcu',
  'Gozcu Gozlemci', 'Gozcu Kendinden Emin', 'Gozcu Canli', 'Gozcu Gelecek Odakli',
]
// Ust kategoriler — PDF flow'una göre tag verirken hem alt hem üst eklenir
const TAG_PARENTS: Record<string, string> = {
  'Oncu Birlestirici': 'Oncu', 'Oncu Pratik': 'Oncu', 'Oncu Sistemli': 'Oncu',
  'Oncu Ilham Verici': 'Oncu', 'Oncu Tecrubeli': 'Oncu',
  'Meydan Okuyan Challenger': 'Meydan Okuyan', 'Meydan Okuyan Mantikli': 'Meydan Okuyan',
  'Meydan Okuyan Tutkulu': 'Meydan Okuyan',
  'Zihin Kasifi Yaratici': 'Zihin Kasifi', 'Zihin Kasifi Inovatif': 'Zihin Kasifi',
  'Zihin Kasifi Geleneksel': 'Zihin Kasifi',
  'Hedef Takipcisi Caliskan': 'Hedef Takipcisi', 'Hedef Takipcisi Titiz': 'Hedef Takipcisi',
  'Hedef Takipcisi Cozumcu': 'Hedef Takipcisi',
  'Gozcu Gozlemci': 'Gozcu', 'Gozcu Kendinden Emin': 'Gozcu',
  'Gozcu Canli': 'Gozcu', 'Gozcu Gelecek Odakli': 'Gozcu',
}

const TR_FEMALE_NAMES = ['Ayse', 'Zeynep', 'Elif', 'Selin', 'Defne', 'Eylul', 'Irem', 'Beren', 'Naz', 'Melis', 'Bade', 'Ece']
const TR_MALE_NAMES = ['Mehmet', 'Ahmet', 'Emre', 'Mert', 'Berkay', 'Burak', 'Can', 'Onur', 'Kerem', 'Doruk', 'Arda', 'Efe']
const TR_SURNAMES = ['Yilmaz', 'Demir', 'Kaya', 'Celik', 'Sahin', 'Yildiz', 'Ozturk', 'Aydin', 'Arslan', 'Dogan', 'Kilic', 'Aslan', 'Cetin', 'Korkmaz', 'Tekin', 'Polat']

const ALL_PRINCIPLES_TEXT = 'Kabul ediyorum'

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]
}

function makeEmail(first: string, last: string, idx: number): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  return `${norm(first)}.${norm(last)}${idx}@example.com`
}

function makePhone(seed: number): string {
  const last = String(1000000 + (seed * 31337) % 9000000).padStart(7, '0')
  return `0532 ${last.slice(0, 3)} ${last.slice(3, 5)} ${last.slice(5)}`
}

function buildAllPrinciples() {
  const p: Record<string, string> = {}
  for (let i = 1; i <= 10; i++) p[`principle_${i}`] = ALL_PRINCIPLES_TEXT
  return p
}

interface AppSpec {
  status: string
  count: number
  reviewer?: string
  reviewNote?: string
  mailTemplate?: string
  mailSent?: boolean
  approvalStatus?: string
  warningCount?: number
  isProtected?: boolean
  protectedSource?: string
  fillPrinciples?: boolean
  ageGroup?: 'young' | 'adult'
}

const SPECS: AppSpec[] = [
  // Bekleyen basvurular
  { status: 'basvuru', count: 6, fillPrinciples: true },

  // Kontrol — bir kismi degerlendirilmis, bir kismi yeni
  { status: 'kontrol', count: 5, fillPrinciples: true },
  { status: 'kontrol', count: 3, reviewer: 'Tuna', reviewNote: 'Profili guclu, video ikna edici.', approvalStatus: 'Kabul', fillPrinciples: true },

  // Kesin kabul — bir kismi mail gonderildi
  { status: 'kesin_kabul', count: 4, reviewer: 'Taha', reviewNote: 'Yaratici profil, ekibe katki potansiyeli yuksek.', mailTemplate: 'kesin-kabul', mailSent: true, approvalStatus: 'Kabul', fillPrinciples: true },
  { status: 'kesin_kabul', count: 2, reviewer: 'Tuna', reviewNote: 'Onaylandi, mail beklemede.', mailSent: false, approvalStatus: 'Kabul', fillPrinciples: true },

  // Nihai uye
  { status: 'nihai_uye', count: 5, reviewer: 'Taha', reviewNote: 'Aktif uye, oryantasyon tamam.', mailTemplate: 'oryantasyon', mailSent: true, approvalStatus: 'Kabul', fillPrinciples: true },

  // Kesin ret — manuel + topluluk ilkesi reddi
  { status: 'kesin_ret', count: 3, reviewer: 'Tuna', reviewNote: 'Profil uyumsuz, hedef ekosistem disi.', mailTemplate: 'kesin-ret', mailSent: true, approvalStatus: 'Ret', fillPrinciples: true },
  { status: 'kesin_ret', count: 2, reviewer: 'Taha', reviewNote: 'Topluluk ilkeleri kabul edilmemis.', mailTemplate: 'kesin-ret-topluluk', mailSent: false, approvalStatus: 'Ret', fillPrinciples: false },

  // 18 yas alti — otomasyon retleri
  { status: 'yas_kucuk', count: 3, reviewer: 'Otomasyon', reviewNote: '18 yasindan kucuk — otomatik ret.', mailTemplate: 'kesin-ret-18yas', mailSent: true, approvalStatus: 'Ret', ageGroup: 'young', fillPrinciples: true },

  // Etkinlikten gelenler
  { status: 'etkinlik', count: 2, fillPrinciples: true },

  // Deaktive
  { status: 'deaktive', count: 1, reviewer: 'Taha', reviewNote: 'Uyelikten ayrildi.', approvalStatus: 'Kabul', warningCount: 2, fillPrinciples: true },

  // Protected (Circle) — CLAUDE.md kritik kural test
  { status: 'nihai_uye', count: 2, isProtected: true, protectedSource: 'circle_existing_match', reviewer: 'Circle Sync', reviewNote: 'Aktif topluluk uyesi (Circle senkron).', fillPrinciples: true },
]

const STATUS_LABEL: Record<string, string> = {
  basvuru: 'Basvuru', kontrol: 'Kontrol', kesin_kabul: 'Kesin Kabul',
  nihai_uye: 'Nihai Uye', kesin_ret: 'Kesin Ret', yas_kucuk: '18 Yas Alti',
  etkinlik: 'Etkinlik', deaktive: 'Deaktive',
}

async function seedApplications(eventIds: Record<string, string>) {
  console.log('\n--- Basvurular ---')

  // Idempotent: mevcut seed kayitlarini (email @example.com) ve iliskilerini sil
  const existing = await prisma.applications.findMany({
    where: { email: { endsWith: '@example.com' } },
    select: { id: true },
  })
  const existingIds = existing.map(a => a.id)
  if (existingIds.length > 0) {
    console.log(`  Mevcut ${existingIds.length} seed kaydi temizleniyor...`)
    await prisma.status_history.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.task_completions.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.warnings.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.evaluations.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.mail_logs.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.application_snapshots.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.event_attendees.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.inventory_tests.deleteMany({ where: { application_id: { in: existingIds } } })
    await prisma.applications.deleteMany({ where: { id: { in: existingIds } } })
  }

  const created: Array<{
    id: string
    status: string
    email: string
    full_name: string
    isProtected: boolean
    mailTemplate?: string
    mailSent: boolean
  }> = []

  const eventList = Object.values(eventIds)
  const now = Date.now()
  const dayMs = 86400 * 1000

  let globalIdx = 0
  for (const spec of SPECS) {
    for (let i = 0; i < spec.count; i++) {
      globalIdx++
      const isFemale = globalIdx % 2 === 0
      const first = pick(isFemale ? TR_FEMALE_NAMES : TR_MALE_NAMES, globalIdx + (isFemale ? 0 : 7))
      const last = pick(TR_SURNAMES, globalIdx * 3)
      const fullName = `${first} ${last}`
      const email = makeEmail(first, last, globalIdx)
      const birthYear = spec.ageGroup === 'young' ? 2010 + (globalIdx % 3) : 1995 + (globalIdx % 12)
      const birthDate = `${String((globalIdx % 28) + 1).padStart(2, '0')}/${String((globalIdx % 12) + 1).padStart(2, '0')}/${birthYear}`

      const submittedAt = new Date(now - (globalIdx * 6 + 1) * 3600 * 1000)
      const updatedAt = spec.status === 'basvuru' ? submittedAt : new Date(submittedAt.getTime() + 12 * 3600 * 1000)
      const principles = spec.fillPrinciples ? buildAllPrinciples() : {}

      const sourceEventId = spec.status === 'etkinlik' && eventList.length
        ? eventList[globalIdx % eventList.length]
        : null

      const app = await prisma.applications.create({
        data: {
          email,
          status: spec.status,
          full_name: fullName,
          birth_date: birthDate,
          gender: isFemale ? 'Kadin' : 'Erkek',
          phone: makePhone(globalIdx),
          professional_status: pick(['Ogrenci', 'Yeni Mezun', 'Calisan'], globalIdx),
          university: pick(UNIVERSITIES, globalIdx),
          department: pick(DEPARTMENTS, globalIdx * 2),
          education_type: pick(['Lisans', 'Yuksek Lisans'], globalIdx),
          main_role: pick(ROLES, globalIdx),
          core_values: 'Yaraticilik, is birligi, etik uretim, surekli ogrenme.',
          community_contribution: 'Mentorluk, icerik uretimi, etkinlik organizasyonu.',
          ecosystem_contribution: 'Acik kaynak katkilarim ve workshop sunumlarim.',
          self_expression: `Merhaba, ben ${first}. ${pick(DEPARTMENTS, globalIdx * 2)} ogrencisiyim ve disiplinler arasi yaraticiligiya ilgi duyuyorum.`,
          video_link: globalIdx % 3 === 0 ? `https://youtu.be/seed${globalIdx}` : null,
          plan_description: 'Topluluga katildiktan sonra ekip projelerine katki saglamayi planliyorum.',
          future_ideas: 'AI ve yaraticiligin kesisimini kesfetmek.',
          feedback_experience: 'Geri bildirimi ogrenme araci olarak kullanirim.',
          project_steps: 'Arastirma -> prototip -> kullanici testi -> iterasyon -> yayin.',
          curiosity_topic: 'Generative design, davranissal psikoloji.',
          additional_notes: spec.isProtected ? '' : 'Esnek calisma saatlerine sahibim.',
          ...principles,
          reviewer: spec.reviewer,
          review_note: spec.reviewNote,
          mail_template: spec.mailTemplate,
          mail_sent: spec.mailSent ?? false,
          approval_status: spec.approvalStatus,
          warning_count: spec.warningCount ?? 0,
          // dummy değil — relatedTablesSeed adımında warnings ile senkronize edilir (deaktive + bazı nihai_uye)
          source: sourceEventId ? 'event' : 'form',
          source_event_id: sourceEventId,
          submitted_at: submittedAt,
          updated_at: updatedAt,
          approved_at: ['kesin_kabul', 'nihai_uye'].includes(spec.status) ? updatedAt : null,
          is_protected: spec.isProtected ?? false,
          circle_id: spec.isProtected ? 100000 + globalIdx : null,
          protected_source: spec.protectedSource,
          tags: spec.isProtected
            ? ['Aktif Uye', 'Circle']
            : spec.status === 'nihai_uye'
              ? (() => {
                  // PDF flow: Karakteristik envanter sonucuna gore tag verilir (alt + ust)
                  const t = KARAKTERISTIK_TAGS[globalIdx % KARAKTERISTIK_TAGS.length]
                  return [t, TAG_PARENTS[t]].filter(Boolean) as string[]
                })()
              : [],
          status_changed_at: updatedAt,
          accepted_invitation_at: spec.isProtected ? new Date(now - 30 * dayMs) : null,
          last_seen_at: spec.isProtected ? new Date(now - 2 * dayMs) : null,
          circle_active: spec.isProtected ? true : null,
          circle_posts_count: spec.isProtected ? (globalIdx % 20) + 3 : 0,
          circle_comments_count: spec.isProtected ? (globalIdx % 30) + 5 : 0,
        },
      })

      created.push({
        id: app.id,
        status: spec.status,
        email,
        full_name: fullName,
        isProtected: spec.isProtected ?? false,
        mailTemplate: spec.mailTemplate,
        mailSent: spec.mailSent ?? false,
      })
    }
  }

  const byStatus = created.reduce<Record<string, number>>((acc, a) => {
    const key = a.isProtected ? `${a.status} (protected)` : a.status
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  for (const [s, n] of Object.entries(byStatus)) {
    const base = s.replace(' (protected)', '')
    const label = STATUS_LABEL[base] || base
    const suffix = s.includes('protected') ? ' [PROTECTED]' : ''
    console.log(`  ${(label + suffix).padEnd(26)} -> ${n}`)
  }

  return created
}

// ─────────────────────────────────────────────────────────────
// Related tables
// ─────────────────────────────────────────────────────────────

async function seedRelations(
  apps: Awaited<ReturnType<typeof seedApplications>>,
  eventIds: Record<string, string>,
) {
  console.log('\n--- Iliskili tablolar ---')
  const now = Date.now()
  const dayMs = 86400 * 1000

  // Status history
  let historyCount = 0
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i]
    if (a.status === 'basvuru') continue
    if (a.isProtected) continue

    await prisma.status_history.create({
      data: {
        application_id: a.id,
        from_status: 'basvuru',
        to_status: 'kontrol',
        changed_by: 'Sistem',
        reason: 'Otomatik kontrol kuyruguna alindi',
        change_type: 'normal',
        created_at: new Date(now - (i * 4 + 2) * 3600 * 1000),
      },
    })
    historyCount++

    if (a.status !== 'kontrol') {
      await prisma.status_history.create({
        data: {
          application_id: a.id,
          from_status: 'kontrol',
          to_status: a.status === 'nihai_uye' ? 'kesin_kabul' : a.status,
          changed_by: 'Tuna',
          reason: a.status === 'kesin_ret' ? 'Profil uyumsuz' : 'Manuel kabul karari',
          change_type: 'normal',
          created_at: new Date(now - (i * 4 + 1) * 3600 * 1000),
        },
      })
      historyCount++

      if (a.status === 'nihai_uye') {
        await prisma.status_history.create({
          data: {
            application_id: a.id,
            from_status: 'kesin_kabul',
            to_status: 'nihai_uye',
            changed_by: 'Taha',
            reason: 'Oryantasyon ve envanter testleri tamamlandi',
            change_type: 'normal',
            created_at: new Date(now - i * 4 * 3600 * 1000),
          },
        })
        historyCount++
      }
    }
  }
  console.log(`  status_history   -> ${historyCount}`)

  // Mail logs
  let mailCount = 0
  const subjectMap: Record<string, string> = {
    'kesin-kabul': 'Tebrikler! Basvurunuz Onaylandi',
    'kesin-ret': 'Basvurunuz Hakkinda',
    'kesin-ret-18yas': '18 Yas Bilgilendirmesi',
    'kesin-ret-topluluk': 'Basvurunuz Hakkinda - Topluluk Ilkeleri',
    'oryantasyon': 'Oryantasyon Sureci Tamamlandi',
  }
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i]
    if (!a.mailSent || !a.mailTemplate) continue
    const sentAt = new Date(now - i * 3 * 3600 * 1000)
    await prisma.mail_logs.create({
      data: {
        application_id: a.id,
        email_to: a.email,
        template_name: a.mailTemplate,
        subject: subjectMap[a.mailTemplate] || 'Bilgilendirme',
        status: 'delivered',
        provider: 'resend',
        sent_at: sentAt,
        delivered_at: new Date(sentAt.getTime() + 30000),
        opened_at: i % 3 !== 0 ? new Date(sentAt.getTime() + 600000) : null,
        sent_by: 'dashboard',
      },
    })
    mailCount++
  }
  console.log(`  mail_logs        -> ${mailCount}`)

  // Task completions — kesin_kabul (kismi) ve nihai_uye (tamam)
  const TASK_TYPES = ['karakteristik_envanter', 'disipliner_envanter', 'oryantasyon']
  let taskCount = 0
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i]
    if (!['kesin_kabul', 'nihai_uye'].includes(a.status)) continue
    if (a.isProtected) continue
    for (let t = 0; t < TASK_TYPES.length; t++) {
      const taskType = TASK_TYPES[t]
      const isNihai = a.status === 'nihai_uye'
      const completed = isNihai ? true : (i + t) % 2 === 0
      await prisma.task_completions.create({
        data: {
          application_id: a.id,
          task_type: taskType,
          completed,
          completed_at: completed ? new Date(now - i * 2 * 3600 * 1000) : null,
          verified_by: completed ? 'Taha' : null,
        },
      })
      taskCount++
    }
  }
  console.log(`  task_completions -> ${taskCount}`)

  // Warnings — applications.warning_count alanini da senkronize et (PDF flow gerektiriyor)
  let warnCount = 0
  const warnTargets = apps.filter((a, i) => (a.status === 'deaktive') || (a.status === 'nihai_uye' && i % 5 === 0))
  for (const a of warnTargets.slice(0, 3)) {
    const wn = a.status === 'deaktive' ? 2 : 1
    for (let i = 1; i <= wn; i++) {
      await prisma.warnings.create({
        data: {
          application_id: a.id,
          warning_number: i,
          warned_by: 'Tuna',
          reason: i === 1 ? 'Gorev gecikmesi' : 'Tekrar uyari: katilim eksik',
          warned_at: new Date(now - (4 - i) * dayMs),
          form_type: null,
        },
      })
      warnCount++
    }
    // applications.warning_count'u uyari sayisina esitle
    await prisma.applications.update({
      where: { id: a.id },
      data: { warning_count: wn },
    })
  }
  console.log(`  warnings         -> ${warnCount}`)

  // Evaluations
  let evalCount = 0
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i]
    if (a.status !== 'kontrol') continue
    if (i % 2 !== 0) continue
    await prisma.evaluations.create({
      data: {
        application_id: a.id,
        reviewer: 'Tuna',
        decision: 'kabul',
        notes: 'Sozlu gorusme onerilir, video iyi.',
      },
    })
    evalCount++
  }
  console.log(`  evaluations      -> ${evalCount}`)

  // Event attendees
  let attendeeCount = 0
  const eventList = Object.values(eventIds)
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i]
    if (a.status !== 'nihai_uye' || a.isProtected) continue
    if (i % 3 !== 0) continue
    const eventId = eventList[i % eventList.length]
    try {
      await prisma.event_attendees.create({
        data: {
          event_id: eventId,
          application_id: a.id,
          full_name: a.full_name,
          email: a.email,
          source: 'qr_scan',
          checked_in_at: new Date(now - i * dayMs),
        },
      })
      attendeeCount++
    } catch {
      // unique (event_id, email) — atla
    }
  }
  console.log(`  event_attendees  -> ${attendeeCount}`)
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('================================================')
  console.log('   Divizyon Dashboard - Seed')
  console.log('================================================')

  await seedAdmins()
  const eventIds = await seedEvents()
  const apps = await seedApplications(eventIds)
  await seedRelations(apps, eventIds)

  console.log('\n================================================')
  console.log(`   OK - Toplam ${apps.length} basvuru seed edildi`)
  console.log('================================================\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
