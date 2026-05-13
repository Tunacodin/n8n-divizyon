import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NOTIF_LINKS: Record<string, string> = {
  mail_bekleyen: '/basvurular?tab=kesin_ret',
  kontrol_bekleyen: '/basvurular?tab=kontrol',
  oryantasyon_bekleyen: '/uyeler?tab=oryantasyon',
  uyari_gerekli: '/uyeler?tab=oryantasyon',
}

// GET /api/notifications
export async function GET() {
  const notifications: { type: string; severity: 'warning' | 'error' | 'info'; message: string; count: number }[] = []

  try {
    // 1. Mail bekleyen
    const mailBekleyen = await prisma.applications.count({
      where: {
        status: { in: ['kesin_ret', 'yas_kucuk'] },
        mail_sent: false,
        NOT: { email: '' },
      },
    })

    if (mailBekleyen > 0) {
      notifications.push({
        type: 'mail_bekleyen',
        severity: 'warning',
        message: `${mailBekleyen} kişiye red maili gönderilmedi`,
        count: mailBekleyen,
      })
    }

    // 2. Kontrol'de 1 günden fazla bekleyenler
    const oneDayAgo = new Date(Date.now() - 86400000)
    const kontrolBekleyen = await prisma.applications.count({
      where: { status: 'kontrol', created_at: { lt: oneDayAgo } },
    })

    if (kontrolBekleyen > 0) {
      notifications.push({
        type: 'kontrol_bekleyen',
        severity: 'warning',
        message: `${kontrolBekleyen} kişi 1+ gündür kontrol bekliyor`,
        count: kontrolBekleyen,
      })
    }

    // 3. Oryantasyon bekleyen
    const nihaiOlmayanlar = await prisma.applications.findMany({
      where: { status: { in: ['kesin_kabul', 'nihai_olmayan'] } },
      select: { id: true },
    })

    if (nihaiOlmayanlar.length > 0) {
      const ids = nihaiOlmayanlar.map((a) => a.id)
      const oryantasyonDone = await prisma.task_completions.findMany({
        where: { application_id: { in: ids }, task_type: 'oryantasyon', completed: true },
        select: { application_id: true },
      })
      const doneIds = new Set(oryantasyonDone.map((t) => t.application_id))
      const oryantasyonBekleyen = ids.filter((id) => !doneIds.has(id)).length

      if (oryantasyonBekleyen > 0) {
        notifications.push({
          type: 'oryantasyon_bekleyen',
          severity: 'info',
          message: `${oryantasyonBekleyen} kişinin oryantasyonu yapılmadı`,
          count: oryantasyonBekleyen,
        })
      }
    }

    // 4. Uyari gerekli
    if (nihaiOlmayanlar.length > 0) {
      const ids = nihaiOlmayanlar.map((a) => a.id)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

      const warnings = await prisma.warnings.findMany({
        where: { application_id: { in: ids } },
        orderBy: { created_at: 'desc' },
        select: { application_id: true, created_at: true },
      })

      const lastWarningMap = new Map<string, Date | null>()
      for (const w of warnings) {
        if (!lastWarningMap.has(w.application_id)) {
          lastWarningMap.set(w.application_id, w.created_at)
        }
      }

      const allTasks = await prisma.task_completions.findMany({
        where: { application_id: { in: ids }, completed: true },
        select: { application_id: true, task_type: true },
      })

      const tasksByApp = new Map<string, Set<string>>()
      for (const t of allTasks) {
        if (!tasksByApp.has(t.application_id)) tasksByApp.set(t.application_id, new Set())
        tasksByApp.get(t.application_id)!.add(t.task_type)
      }

      let uyariGerekli = 0
      for (const id of ids) {
        const tasks = tasksByApp.get(id) || new Set()
        const allDone = tasks.has('karakteristik_envanter') && tasks.has('disipliner_envanter') && tasks.has('oryantasyon')
        if (allDone) continue

        const lastWarning = lastWarningMap.get(id)
        if (!lastWarning) uyariGerekli++
        else if (lastWarning < sevenDaysAgo) uyariGerekli++
      }

      if (uyariGerekli > 0) {
        notifications.push({
          type: 'uyari_gerekli',
          severity: 'error',
          message: `${uyariGerekli} kişi uyarılmalı (haftalık kontrol)`,
          count: uyariGerekli,
        })
      }
    }

    // Persistence
    try {
      const activeTypes = new Set(notifications.map((n) => n.type))
      const now = new Date()

      const openRows = await prisma.notifications.findMany({
        where: { resolved_at: null },
        select: { id: true, type: true, count: true },
      })

      const openByType = new Map<string, { id: string; count: number }>()
      for (const r of openRows) openByType.set(r.type, { id: r.id, count: r.count })

      for (const n of notifications) {
        const existing = openByType.get(n.type)
        if (existing) {
          await prisma.notifications.update({
            where: { id: existing.id },
            data: { last_seen_at: now, count: n.count, title: n.message },
          })
        } else {
          await prisma.notifications.create({
            data: {
              type: n.type,
              severity: n.severity,
              title: n.message,
              count: n.count,
              link_href: NOTIF_LINKS[n.type] || null,
              first_seen_at: now,
              last_seen_at: now,
            },
          })
        }
      }

      const toResolve: string[] = []
      openByType.forEach((row, type) => {
        if (!activeTypes.has(type)) toResolve.push(row.id)
      })
      if (toResolve.length > 0) {
        await prisma.notifications.updateMany({
          where: { id: { in: toResolve } },
          data: { resolved_at: now },
        })
      }
    } catch {}

    return NextResponse.json({ success: true, notifications, total: notifications.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
