/**
 * CSV → Supabase Migration Script
 *
 * Usage: npx tsx scripts/migrate-csv-to-supabase.ts
 *
 * CSV dosyalari:
 * 1. Basvuru Formu (~3594 satir) → applications (status: basvuru)
 * 2. Kontrol (~2508 satir) → applications (status: kontrol) + evaluations
 * 3. Kesin Ret (~121 satir) → applications (status: kesin_ret) + evaluations
 * 4. Kesin Kabul (0 satir) → applications (status: kesin_kabul) + evaluations
 * 5. Nihai Olmayan (1 satir, sadece header) → applications (status: nihai_olmayan) + warnings + task_completions
 * 6. Karekteristik Envanter Testi (~205 satir) → inventory_tests
 */

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Config ───
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jespofhjuorecaetwhww.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_KEY) {
  // .env.local'dan oku
  const envPath = resolve(__dirname, '../.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
  if (match) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = match[1].trim()
  }
}

const db = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY,
  { auth: { persistSession: false } }
)

const BASE = resolve(__dirname, '..')

// ─── CSV Helpers ───

function readCSV(filename: string): Record<string, string>[] {
  const path = resolve(BASE, filename)
  try {
    const content = readFileSync(path, 'utf-8')
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
    })
  } catch (e) {
    console.warn(`  ⚠ CSV okunamadi: ${filename}`)
    return []
  }
}

function clean(val: string | undefined): string {
  return (val || '').trim()
}

function parseDateFlexible(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()
  // DD.MM.YYYY HH:mm:ss
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (dmy) {
    const [, d, m, y, h = '0', min = '0', sec = '0'] = dmy
    return new Date(+y, +m - 1, +d, +h, +min, +sec).toISOString()
  }
  // ISO
  try {
    const dt = new Date(s)
    if (!isNaN(dt.getTime()) && dt.getFullYear() > 2000) return dt.toISOString()
  } catch {}
  return null
}

// ─── Column Mapping: Basvuru Formu ───

