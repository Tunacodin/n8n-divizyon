import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const revalidate = 60

// GET /api/notifications — Dashboard bildirimleri
export async function GET() {
  const db = createClient()
  const notifications: { type: string; severity: 'warning' | 'error' | 'info'; message: string; count: number }[] = []

  try {
    // 1. Kesin ret'te mail bekleyenler
    const { count: mailBekleyen } = await db
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('status', ['kesin_ret', 'yas_kucuk'])
      .eq('mail_sent', false)
      .neq('email', '')

    if (mailBekleyen && mailBekleyen > 0) {
      notifications.push({
        type: 'mail_bekleyen',
        severity: 'warning',
        message: `${mailBekleyen} kişiye red maili gönderilmedi`,
        count: mailBekleyen,
      })
    }

    // 2. Kontrol'de 1 günden fazla bekleyenler
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
    const { count: kontrolBekleyen } = await db
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'kontrol')
      .lt('created_at', oneDayAgo)

    if (kontrolBekleyen && kontrolBekleyen > 0) {
      notifications.push({
        type: 'kontrol_bekleyen',
        severity: 'warning',
        message: `${kontrolBekleyen} kişi 1+ gündür kontrol bekliyor`,
        count: kontrolBekleyen,
      })
    }

    // 3. Oryantasyonu yapılmamış üyeler (kesin_kabul statüsünde, oryantasyon task'ı tamamlanmamış)
    const { data: nihaiOlmayanlar } = await db
      .from('applications')
      .select('id')
      .in('status', ['kesin_kabul', 'nihai_olmayan'])

    if (nihaiOlmayanlar && nihaiOlmayanlar.length > 0) {
      const ids = nihaiOlmayanlar.map(a => a.id)
      const { data: oryantasyonDone } = await db
        .from('task_completions')
        .select('application_id')
        .in('application_id', ids)
        .eq('task_type', 'oryantasyon')
        .eq('completed', true)

      const doneIds = new Set((oryantasyonDone || []).map(t => t.application_id))
      const oryantasyonBekleyen = ids.filter(id => !doneIds.has(id)).length

      if (oryantasyonBekleyen > 0) {
        notifications.push({
          type: 'oryantasyon_bekleyen',
          severity: 'info',
          message: `${oryantasyonBekleyen} kişinin oryantasyonu yapılmadı`,
          count: oryantasyonBekleyen,
        })
      }
    }

    // 4. Uyarılması gereken kişiler (kesin_kabul, son uyarıdan 7+ gün geçmiş, görevler eksik)
    if (nihaiOlmayanlar && nihaiOlmayanlar.length > 0) {
      const ids = nihaiOlmayanlar.map(a => a.id)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

      const { data: warnings } = await db
        .from('warnings')
        .select('application_id, created_at')
        .in('application_id', ids)
        .order('created_at', { ascending: false })

      // Her application'ın son uyarı tarihini bul
      const lastWarningMap = new Map<string, string>()
      for (const w of warnings || []) {
        if (!lastWarningMap.has(w.application_id)) {
          lastWarningMap.set(w.application_id, w.created_at)
        }
      }

      // Görevleri tamamlanmamış olanları bul
      const { data: allTasks } = await db
        .from('task_completions')
        .select('application_id, task_type, completed')
        .in('application_id', ids)
        .eq('completed', true)

      const tasksByApp = new Map<string, Set<string>>()
      for (const t of allTasks || []) {
        if (!tasksByApp.has(t.application_id)) tasksByApp.set(t.application_id, new Set())
        tasksByApp.get(t.application_id)!.add(t.task_type)
      }

      let uyariGerekli = 0
      for (const id of ids) {
        const tasks = tasksByApp.get(id) || new Set()
        const allDone = tasks.has('karakteristik_envanter') && tasks.has('disipliner_envanter') && tasks.has('oryantasyon')
        if (allDone) continue

        const lastWarning = lastWarningMap.get(id)
        if (!lastWarning) {
          uyariGerekli++ // Hiç uyarı verilmemiş
        } else if (new Date(lastWarning) < new Date(sevenDaysAgo)) {
          uyariGerekli++ // Son uyarıdan 7+ gün geçmiş
        }
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

    return NextResponse.json({ success: true, notifications, total: notifications.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
