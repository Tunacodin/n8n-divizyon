'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { Dialog } from '@/components/ui/Dialog'
import { BasvuruCategory } from '../basvuru/basvuru-constants'
import BasvuruCategorySection from '../basvuru/BasvuruCategorySection'

interface MailTemplate {
  id: string
  name: string
  subject: string
}

type SendStatus = 'idle' | 'loading' | 'confirm' | 'success' | 'error'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type MoveStatus = 'idle' | 'moving' | 'moved' | 'error'

const ONAY_OPTIONS = ['', 'Beklemede', 'Kesin Kabul', 'Kesin Ret']
const DEGERLENDIREN_OPTIONS = ['', 'Tuna', 'Taha']

const KONTROL_CATEGORIES: BasvuruCategory[] = [
  {
    id: 'video',
    title: 'Video & Plan',
    icon: 'VideoCameraIcon',
    color: 'amber',
    colorClasses: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/30',
      badge: 'bg-warning/15 text-warning dark:text-warning',
      iconBg: 'bg-warning/15',
    },
    fields: [
      {
        key: 'Kendini ifade ettiğin en az 1 dakikalık videoyu herhangi bir platforma (Google Drive, YouTube vb.) yükleyerek linkini bizimle paylaşabilirsin. ',
        label: 'Video / Plan Anlatımı',
        type: 'longtext',
      },
      {
        key: 'Video linki (kısa)',
        label: 'Video Linki',
        type: 'url',
      },
    ],
  },
  {
    id: 'gelecek',
    title: 'Alanın Geleceği',
    icon: 'SparklesIcon',
    color: 'purple',
    colorClasses: {
      bg: 'bg-primary/5',
      text: 'text-primary',
      border: 'border-primary/30',
      badge: 'bg-primary/15 text-primary',
      iconBg: 'bg-primary/15',
    },
    fields: [
      {
        key: 'Alanının geleceği hakkında, heyecan verici veya farklı bulduğun bir fikrin var mı? Kısaca bahseder misin?',
        label: 'Gelecek Fikirleri',
        type: 'longtext',
      },
    ],
  },
  {
    id: 'geribildirim',
    title: 'Geri Bildirim',
    icon: 'ChatBubbleLeftRightIcon',
    color: 'blue',
    colorClasses: {
      bg: 'bg-info/10',
      text: 'text-info',
      border: 'border-info/30',
      badge: 'bg-info/15 text-info',
      iconBg: 'bg-info/15',
    },
    fields: [
      {
        key: 'Bir işinde aldığın geri bildirim sayesinde "İyi ki bunu öğrenmişim" dediğin bir an oldu mu? Kısaca anlatır mısın?',
        label: 'Geri Bildirim Deneyimi',
        type: 'longtext',
      },
    ],
  },
  {
    id: 'proje',
    title: 'Proje Fikri',
    icon: 'SparklesIcon',
    color: 'green',
    colorClasses: {
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/30',
      badge: 'bg-success/15 text-success',
      iconBg: 'bg-success/15',
    },
    fields: [
      {
        key: 'Aklına harika bir proje fikri geldi. Hayata geçirmek için attığın ilk 3 somut adım ne olurdu?',
        label: 'İlk 3 Adım',
        type: 'longtext',
      },
      {
        key: 'Proje fikri (kısa)',
        label: 'Proje Fikri (Kısa)',
        type: 'text',
      },
    ],
  },
  {
    id: 'merak',
    title: 'Merak Konusu',
    icon: 'HeartIcon',
    color: 'rose',
    colorClasses: {
      bg: 'bg-rose-50',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200',
      badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/15',
    },
    fields: [
      {
        key: 'Son zamanlarda uzmanlık alanın hariç, merakını en çok cezbeden konu ne oldu ve neden?',
        label: 'Merak Konusu',
        type: 'longtext',
      },
    ],
  },
  {
    id: 'ek',
    title: 'Ek Notlar',
    icon: 'InformationCircleIcon',
    color: 'gray',
    colorClasses: {
      bg: 'bg-muted/50',
      text: 'text-foreground',
      border: 'border-border',
      badge: 'bg-muted text-foreground',
      iconBg: 'bg-muted',
    },
    fields: [
      {
        key: 'Eklemek veya belirtmek istediğin herhangi bir şey var mı?',
        label: 'Eklemek İstediği',
        type: 'longtext',
      },
    ],
  },
]

