// ─── Status Etiketleri ───

const STATUS_LABELS: Record<string, string> = {
  basvuru: 'Başvuru',
  kontrol: 'Kontrol Listesi',
  kesin_kabul: 'Kesin Kabul',
  kesin_ret: 'Kesin Ret',
  nihai_olmayan: 'Kesin Kabul',
  yas_kucuk: '18 Yaş Altı',
  etkinlik: 'Etkinlikten Gelenler',
  deaktive: 'Deaktive',
  nihai_uye: 'Nihai Ağ Üyesi',
}

const TASK_LABELS: Record<string, string> = {
  karakteristik_envanter: 'Karakteristik Envanter Testi',
  disipliner_envanter: 'Disipliner Envanter Testi',
  oryantasyon: 'Oryantasyon',
}

// ─── Action türüne göre ikon ve renk ───

export interface ActivityMeta {
  icon: string
  color: string
  bgColor: string
  borderColor: string
}

export function getActivityMeta(action: string): ActivityMeta {
  switch (action) {
    case 'create':
      return { icon: '➕', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' }
    case 'status_change':
      return { icon: '🔀', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' }
    case 'update':
      return { icon: '✏️', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' }
    case 'evaluation_added':
      return { icon: '📋', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' }
    case 'task_completed':
    case 'task_manual_mark':
      return { icon: '✅', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' }
    case 'auto_tag_assigned':
      return { icon: '🏷️', color: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' }
    case 'inventory_email_mismatch':
      return { icon: '📧', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' }
    case 'karakteristik_envanter_completed':
    case 'disipliner_envanter_completed':
      return { icon: '📊', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' }
    case 'task_uncompleted':
      return { icon: '⬜', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
    case 'warning_added':
      return { icon: '⚠️', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' }
    case 'rollback':
      return { icon: '↩️', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' }
    case 'mail_sent':
    case 'batch_send':
      return { icon: '📧', color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' }
    default:
      return { icon: '📌', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
  }
}

// ─── Aktiviteyi okunabilir cümleye dönüştür ───

export interface Activity {
  id: string
  action: string
  actor: string
  person_name: string
  person_email: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  entity_id: string
  created_at: string
  metadata: Record<string, any> | null
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] || s
}

export function describeActivity(a: Activity): { summary: string; detail?: string } {
  const person = a.person_name

  switch (a.action) {
    case 'create': {
      const status = a.new_values?.status
      return {
        summary: `${person} kişisini sisteme yeni başvuru olarak ekledi.`,
        detail: status ? `Durum: ${statusLabel(status)}` : undefined,
      }
    }

    case 'status_change': {
      const from = a.old_values?.status
      const to = a.new_values?.status
      const reviewer = a.new_values?.reviewer

      if (to === 'deaktive') {
        return {
          summary: `${person} kişisini deaktive etti.`,
        }
      }

      if (to === 'kesin_ret') {
        return {
          summary: `${person} kişisini ${statusLabel(from)} listesinden Kesin Ret'e taşıdı.`,
          detail: reviewer ? `Değerlendiren: ${reviewer}` : undefined,
        }
      }

      if (to === 'kesin_kabul') {
        return {
          summary: `${person} kişisini ${statusLabel(from)} listesinden Kesin Kabul'e taşıdı.`,
          detail: reviewer ? `Değerlendiren: ${reviewer}` : undefined,
        }
      }

      if (to === 'nihai_uye') {
        return {
          summary: `${person} kişisini Nihai Ağ Üyesi olarak onayladı.`,
          detail: `Önceki durum: ${statusLabel(from)}`,
        }
      }

      if (to === 'yas_kucuk') {
        return {
          summary: `${person} kişisini 18 Yaş Altı listesine taşıdı.`,
          detail: `Önceki durum: ${statusLabel(from)}`,
        }
      }

      return {
        summary: `${person} kişisini ${statusLabel(from)} → ${statusLabel(to)} olarak güncelledi.`,
        detail: reviewer ? `Değerlendiren: ${reviewer}` : undefined,
      }
    }

    case 'update': {
      const fields = a.new_values ? Object.keys(a.new_values) : []
      const changes: string[] = []

      for (const key of fields) {
        const oldVal = a.old_values?.[key]
        if (oldVal && typeof oldVal === 'object' && 'old' in oldVal && 'new' in oldVal) {
          changes.push(`${fieldLabel(key)}: "${oldVal.old || '—'}" → "${oldVal.new}"`)
        }
      }

      if (changes.length > 0) {
        return {
          summary: `${person} kişisinin bilgilerini güncelledi.`,
          detail: changes.join(' | '),
        }
      }

      return {
        summary: `${person} kişisinin bilgilerini güncelledi.`,
        detail: fields.length > 0 ? `Güncellenen alanlar: ${fields.map(fieldLabel).join(', ')}` : undefined,
      }
    }

    case 'evaluation_added': {
      const decision = a.new_values?.decision
      const notes = a.new_values?.notes
      const decisionLabel = decision === 'kabul' ? 'olumlu' : decision === 'ret' ? 'olumsuz' : decision

      return {
        summary: `${person} için ${decisionLabel} değerlendirme yaptı.`,
        detail: notes ? `Not: "${notes}"` : undefined,
      }
    }

    case 'task_completed':
    case 'task_manual_mark': {
      const taskType = a.new_values?.task_type
      const label = TASK_LABELS[taskType] || taskType
      const isManual = a.action === 'task_manual_mark' || (a.actor || '').startsWith('admin_manual:')
      return {
        summary: `${person} için ${label} görevini ${isManual ? 'manuel olarak ' : ''}tamamlandı işaretledi.`,
      }
    }

    case 'auto_tag_assigned': {
      const tag = a.new_values?.tag
      const reason = a.new_values?.reason
      return {
        summary: `${person} için "${tag}" tag'i otomatik atandı.`,
        detail: reason ? `Kriter: ${reason}` : undefined,
      }
    }

    case 'inventory_email_mismatch': {
      const submitted = a.new_values?.submitted_email
      return {
        summary: `${person} envanter testini farklı bir e-posta (${submitted}) ile doldurdu — ad-soyad ile eşleştirildi.`,
      }
    }

    case 'karakteristik_envanter_completed':
    case 'disipliner_envanter_completed': {
      const testType = a.action.replace('_completed', '')
      const disc = a.new_values?.discipline
      const label = testType === 'karakteristik_envanter' ? 'Karakteristik envanter' : `Disipliner envanter (${disc || '—'})`
      return {
        summary: `${person} ${label} testini tamamladı.`,
      }
    }

    case 'task_uncompleted': {
      const taskType = a.new_values?.task_type
      const label = TASK_LABELS[taskType] || taskType

      return {
        summary: `${person} için ${label} görevini tamamlanmadı olarak geri aldı.`,
      }
    }

    case 'warning_added': {
      const warningNum = a.new_values?.warning_number
      const reason = a.new_values?.reason

      return {
        summary: `${person} kişisine ${warningNum}. uyarıyı verdi.`,
        detail: reason ? `Sebep: "${reason}"` : undefined,
      }
    }

    case 'rollback': {
      const oldStatus = a.old_values?.status
      const newStatus = a.new_values?.status

      return {
        summary: `${person} kişisini ${statusLabel(oldStatus)} durumundan ${statusLabel(newStatus)} durumuna geri aldı.`,
        detail: 'Önceki kayıt snapshot\'ından geri yüklendi.',
      }
    }

    case 'mail_sent': {
      const template = a.new_values?.template
      const subject = a.new_values?.subject

      return {
        summary: `${person} kişisine "${template || 'mail'}" gönderdi.`,
        detail: subject ? `Konu: "${subject}"` : undefined,
      }
    }

    case 'batch_send': {
      const count = a.new_values?.count
      const template = a.new_values?.template

      return {
        summary: `Toplu mail gönderdi (${count} kişi — ${template || 'şablon'}).`,
      }
    }

    default:
      return {
        summary: `${person} üzerinde "${a.action}" işlemi yaptı.`,
      }
  }
}

// ─── Helpers ───

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    full_name: 'Ad Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    main_role: 'Ana Rol',
    reviewer: 'Değerlendiren',
    review_note: 'Değerlendirme Notu',
    approval_status: 'Onay Durumu',
    warning_count: 'Uyarı Sayısı',
    mail_sent: 'Mail Gönderildi',
    mail_template: 'Mail Şablonu',
    status: 'Durum',
    birth_date: 'Doğum Tarihi',
    gender: 'Cinsiyet',
    university: 'Üniversite',
    department: 'Bölüm',
  }
  return map[key] || key
}

// ─── Tarih formatlama ───

export function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'az önce'
  if (diffMin < 60) return `${diffMin} dk önce`
  if (diffHour < 24) return `${diffHour} saat önce`
  if (diffDay < 7) return `${diffDay} gün önce`

  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── Günlere göre gruplama ───

export function groupByDay(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {}

  for (const a of activities) {
    const date = new Date(a.created_at)
    const key = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }

  return groups
}

// ─── Action Filtre Etiketleri ───

export const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tüm İşlemler' },
  { value: 'create', label: 'Yeni Başvuru' },
  { value: 'task_manual_mark', label: 'Manuel Görev İşaretleme' },
  { value: 'auto_tag_assigned', label: 'Otomatik Tag' },
  { value: 'karakteristik_envanter_completed', label: 'Karakteristik Envanter' },
  { value: 'disipliner_envanter_completed', label: 'Disipliner Envanter' },
  { value: 'inventory_email_mismatch', label: 'Envanter E-posta Uyuşmazlığı' },
  { value: 'status_change', label: 'Durum Değişikliği' },
  { value: 'update', label: 'Bilgi Güncelleme' },
  { value: 'evaluation_added', label: 'Değerlendirme' },
  { value: 'task_completed', label: 'Görev Tamamlama' },
  { value: 'warning_added', label: 'Uyarı' },
  { value: 'rollback', label: 'Geri Alma' },
  { value: 'mail_sent', label: 'Mail Gönderimi' },
]