function mapBasvuruRow(row: Record<string, string>) {
  return {
    email: clean(row['E-Posta Adresin']).toLowerCase(),
    full_name: clean(row['Adın Soyadın']),
    birth_date: clean(row['Doğum Tarihin (GG/AA/YYYY)']),
    gender: clean(row['Cinsiyetin']),
    phone: clean(row['Telefon Numaran']),
    professional_status: clean(row['Mevcut profesyonel durumun nedir?']),
    university: clean(row['Hangi üniversitede öğrencisin?']),
    university_other: clean(row['Eğer yukardaki listede üniversiteni göremiyorsan bu soruda üniversiteni belirtebilirsin.']),
    department: clean(row['Hangi bölümde öğrencisin?']),
    education_type: clean(row['Öğrenim türünü belirtir misin?']),
    work_detail: clean(row['Çalıştığın iş/proje hakkında detay verebilir misin?']),
    main_role: clean(row['Üretici Rolünü Tanımla']),
    role_creative_content: clean(row['Aşağıdaki *Kreatif İçerik Üreticisi *Rollerinden Hangisi Seni Tanımlıyor?']),
    role_visual_designer: clean(row['Aşağıdaki *Görsel Tasarımcılar* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_animation: clean(row['Aşağıdaki *Animasyon ve Çizgi Film Tasarımcıları* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_video_content: clean(row['Aşağıdaki *Video İçerik Üreticileri* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_audio_music: clean(row['Aşağıdaki *Ses ve Müzik Üreticileri* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_digital_asset: clean(row['Aşağıdaki *Dijital Varlık ve Materyal Üreticileri* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_digital_product: clean(row['Aşağıdaki *Dijital Ürün Geliştiricisi* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_web_app: clean(row['Aşağıdaki *Web ve Uygulama Geliştiricisi* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_advanced_tech: clean(row['Aşağıdaki *İleri Teknoloji Geliştiricisi* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_game: clean(row['Aşağıdaki *Oyun Üreticisi* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_digital_experience: clean(row['Aşağıdaki *Dijital Deneyim Tasarımcısı *Rollerinden Hangisi Seni Tanımlıyor?']),
    role_uiux: clean(row['Aşağıdaki *UI/UX Tasarımcıları* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_interactive: clean(row['Aşağıdaki *İnteraktif İçerik Üreticisi* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_installation: clean(row['Aşağıdaki *Enstalasyon Sanatçısı* Rollerinden Hangisi Seni Tanımlıyor?']),
    role_interdisciplinary: clean(row['Aşağıdaki *Disiplinler Ötesi Üretici *Rollerinden Hangisi Seni Tanımlıyor?']),
    core_values: clean(row['Aşağıdaki değerlerden hangisi seni en çok tanımlar?']),
    community_contribution: clean(row['Divizyon topluluğunun sana en çok nasıl katkı sağlayacağını düşünüyorsun?']),
    self_expression: clean(row['Sıra en kritik adımda: Seni anlamak. Bu topluluğun bir parçası olarak potansiyelini nasıl hayata geçireceğini ve ekosisteme nasıl katkı sunacağını duymak istiyoruz.']),
    principle_1: clean(row['1)']),
    principle_2: clean(row['2)']),
    principle_3: clean(row['3)']),
    principle_4: clean(row['4)']),
    principle_5: clean(row['5)']),
    principle_6: clean(row['6)']),
    principle_7: clean(row['7)']),
    principle_8: clean(row['8)']),
    principle_9: clean(row['9)']),
    principle_10: clean(row['10)']),
    additional_notes: clean(row['Eklemek veya belirtmek istediğin herhangi bir şey var mı?']),
    submitted_at: parseDateFlexible(row['Submitted At'] || ''),
    form_token: clean(row['Token']),
  }
}

// ─── Main Migration ───

async function migrate() {
  console.log('🚀 Migration basliyor...\n')

  // Track emails we've already inserted (higher priority status wins)
  const insertedEmails = new Map<string, string>() // email → application_id

  // ── 1. Kontrol (status: kontrol) — daha yuksek oncelik ──
  console.log('📋 Kontrol sheet okunuyor...')
  const kontrolRows = readCSV('Kontrol - test - Kontrol.csv')
  console.log(`   ${kontrolRows.length} satir bulundu`)

  let kontrolCount = 0
  for (const row of kontrolRows) {
    const name = clean(row['Adın Soyadın'])
    if (!name) continue

    // Kontrol sheet'te email yok, basvuru'dan eslesecek
    // Simdilik name-based insert, email basvuru'dan gelecek
    // Kontrol'de sadece degerlendirme bilgileri var
  }

  // ── 2. Kesin Ret (status: kesin_ret) ──
  console.log('❌ Kesin Ret sheet okunuyor...')
  const retRows = readCSV('Kesin Ret - test - Kesin Ret.csv')
  console.log(`   ${retRows.length} satir bulundu`)

  for (const row of retRows) {
    const email = clean(row['E-Posta Adresin']).toLowerCase()
    const name = clean(row['Adın Soyadın'])
    if (!email || !name) continue

    const { data, error } = await db.from('applications').upsert({
      email,
      full_name: name,
      birth_date: clean(row['Doğum Tarihin (GG/AA/YYYY)']),
      gender: clean(row['Cinsiyetin']),
      phone: clean(row['Telefon Numaran']),
      status: 'kesin_ret',
      reviewer: clean(row['Değerlendiren']),
      review_note: clean(row['Not']),
      mail_template: clean(row['Mail Template']),
      mail_sent: clean(row['Mail Atıldı mı?']).toLowerCase() === 'true' || clean(row['Mail Atıldı mı?']) === 'Evet',
    }, { onConflict: 'email' }).select('id').single()

    if (data) {
      insertedEmails.set(email, data.id)

      // Status history
      await db.from('status_history').insert({
        application_id: data.id,
        from_status: null,
        to_status: 'kesin_ret',
        changed_by: 'migration',
        change_type: 'migration',
      })

      // Evaluation
      const reviewer = clean(row['Değerlendiren'])
      if (reviewer) {
        await db.from('evaluations').insert({
          application_id: data.id,
          reviewer,
          decision: 'ret',
          notes: clean(row['Not']),
        })
      }
    }
    if (error) console.error(`   Ret hata: ${email}`, error.message)
  }
  console.log(`   ✅ ${retRows.length} kesin ret islendi`)

  // ── 3. Basvuru Formu (status: basvuru veya kontrol) ──
  console.log('📝 Basvuru Formu okunuyor...')
  const basvuruRows = readCSV('Divizyon Açık İnovasyon Ağı _ Başvuru Formu - test - Divizyon Açık İnovasyon Ağı _ Başvuru Formu.csv')
  console.log(`   ${basvuruRows.length} satir bulundu`)

  // Kontrol'deki isimleri set olarak tut (email yoksa isimle eslestirme)
  const kontrolNames = new Set(kontrolRows.map(r => clean(r['Adın Soyadın']).toLowerCase()))

  // Kontrol'deki degerlendirme bilgilerini isimle maple
  const kontrolMap = new Map<string, Record<string, string>>()
  for (const row of kontrolRows) {
    const name = clean(row['Adın Soyadın']).toLowerCase()
    if (name) kontrolMap.set(name, row)
  }

  let basvuruCount = 0
  let kontrolInsertCount = 0
  const BATCH_SIZE = 50

  for (let i = 0; i < basvuruRows.length; i += BATCH_SIZE) {
    const batch = basvuruRows.slice(i, i + BATCH_SIZE)
    const records = []

    for (const row of batch) {
      const mapped = mapBasvuruRow(row)
      if (!mapped.email || !mapped.full_name) continue

      // Bu email zaten kesin_ret olarak eklendiyse atla
      if (insertedEmails.has(mapped.email)) continue

      // Kontrol'de mi?
      const nameLower = mapped.full_name.toLowerCase()
      const isInKontrol = kontrolNames.has(nameLower)
      const kontrolData = kontrolMap.get(nameLower)

      const record: Record<string, unknown> = {
        ...mapped,
        status: isInKontrol ? 'kontrol' : 'basvuru',
      }

      // Kontrol bilgilerini ekle
      if (kontrolData) {
        record.reviewer = clean(kontrolData['Değerlendiren'])
        record.review_note = clean(kontrolData['Not'])
        record.mail_template = clean(kontrolData['Mail Template'])
        record.approval_status = clean(kontrolData['Onay Durumu'])
        kontrolInsertCount++
      }

      records.push(record)
    }

    if (records.length > 0) {
      const { error } = await db.from('applications').upsert(records, { onConflict: 'email' })
      if (error) {
        console.error(`   Batch hata (${i}-${i + BATCH_SIZE}):`, error.message)
        // Tek tek dene
        for (const record of records) {
          const { data, error: singleError } = await db.from('applications')
            .upsert(record, { onConflict: 'email' })
            .select('id')
            .single()
          if (singleError) {
            console.error(`   ⚠ ${record.email}:`, singleError.message)
          } else if (data) {
            insertedEmails.set(record.email as string, data.id)
            basvuruCount++
          }
        }
      } else {
        basvuruCount += records.length
      }
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`   ... ${i}/${basvuruRows.length} islendi`)
    }
  }
  console.log(`   ✅ ${basvuruCount} basvuru, ${kontrolInsertCount} kontrol islendi`)

  // ── Status history for all applications ──
  console.log('📜 Status history olusturuluyor...')
  const { data: allApps } = await db.from('applications').select('id, status')
  if (allApps) {
    const histories = allApps.map(app => ({
      application_id: app.id,
      from_status: null,
      to_status: app.status,
      changed_by: 'migration',
      change_type: 'migration' as const,
    }))

    // Batch insert
    for (let i = 0; i < histories.length; i += 100) {
      const batch = histories.slice(i, i + 100)
      await db.from('status_history').insert(batch)
    }
    console.log(`   ✅ ${histories.length} status history kaydedildi`)
  }

  // ── 4. Nihai Olmayan ──
  console.log('⚠️ Nihai Olmayan okunuyor...')
  const nihaiRows = readCSV('Nihai Olmayan Ağ Üyeleri - test - Nihai Olmayan Ağ Üyeleri.csv')
  console.log(`   ${nihaiRows.length} satir bulundu`)

  for (const row of nihaiRows) {
    const email = clean(row['E-Posta Adresi']).toLowerCase()
    const name = clean(row['Adın Soyadı'])
    if (!email || !name) continue

    // Update existing or insert
    const { data } = await db.from('applications').upsert({
      email,
      full_name: name,
      birth_date: clean(row['Doğum Tarihi']),
      gender: clean(row['Cinsiyeti']),
      phone: clean(row['Telefon Numarası']),
      status: 'nihai_olmayan',
      warning_count: parseInt(clean(row['Uyarı Sayısı'])) || 0,
    }, { onConflict: 'email' }).select('id').single()

    if (data) {
      // Task completions
      const karEnvanter = clean(row['Karakteristik Envanter Testini Doldurmuş mu?']).toUpperCase() === 'TRUE'
      const disEnvanter = clean(row['Disipliner Envanter Testini Doldurmuş mu?']).toUpperCase() === 'TRUE'

      if (karEnvanter || disEnvanter) {
        const tasks = []
        if (karEnvanter) tasks.push({ application_id: data.id, task_type: 'karakteristik_envanter', completed: true })
        if (disEnvanter) tasks.push({ application_id: data.id, task_type: 'disipliner_envanter', completed: true })
        await db.from('task_completions').insert(tasks)
      }

      // Warnings
      const uyariSayisi = parseInt(clean(row['Uyarı Sayısı'])) || 0
      const warnings = []
      if (uyariSayisi >= 1) {
        warnings.push({
          application_id: data.id,
          warning_number: 1,
          warned_by: clean(row['1. Uyarıyı Yapan Kişi']) || 'Bilinmiyor',
          warned_at: parseDateFlexible(clean(row['Uyarı Zamanı'])) || new Date().toISOString(),
        })
      }
      if (uyariSayisi >= 2) {
        warnings.push({
          application_id: data.id,
          warning_number: 2,
          warned_by: clean(row['2. Uyarıyı Yapan Kişi']) || 'Bilinmiyor',
        })
      }
      if (warnings.length > 0) {
        await db.from('warnings').insert(warnings)
      }
    }
  }
  console.log(`   ✅ ${nihaiRows.length} nihai olmayan islendi`)

  // ── 5. Karekteristik Envanter Testi ──
  console.log('🧠 Envanter Testi okunuyor...')
  const envanterRows = readCSV('Karekteristik Envanter Testi Sonuçları - Sayfa1.csv')
  console.log(`   ${envanterRows.length} satir bulundu`)

  const SCORE_FIELDS = [
    'birlestirici', 'caliskan', 'canli', 'challenger', 'cozumcu',
    'gelecek_odakli', 'geleneksel', 'gozlemci', 'ilham_verici', 'inovatif',
    'kendinden_emin', 'mantikli', 'pratik', 'sistemli', 'tecrubeli',
    'titiz', 'tutkulu', 'yaratici',
  ]

  const DISCIPLINE_FIELDS = ['Yazılım', 'Dijital Sanatlar', 'Dijital Pazarlama', 'Girişimcilik', 'Kişisel & Kariyer Gelişim']

  // Question columns (everything between discipline fields and score fields)
  const QUESTION_COLUMNS = [
    'Takım projelerinde en çok hangi rolde yer almayı tatmin edici buluyorsun?',
    'İşte bir zorlukla karşılaştığında, tercih ettiği ilk yaklaşım nedir?',
    'Tipik olarak yeni bir işyerinde ilişki kurmaya nasıl başlarsın?',
  ]

  let envanterCount = 0
  for (const row of envanterRows) {
    const email = clean(row['E-Posta Adresin']).toLowerCase()
    if (!email) continue

    // Disciplines
    const disciplines = DISCIPLINE_FIELDS.filter(f => clean(row[f]))

    // Scores
    const scores: Record<string, number> = {}
    for (const field of SCORE_FIELDS) {
      scores[field] = parseInt(clean(row[field])) || 0
    }

    // All question answers as JSONB
    const answers: Record<string, string> = {}
    const skipFields = new Set(['#', 'E-Posta Adresin', 'Score', 'Response Type', 'Start Date (UTC)', 'Stage Date (UTC)', 'Submit Date (UTC)', 'Network ID', 'Tags', 'Ending', ...SCORE_FIELDS, ...DISCIPLINE_FIELDS])
    for (const [key, val] of Object.entries(row)) {
      if (!skipFields.has(key) && clean(val)) {
        answers[key] = clean(val)
      }
    }

    // Match to application
    const { data: app } = await db.from('applications').select('id').eq('email', email).single()

    const { error } = await db.from('inventory_tests').insert({
      application_id: app?.id || null,
      email,
      test_token: clean(row['#']),
      disciplines,
      answers,
      scores,
      total_score: parseInt(clean(row['Score'])) || 0,
      response_type: clean(row['Response Type']),
      network_id: clean(row['Network ID']),
      tags: clean(row['Tags']),
      started_at: parseDateFlexible(clean(row['Start Date (UTC)'])),
      submitted_at: parseDateFlexible(clean(row['Submit Date (UTC)'])),
    })

    if (error) console.error(`   ⚠ Envanter: ${email}:`, error.message)
    else envanterCount++
  }
  console.log(`   ✅ ${envanterCount} envanter testi islendi`)

  // ── Final Stats ──
  console.log('\n📊 Final istatistikler:')
  const { data: stats } = await db.from('applications').select('status')
  if (stats) {
    const counts: Record<string, number> = {}
    for (const row of stats) {
      counts[row.status] = (counts[row.status] || 0) + 1
    }
    console.log('   Applications:', counts)
    console.log('   Toplam:', stats.length)
  }

  const { count: historyCount } = await db.from('status_history').select('*', { count: 'exact', head: true })
  console.log('   Status history:', historyCount)

  const { count: evalCount } = await db.from('evaluations').select('*', { count: 'exact', head: true })
  console.log('   Evaluations:', evalCount)

  const { count: invCount } = await db.from('inventory_tests').select('*', { count: 'exact', head: true })
  console.log('   Inventory tests:', invCount)

  const { count: warnCount } = await db.from('warnings').select('*', { count: 'exact', head: true })
  console.log('   Warnings:', warnCount)

  console.log('\n✅ Migration tamamlandi!')
}

migrate().catch((err) => {
  console.error('❌ Migration hatasi:', err)
  process.exit(1)
})