interface KontrolDetailModalProps {
  data: Record<string, any> | null
  onClose: () => void
}

async function updateApplication(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updated_by: 'dashboard', ...updates }),
  })
  return res.json()
}

export default function KontrolDetailModal({ data, onClose }: KontrolDetailModalProps) {
  // Mail send state
  const [templates, setTemplates] = useState<MailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [subject, setSubject] = useState('')

  // Editable field state
  const [editOnayDurumu, setEditOnayDurumu] = useState('')
  const [editReviewer, setEditReviewer] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const [moveStatus, setMoveStatus] = useState<MoveStatus>('idle')
  const [moveError, setMoveError] = useState('')

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  // Fetch templates when modal opens
  useEffect(() => {
    if (data) {
      fetch('/api/mail/templates')
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setTemplates(res.data)
        })
        .catch(() => {})
    }
  }, [data])

  // Initialize editable fields from data
  useEffect(() => {
    if (data) {
      setEditOnayDurumu((data.approval_status || '') || '')
      setEditReviewer((data.reviewer || '') || '')
      setEditNote((data.review_note || '') || '')
      setSendStatus('idle')
      setSelectedTemplateId(null)
      setSubject('')
      setErrorMessage('')
      setSaveStatus('idle')
      setSaveError('')
      setMoveStatus('idle')
      setMoveError('')
    }
  }, [data])

  useEffect(() => {
    if (data) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [data, handleKeyDown])

  if (!data) return null

  const name = (data.full_name || '') || 'İsimsiz'
  const email = (data.email || '') || ''
  const mailAtildiMi = (data.mail_sent ? 'Evet' : '') || ''

  const nameParts = name.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  // Check if fields have changed
  const origOnay = (data.approval_status || '') || ''
  const origReviewer = (data.reviewer || '') || ''
  const origNote = (data.review_note || '') || ''
  const hasChanges =
    editOnayDurumu !== origOnay ||
    editReviewer !== origReviewer ||
    editNote !== origNote

  const handleSave = async () => {
    if (!email || !hasChanges) return

    setSaveStatus('saving')
    setSaveError('')

    const updates: Record<string, string> = {}
    if (editOnayDurumu !== origOnay) updates.approval_status = editOnayDurumu
    if (editReviewer !== origReviewer) updates.reviewer = editReviewer
    if (editNote !== origNote) updates.review_note = editNote

    try {
      const result = await updateApplication(data.id, updates)
      if (result.success) {
        setSaveStatus('saved')
        if (updates.approval_status !== undefined) data.approval_status = editOnayDurumu
        if (updates.reviewer !== undefined) data.reviewer = editReviewer
        if (updates.review_note !== undefined) data.review_note = editNote
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        setSaveError(result.error || 'Kaydetme basarisiz')
      }
    } catch {
      setSaveStatus('error')
      setSaveError('Baglanti hatasi')
    }
  }

  const handleSendMail = async () => {
    if (sendStatus === 'idle' || sendStatus === 'error') {
      setSendStatus('confirm')
      return
    }

    if (sendStatus === 'confirm') {
      setSendStatus('loading')
      setErrorMessage('')

      try {
        const res = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            firstName,
            lastName,
            template_id: selectedTemplateId,
            subject: subject || undefined,
            application_id: data.id,
            sent_by: 'dashboard',
          }),
        })

        const result = await res.json()

        if (result.success) {
          setSendStatus('success')
          data.mail_sent = true
        } else {
          setSendStatus('error')
          setErrorMessage(result.error || 'Gonderim basarisiz')
        }
      } catch {
        setSendStatus('error')
        setErrorMessage('Baglanti hatasi')
      }
    }
  }

  const initials = name
    .split(' ')
    .map((part: string) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = [
    'bg-primary', 'bg-primary', 'bg-primary', 'bg-pink-500',
    'bg-rose-500', 'bg-warning', 'bg-success', 'bg-teal-500',
  ]
  const colorIndex = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length
  const avatarColor = colors[colorIndex]

  const isKesinKabul = editOnayDurumu === 'Kesin Kabul'
  const isKesinRet = editOnayDurumu === 'Kesin Ret'
  const isKabul = isKesinKabul
  const isRet = isKesinRet

  const canMove = (isKesinKabul || isKesinRet) && !!editReviewer && !!email

  const handleMove = async () => {
    if (!canMove) return
    setMoveStatus('moving')
    setMoveError('')
    try {
      // Mail-first: Template secildiyse VE mail henuz gonderilmediyse, once mail.
      // Mail hatasi olursa status degistirme.
      const needsMail = !!selectedTemplateId && !data.mail_sent
      if (needsMail) {
        const mailRes = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            firstName,
            lastName,
            template_id: selectedTemplateId,
            subject: subject || undefined,
            application_id: data.id,
            sent_by: editReviewer || 'dashboard',
          }),
        })
        const mailData = await mailRes.json().catch(() => ({ success: false }))
        if (!mailRes.ok || !mailData.success) {
          setMoveStatus('error')
          setMoveError(`Mail gonderilemedi: ${mailData.error || 'bilinmeyen hata'}. Tasima iptal edildi.`)
          return
        }
        data.mail_sent = true
      }

      const toStatus = isKesinKabul ? 'kesin_kabul' : 'kesin_ret'
      const res = await fetch(`/api/applications/${data.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: toStatus,
          changed_by: editReviewer,
          extra_updates: { reviewer: editReviewer, review_note: editNote },
        }),
      })
      const result = await res.json()
      if (result.success) {
        setMoveStatus('moved')
        setTimeout(() => onClose(), 1500)
      } else {
        setMoveStatus('error')
        setMoveError(result.error || 'Taşıma başarısız')
      }
    } catch {
      setMoveStatus('error')
      setMoveError('Bağlantı hatası')
    }
  }

  return (
    <Dialog open={!!data} onClose={onClose} size="2xl">
      {data && (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            {/* === MOBILE LAYOUT === */}
            <div className="md:hidden flex-1 overflow-y-auto">
              <div className="bg-muted/50 border-b border-border p-5 pr-14">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 ${avatarColor}`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
                    {editOnayDurumu && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isKabul ? 'bg-success/15 text-success' : isRet ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'
                      }`}>
                        {editOnayDurumu}
                      </span>
                    )}
                  </div>
                </div>
                {editReviewer && (
                  <p className="text-xs text-muted-foreground"><span className="font-medium">Degerlendiren:</span> {editReviewer}</p>
                )}
                {editNote && (
                  <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Not:</span> {editNote}</p>
                )}
              </div>

              <div className="p-4 space-y-3">
                {KONTROL_CATEGORIES.map((category, index) => (
                  <BasvuruCategorySection
                    key={category.id}
                    category={category}
                    data={data}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* === DESKTOP LAYOUT === */}

            {/* Left Panel: Scrollable Accordion Categories */}
            <div className="hidden md:flex flex-1 flex-col overflow-y-auto">
              <div className="p-6 space-y-3">
                {KONTROL_CATEGORIES.map((category, index) => (
                  <BasvuruCategorySection
                    key={category.id}
                    category={category}
                    data={data}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Right Panel: Profile Card + Editable Fields */}
            <div className="hidden md:flex w-80 shrink-0 flex-col border-l border-border bg-muted/50 overflow-y-auto">
              <div className="flex flex-col items-center px-6 pt-6 pb-6 pr-14">
                {/* Avatar */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 ${avatarColor}`}>
                  {initials}
                </div>

                {/* Name */}
                <h2 className="text-lg font-bold text-foreground text-center">{name}</h2>
                {email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
                )}

                {/* Divider */}
                <div className="w-full border-t border-border my-4" />

                {/* Editable: Onay Durumu */}
                <div className="w-full">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Onay Durumu</label>
                  <select
                    value={editOnayDurumu}
                    onChange={(e) => {
                      const val = e.target.value
                      setEditOnayDurumu(val)
                      setSaveStatus('idle')
                      // Mail template auto-suggest — PDF akışına göre
                      if (selectedTemplateId) return // kullanıcı zaten seçmiş, dokunma
                      const note = ((editNote || data?.review_note || '') as string).toLowerCase()
                      const isUnder18 = data?.status === 'yas_kucuk' || (note.includes('18') && (note.includes('yas') || note.includes('yaş')))
                      let suggestId: string | null = null
                      if (val === 'Kesin Kabul') suggestId = 'kesin-kabul'
                      else if (val === 'Kesin Ret') {
                        if (isUnder18) suggestId = 'kesin-ret-18yas'
                        else if (note.includes('topluluk') && note.includes('ilke')) suggestId = 'kesin-ret-topluluk'
                        else suggestId = 'kesin-ret'
                      }
                      if (suggestId) {
                        const tmpl = templates.find((t) => t.id === suggestId)
                        if (tmpl) {
                          setSelectedTemplateId(suggestId)
                          if (!subject) setSubject(tmpl.subject || '')
                        }
                      }
                    }}
                    className={`w-full text-sm border rounded-lg px-3 py-2 bg-card focus:ring-2 focus:ring-ring focus:border-primary ${
                      isKabul ? 'border-green-300 text-success' : isRet ? 'border-red-300 text-destructive' : 'border-border text-foreground'
                    }`}
                  >
                    {ONAY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt || '-- Sec --'}</option>
                    ))}
                  </select>
                </div>

                {/* Editable: Degerlendiren */}
                <div className="w-full mt-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Değerlendiren</label>
                  <select
                    value={editReviewer}
                    onChange={(e) => { setEditReviewer(e.target.value); setSaveStatus('idle') }}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                  >
                    {DEGERLENDIREN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt || '-- Seç --'}</option>
                    ))}
                  </select>
                </div>

                {/* Editable: Not */}
                <div className="w-full mt-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Not</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => { setEditNote(e.target.value); setSaveStatus('idle') }}
                    placeholder="Degerlendirme notu..."
                    rows={3}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card focus:ring-2 focus:ring-ring focus:border-primary resize-none"
                  />
                </div>

                {/* Gorev Durumu — uye olmus statülerde göster */}
                {(() => {
                  const memberStatuses = ['kesin_kabul', 'nihai_olmayan', 'nihai_uye', 'etkinlik']
                  if (!data?.status || !memberStatuses.includes(data.status as string)) return null
                  const tasks = ((data as { tasks?: Array<{ task_type: string; completed: boolean; completed_at?: string; verified_by?: string }> }).tasks) || []
                  const taskMap = new Map(tasks.map((t) => [t.task_type, t]))
                  const TASK_DEFS: Array<{ key: string; label: string }> = [
                    { key: 'karakteristik_envanter', label: 'Karakteristik Envanter' },
                    { key: 'disipliner_envanter',    label: 'Disipliner Envanter' },
                    { key: 'oryantasyon',            label: 'Oryantasyon' },
                  ]
                  const warningCount = Number((data as { warning_count?: number }).warning_count || 0)
                  return (
                    <div className="w-full mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-muted-foreground">Görev Durumu</label>
                        {warningCount > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              warningCount >= 2 ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
                            }`}
                            title={warningCount >= 2 ? 'Kritik — 2 uyarı (Circle deaktif eşiği)' : 'Uyarı var'}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                            </svg>
                            {warningCount} uyarı
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {TASK_DEFS.map((td) => {
                          const t = taskMap.get(td.key)
                          const done = !!t?.completed
                          return (
                            <li key={td.key} className="flex items-center gap-2 text-xs">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
                                done ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                              }`}>
                                {done ? (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" />
                                  </svg>
                                )}
                              </span>
                              <span className={`flex-1 ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{td.label}</span>
                              {done && t?.verified_by && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={t.verified_by}>
                                  {t.verified_by}
                                </span>
                              )}
                              {done && t?.completed_at && (
                                <span className="text-[10px] text-muted-foreground/80 tabular-nums">
                                  {new Date(t.completed_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {/* Tags (karakteristik envanter sonucu) */}
                      {((data as { tags?: string[] }).tags || []).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Tag</label>
                          <div className="flex flex-wrap gap-1">
                            {((data as { tags?: string[] }).tags || []).map((t) => (
                              <span key={t} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Save Button */}
                {hasChanges && (
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <PencilSquareIcon className="w-4 h-4" />
                        Kaydet
                      </>
                    )}
                  </button>
                )}

                {/* Save feedback */}
                {saveStatus === 'saved' && (
                  <div className="w-full mt-2 flex items-center gap-1.5 text-success text-xs">
                    <CheckCircleIcon className="w-4 h-4" />
                    Kaydedildi
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="w-full mt-2 flex items-center gap-1.5 text-destructive text-xs">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    {saveError}
                  </div>
                )}

                {/* Taşı Butonu */}
                {canMove && moveStatus !== 'moved' && (
                  <button
                    onClick={handleMove}
                    disabled={moveStatus === 'moving'}
                    className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      isKesinKabul
                        ? 'bg-success hover:bg-success/90 text-white'
                        : 'bg-destructive hover:bg-destructive/90 text-white'
                    }`}
                  >
                    {moveStatus === 'moving' ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Taşınıyor...
                      </>
                    ) : isKesinKabul ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        Kesin Kabul'a Taşı
                      </>
                    ) : (
                      <>
                        <ExclamationCircleIcon className="w-4 h-4" />
                        Kesin Ret'e Taşı
                      </>
                    )}
                  </button>
                )}
                {moveStatus === 'moved' && (
                  <div className="w-full mt-2 flex items-center gap-1.5 text-success text-xs">
                    <CheckCircleIcon className="w-4 h-4" />
                    Taşındı, kapanıyor...
                  </div>
                )}
                {moveStatus === 'error' && (
                  <div className="w-full mt-2 flex items-center gap-1.5 text-destructive text-xs">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    {moveError}
                  </div>
                )}

                {/* Mail — sadece Kesin Kabul veya Kesin Ret secildiginde goster */}
                {(isKesinKabul || isKesinRet) && (
                  <>
                    {mailAtildiMi && (
                      <div className="w-full mt-3">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Mail Durumu</label>
                        <p className="text-sm text-foreground">{mailAtildiMi}</p>
                      </div>
                    )}

                    <div className="w-full border-t border-border my-4" />

                    <div className="w-full">
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        {isKesinKabul ? 'Kabul Maili Gonder' : 'Red Maili Gonder'}
                      </label>

                      {!email ? (
                        <p className="text-xs text-muted-foreground italic">E-posta adresi bulunamadi</p>
                      ) : sendStatus === 'success' ? (
                        <div className="flex items-center gap-2 text-success bg-success/10 rounded-lg p-3">
                          <CheckCircleIcon className="w-5 h-5" />
                          <span className="text-sm font-medium">Mail gonderildi!</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={selectedTemplateId ?? ''}
                            onChange={(e) => {
                              const id = e.target.value || null
                              setSelectedTemplateId(id)
                              setSendStatus('idle')
                              const tmpl = templates.find((t) => t.id === id)
                              if (tmpl) setSubject(tmpl.subject)
                            }}
                            disabled={sendStatus === 'loading'}
                            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50"
                          >
                            <option value="">Template sec...</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>

                          <input
                            type="text"
                            placeholder="Mail konusu..."
                            value={subject}
                            onChange={(e) => {
                              setSubject(e.target.value)
                              if (sendStatus === 'confirm') setSendStatus('idle')
                            }}
                            disabled={sendStatus === 'loading'}
                            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50"
                          />

                          {sendStatus === 'confirm' && (
                            <p className="text-xs text-warning bg-warning/10 rounded-lg p-2">
                              <strong>{name}</strong> kisisine ({email}) mail gonderilecek. Emin misin?
                            </p>
                          )}

                          {sendStatus === 'error' && (
                            <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 rounded-lg p-2">
                              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-xs">{errorMessage}</span>
                            </div>
                          )}

                          <button
                            onClick={handleSendMail}
                            disabled={!selectedTemplateId || !subject || sendStatus === 'loading'}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              sendStatus === 'confirm'
                                ? 'bg-warning hover:bg-warning/90 text-white'
                                : isKesinKabul
                                  ? 'bg-success hover:bg-success/90 text-white'
                                  : 'bg-destructive hover:bg-destructive/90 text-white'
                            }`}
                          >
                            {sendStatus === 'loading' ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Gonderiliyor...
                              </>
                            ) : sendStatus === 'confirm' ? (
                              <>Evet, Gonder</>
                            ) : (
                              <>
                                <EnvelopeIcon className="w-4 h-4" />
                                {isKesinKabul ? 'Kabul Maili' : 'Red Maili'} Gonder
                              </>
                            )}
                          </button>

                          {sendStatus === 'confirm' && (
                            <button
                              onClick={() => setSendStatus('idle')}
                              className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
                            >
                              Vazgec
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
        </div>
      )}
    </Dialog>
  )
}
