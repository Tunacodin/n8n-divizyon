/**
 * Excel → DB import.
 * - Mevcut @example.com (seed) ve source='excel_import' kayıtları siler (idempotent)
 * - prisma/imports.json içindeki kayıtları applications tablosuna yazar
 * - HİÇBİR mail gönderilmez (mail_sent=false), n8n webhook tetiklenmez
 *
 * Çalıştırma: docker compose exec -T next-app npx tsx prisma/import-excel.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()

interface ImportRecord {
  email: string
  full_name: string
  status: string
  birth_date?: string | null
  gender?: string | null
  phone?: string | null
  professional_status?: string | null
  university?: string | null
  university_other?: string | null
  department?: string | null
  education_type?: string | null
  work_detail?: string | null
  main_role?: string | null
  role_creative_content?: string | null
  role_visual_designer?: string | null
  role_animation?: string | null
  role_video_content?: string | null
  role_audio_music?: string | null
  role_digital_asset?: string | null
  role_digital_product?: string | null
  role_web_app?: string | null
  role_advanced_tech?: string | null
  role_game?: string | null
  role_digital_experience?: string | null
  role_uiux?: string | null
  role_interactive?: string | null
  role_installation?: string | null
  role_interdisciplinary?: string | null
  core_values?: string | null
  community_contribution?: string | null
  ecosystem_contribution?: string | null
  self_expression?: string | null
  video_link?: string | null
  plan_description?: string | null
  principle_1?: string | null
  principle_2?: string | null
  principle_3?: string | null
  principle_4?: string | null
  principle_5?: string | null
  principle_6?: string | null
  principle_7?: string | null
  principle_8?: string | null
  principle_9?: string | null
  principle_10?: string | null
  future_ideas?: string | null
  feedback_experience?: string | null
  project_steps?: string | null
  curiosity_topic?: string | null
  additional_notes?: string | null
  submitted_at?: string | null
  form_token?: string | null
  reviewer?: string | null
  review_note?: string | null
  mail_template?: string | null
  mail_sent?: boolean
  source?: string | null
  source_sheet?: string | null
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  const jsonPath = path.join(process.cwd(), 'prisma', 'imports.json')
  console.log(`\n=== Excel Import ===`)
  console.log(`Dosya: ${jsonPath}`)

  const records: ImportRecord[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  console.log(`Okunan kayıt: ${records.length}`)

  // 1. Eski seed (@example.com) ve onceki Excel importları sil — idempotent
  console.log(`\n--- Eski kayıtlar temizleniyor ---`)
  const oldApps = await prisma.applications.findMany({
    where: {
      OR: [
        { email: { endsWith: '@example.com' } },
        { source: 'excel_import' },
      ],
    },
    select: { id: true },
  })
  const oldIds = oldApps.map(a => a.id)
  if (oldIds.length > 0) {
    // Cascade ile iliskili kayitlar otomatik silinir
    await prisma.status_history.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.task_completions.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.warnings.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.evaluations.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.mail_logs.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.application_snapshots.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.event_attendees.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.inventory_tests.deleteMany({ where: { application_id: { in: oldIds } } })
    await prisma.applications.deleteMany({ where: { id: { in: oldIds } } })
    console.log(`  ${oldIds.length} eski kayıt silindi (cascade)`)
  } else {
    console.log(`  Eski kayıt yok`)
  }

  // 2. Yeni kayıtlar bulk insert
  console.log(`\n--- Insert başlıyor ---`)
  const stats: Record<string, number> = {}
  let inserted = 0
  let errors = 0

  // PostgreSQL parameter limit (65535) için batch'le
  // Her kayıt yaklaşık 50 alan → batch_size 200 güvenli
  const BATCH_SIZE = 100

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const dataBatch = batch.map(r => {
      const submittedAt = parseDate(r.submitted_at)
      const now = new Date()
      return {
        email: r.email,
        full_name: r.full_name,
        status: r.status,
        birth_date: r.birth_date,
        gender: r.gender,
        phone: r.phone,
        professional_status: r.professional_status,
        university: r.university,
        university_other: r.university_other,
        department: r.department,
        education_type: r.education_type,
        work_detail: r.work_detail,
        main_role: r.main_role,
        role_creative_content: r.role_creative_content,
        role_visual_designer: r.role_visual_designer,
        role_animation: r.role_animation,
        role_video_content: r.role_video_content,
        role_audio_music: r.role_audio_music,
        role_digital_asset: r.role_digital_asset,
        role_digital_product: r.role_digital_product,
        role_web_app: r.role_web_app,
        role_advanced_tech: r.role_advanced_tech,
        role_game: r.role_game,
        role_digital_experience: r.role_digital_experience,
        role_uiux: r.role_uiux,
        role_interactive: r.role_interactive,
        role_installation: r.role_installation,
        role_interdisciplinary: r.role_interdisciplinary,
        core_values: r.core_values,
        community_contribution: r.community_contribution,
        ecosystem_contribution: r.ecosystem_contribution,
        self_expression: r.self_expression,
        video_link: r.video_link,
        plan_description: r.plan_description,
        principle_1: r.principle_1,
        principle_2: r.principle_2,
        principle_3: r.principle_3,
        principle_4: r.principle_4,
        principle_5: r.principle_5,
        principle_6: r.principle_6,
        principle_7: r.principle_7,
        principle_8: r.principle_8,
        principle_9: r.principle_9,
        principle_10: r.principle_10,
        future_ideas: r.future_ideas,
        feedback_experience: r.feedback_experience,
        project_steps: r.project_steps,
        curiosity_topic: r.curiosity_topic,
        additional_notes: r.additional_notes,
        submitted_at: submittedAt,
        form_token: r.form_token,
        reviewer: r.reviewer,
        review_note: r.review_note,
        mail_template: r.mail_template,
        mail_sent: false, // ASLA mail atmiyoruz
        approval_status: r.status === 'kesin_kabul' ? 'Kabul' : r.status === 'kesin_ret' ? 'Ret' : undefined,
        source: r.source || 'excel_import',
        is_protected: false,
        warning_count: 0,
        tags: [] as string[],
        created_at: submittedAt || now,
        updated_at: now,
        status_changed_at: now,
        approved_at: ['kesin_kabul', 'nihai_uye'].includes(r.status) ? now : null,
      }
    })

    try {
      const result = await prisma.applications.createMany({
        data: dataBatch,
        skipDuplicates: true,
      })
      inserted += result.count
      for (const r of batch) {
        stats[r.status] = (stats[r.status] || 0) + 1
      }
      process.stdout.write(`  [${i + batch.length}/${records.length}] +${result.count}\r`)
    } catch (e) {
      errors++
      console.error(`\n  Batch ${i}-${i + batch.length} hata:`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`\n\n=== SONUÇ ===`)
  console.log(`Insert edilen   : ${inserted}`)
  console.log(`Hata batch      : ${errors}`)
  console.log(`\nStatus dağılımı:`)
  for (const [s, n] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(14)} ${n}`)
  }
  console.log(`\nÖnemli: mail_sent=false — hiç mail gönderilmedi.\n`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
