'use client'

import { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
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
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
      iconBg: 'bg-amber-100',
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
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-700',
      iconBg: 'bg-purple-100',
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
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-100',
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
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-700',
      iconBg: 'bg-green-100',
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
      text: 'text-rose-700',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-700',
      iconBg: 'bg-rose-100',
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
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-700',
      iconBg: 'bg-gray-100',
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
    'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
    'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500',
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
    <AnimatePresence>
      {data && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col md:flex-row"
          >
            {/* === MOBILE LAYOUT === */}
            <div className="md:hidden flex-1 overflow-y-auto">
              <div className="bg-gray-50 border-b border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold ${avatarColor}`}>
                      {initials}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{name}</h2>
                      {editOnayDurumu && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isKabul ? 'bg-green-100 text-green-700' : isRet ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {editOnayDurumu}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {editReviewer && (
                  <p className="text-xs text-gray-500"><span className="font-medium">Degerlendiren:</span> {editReviewer}</p>
                )}
                {editNote && (
                  <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Not:</span> {editNote}</p>
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
            <div className="hidden md:flex w-80 flex-col border-l border-gray-200 bg-gray-50 overflow-y-auto">
              {/* Close Button */}
              <div className="flex justify-end p-4 pb-0">
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex flex-col items-center px-6 pb-6">
                {/* Avatar */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 ${avatarColor}`}>
                  {initials}
                </div>

                {/* Name */}
                <h2 className="text-lg font-bold text-gray-900 text-center">{name}</h2>
                {email && (
                  <p className="text-xs text-gray-400 mt-0.5">{email}</p>
                )}

                {/* Divider */}
                <div className="w-full border-t border-gray-200 my-4" />

                {/* Editable: Onay Durumu */}
                <div className="w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Onay Durumu</label>
                  <select
                    value={editOnayDurumu}
                    onChange={(e) => { setEditOnayDurumu(e.target.value); setSaveStatus('idle') }}
                    className={`w-full text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isKabul ? 'border-green-300 text-green-700' : isRet ? 'border-red-300 text-red-700' : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {ONAY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt || '-- Sec --'}</option>
                    ))}
                  </select>
                </div>

                {/* Editable: Degerlendiren */}
                <div className="w-full mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Değerlendiren</label>
                  <select
                    value={editReviewer}
                    onChange={(e) => { setEditReviewer(e.target.value); setSaveStatus('idle') }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {DEGERLENDIREN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt || '-- Seç --'}</option>
                    ))}
                  </select>
                </div>

                {/* Editable: Not */}
                <div className="w-full mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Not</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => { setEditNote(e.target.value); setSaveStatus('idle') }}
                    placeholder="Degerlendirme notu..."
                    rows={3}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Save Button */}
                {hasChanges && (
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
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
                  <div className="w-full mt-2 flex items-center gap-1.5 text-green-600 text-xs">
                    <CheckCircleIcon className="w-4 h-4" />
                    Kaydedildi
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="w-full mt-2 flex items-center gap-1.5 text-red-600 text-xs">
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
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
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
                  <div className="w-full mt-2 flex items-center gap-1.5 text-green-600 text-xs">
                    <CheckCircleIcon className="w-4 h-4" />
                    Taşındı, kapanıyor...
                  </div>
                )}
                {moveStatus === 'error' && (
                  <div className="w-full mt-2 flex items-center gap-1.5 text-red-600 text-xs">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    {moveError}
                  </div>
                )}

                {/* Mail — sadece Kesin Kabul veya Kesin Ret secildiginde goster */}
                {(isKesinKabul || isKesinRet) && (
                  <>
                    {mailAtildiMi && (
                      <div className="w-full mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Mail Durumu</label>
                        <p className="text-sm text-gray-700">{mailAtildiMi}</p>
                      </div>
                    )}

                    <div className="w-full border-t border-gray-200 my-4" />

                    <div className="w-full">
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        {isKesinKabul ? 'Kabul Maili Gonder' : 'Red Maili Gonder'}
                      </label>

                      {!email ? (
                        <p className="text-xs text-gray-400 italic">E-posta adresi bulunamadi</p>
                      ) : sendStatus === 'success' ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
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
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                          />

                          {sendStatus === 'confirm' && (
                            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                              <strong>{name}</strong> kisisine ({email}) mail gonderilecek. Emin misin?
                            </p>
                          )}

                          {sendStatus === 'error' && (
                            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 rounded-lg p-2">
                              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-xs">{errorMessage}</span>
                            </div>
                          )}

                          <button
                            onClick={handleSendMail}
                            disabled={!selectedTemplateId || !subject || sendStatus === 'loading'}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              sendStatus === 'confirm'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : isKesinKabul
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-red-600 hover:bg-red-700 text-white'
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
                              className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
