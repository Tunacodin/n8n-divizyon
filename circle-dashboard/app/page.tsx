'use client'

import { useState, useEffect, useMemo } from 'react'

interface Breakdown {
  [key: string]: { count: number; label: string; color: string }
}

interface AppItem {
  id: string
  full_name: string
  email: string
  phone: string
  status: string
  main_role: string
  university: string
  reviewer: string
  approval_status: string
  review_note: string
  mail_sent: boolean
  mail_template: string
  submitted_at: string
  birth_date: string
  gender: string
  professional_status: string
  department: string
  education_type: string
  core_values: string
  self_expression: string
  video_link: string
  plan_description: string
  future_ideas: string
  feedback_experience: string
  project_steps: string
  curiosity_topic: string
  additional_notes: string
  [key: string]: string | boolean | number | null | undefined
}

const PIPELINE_STEPS = [
  { key: 'kesin_ret', label: 'Kesin Ret', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ring: 'ring-red-400' },
  { key: 'kontrol', label: 'Kontrol', color: '#EAB308', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', ring: 'ring-yellow-400' },
  { key: 'kesin_kabul', label: 'Kesin Kabul', color: '#22C55E', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-400' },
  { key: 'nihai_olmayan', label: 'Nihai Olmayan', color: '#A855F7', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', ring: 'ring-purple-400' },
  { key: 'nihai_uye', label: 'Nihai Uye', color: '#D97706', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-400' },
]

const EXIT_STATUSES = [
  { key: 'yas_kucuk', label: '18 Yas Alti', color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', ring: 'ring-orange-400' },
  { key: 'deaktive', label: 'Deaktive', color: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', ring: 'ring-gray-400' },
  { key: 'etkinlik', label: 'Etkinlik', color: '#06B6D4', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', ring: 'ring-cyan-400' },
]

const ALL_STATUSES = [...PIPELINE_STEPS, ...EXIT_STATUSES]

function getQuickActions(status: string) {
  // Kontrol: sadece Kesin Kabul veya Kesin Ret (manuel karar)
  // 18 yaş ve topluluk ihlalleri n8n otomasyonu tarafından direkt kesin_ret'e yazılır, kontrol'e düşmez
  if (status === 'kontrol') return [
    { label: 'Kesin Kabul', toStatus: 'kesin_kabul', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'Kesin Ret', toStatus: 'kesin_ret', color: 'bg-red-500 hover:bg-red-600' },
  ]
  if (status === 'kesin_kabul') return [{ label: 'Nihai Olmayan', toStatus: 'nihai_olmayan', color: 'bg-purple-500 hover:bg-purple-600' }]
  if (status === 'nihai_olmayan') return [
    { label: 'Nihai Uye', toStatus: 'nihai_uye', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Deaktive Et', toStatus: 'deaktive', color: 'bg-gray-500 hover:bg-gray-600' },
  ]
  if (status === 'etkinlik') return [{ label: 'Kontrole Al', toStatus: 'kontrol', color: 'bg-yellow-500 hover:bg-yellow-600' }]
  return []
}

// ─── Detail Info Section ───
function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null
  return (
    <div>
      <span className="text-gray-400 text-[11px]">{label}</span>
      <p className="text-gray-800 text-xs leading-relaxed">{value}</p>
    </div>
  )
}

function QABlock({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null
  return (
    <div className="bg-white rounded p-2 border border-gray-100">
      <span className="text-gray-400 text-[10px] block mb-0.5">{label}</span>
      <p className="text-gray-700 text-xs leading-relaxed">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const [allApps, setAllApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Degerlendirme formu
  const [reviewer, setReviewer] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [mailTemplates, setMailTemplates] = useState<{ id: string; name: string; subject?: string }[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [mailSubject, setMailSubject] = useState('')

  useEffect(() => { fetchData() }, [])

  // selectedApp degisince formu resetle
  useEffect(() => {
    if (selectedApp) {
      setReviewer(selectedApp.reviewer || '')
      setReviewNote(selectedApp.review_note || '')
      setSelectedTemplateId(null)
      setMailSubject('')
    }
  }, [selectedApp])

  const fetchData = async () => {
    try {
      const [statsRes, appsRes, tplRes] = await Promise.all([
        fetch('/api/applications/stats'),
        fetch('/api/applications?sort=submitted_at&order=desc&limit=500'),
        fetch('/api/mail/templates'),
      ])
      const s = await statsRes.json()
      const a = await appsRes.json()
      const t = await tplRes.json()
      if (s.success) setBreakdown(s.breakdown)
      if (a.success) setAllApps(a.data || [])
      if (t.success) setMailTemplates(t.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const totalCount = breakdown ? Object.values(breakdown).reduce((s, v) => s + v.count, 0) : 0

  const filteredApps = useMemo(() => {
    if (!selectedStep) return []
    let items = allApps.filter(a => a.status === selectedStep)
    // Kesin ret: sadece mail bekleyenleri göster (mail gönderilmişler Başvurular > Kesin Ret tab'ında)
    if (selectedStep === 'kesin_ret' || selectedStep === 'yas_kucuk') {
      items = items.filter(a => !a.mail_sent)
    }
    return items
  }, [allApps, selectedStep])

  // Gün bazlı gruplama
  const groupedByDate = useMemo(() => {
    const groups: { date: string; label: string; apps: AppItem[] }[] = []
    const map = new Map<string, AppItem[]>()
    for (const app of filteredApps) {
      const dt = String(app.submitted_at || (app as Record<string, unknown>).created_at || '')
      const dateKey = dt ? dt.slice(0, 10) : 'tarihsiz'
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(app)
    }
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    for (const [dateKey, apps] of Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
      let label = dateKey
      if (dateKey === today) label = 'Bugün'
      else if (dateKey === yesterday) label = 'Dün'
      else if (dateKey !== 'tarihsiz') {
        const d = new Date(dateKey)
        label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
      }
      // Saat bazlı sırala (en yeni üstte)
      apps.sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')))
      groups.push({ date: dateKey, label, apps })
    }
    return groups
  }, [filteredApps])

  const handleAction = async (app: AppItem, toStatus: string) => {
    // Kesin kabul/ret icin reviewer zorunlu
    if (['kesin_kabul', 'kesin_ret', 'yas_kucuk'].includes(toStatus) && !reviewer.trim()) {
      setToast({ type: 'error', text: 'Degerlendiren secilmeli' })
      setTimeout(() => setToast(null), 2500)
      return
    }

    setActionLoading(true)
    try {
      // 1. Status degistir
      const res = await fetch(`/api/applications/${app.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: toStatus,
          changed_by: reviewer.trim() || 'dashboard',
          extra_updates: {
            reviewer: reviewer.trim() || undefined,
            review_note: reviewNote.trim() || undefined,
          },
        }),
      })
      const r = await res.json()

      if (!r.success) {
        setToast({ type: 'error', text: r.error || 'Hata' })
        setActionLoading(false)
        return
      }

      // 2. Mail gonder (eger template secildiyse)
      if (selectedTemplateId && mailSubject.trim()) {
        const tplName = mailTemplates.find(t => t.id === selectedTemplateId)?.name || ''
        const nameParts = app.full_name.split(' ')
        await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: app.email,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            templateId: selectedTemplateId,
            subject: mailSubject,
            template_name: tplName,
            application_id: app.id,
            sent_by: reviewer.trim() || 'dashboard',
          }),
        })
        // mail_sent guncelle
        await fetch(`/api/applications/${app.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updated_by: reviewer.trim() || 'dashboard', mail_sent: true, mail_template: tplName }),
        })
      }

      const lbl = ALL_STATUSES.find(s => s.key === toStatus)?.label || toStatus
      const mailMsg = selectedTemplateId ? ' + mail gonderildi' : ''
      setToast({ type: 'success', text: `${app.full_name} → ${lbl}${mailMsg}` })
      setAllApps(prev => prev.map(a => a.id === app.id ? { ...a, status: toStatus, reviewer: reviewer.trim(), review_note: reviewNote.trim() } : a))
      setBreakdown(prev => {
        if (!prev) return prev
        const n = { ...prev }
        if (n[app.status]) n[app.status] = { ...n[app.status], count: n[app.status].count - 1 }
        if (n[toStatus]) n[toStatus] = { ...n[toStatus], count: n[toStatus].count + 1 }
        return n
      })
      setSelectedApp(null)
      setTimeout(() => setToast(null), 3000)
    } catch { setToast({ type: 'error', text: 'Baglanti hatasi' }) }
    finally { setActionLoading(false) }
  }

  const handleRollback = async (app: AppItem) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/applications/${app.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolled_back_by: 'dashboard' }),
      })
      const r = await res.json()
      if (r.success) {
        setToast({ type: 'success', text: `${app.full_name} geri alindi` })
        setSelectedApp(null)
        fetchData()
        setTimeout(() => setToast(null), 2500)
      } else { setToast({ type: 'error', text: r.error || 'Hata' }) }
    } catch { setToast({ type: 'error', text: 'Baglanti hatasi' }) }
    finally { setActionLoading(false) }
  }

  const sel = selectedApp
  const selStep = sel ? ALL_STATUSES.find(s => s.key === sel.status) : null
  const selActions = sel ? getQuickActions(sel.status) : []
  const selNote = (sel?.review_note || '').toLowerCase()
  const selFlag = (selNote.includes('18') && (selNote.includes('yas') || selNote.includes('yaş')))
    ? '18yas' : (selNote.includes('topluluk') && selNote.includes('ilke')) ? 'topluluk' : null

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">Divizyon Basvuru Yonetim Paneli</p>
        </div>
        {toast && (
          <div className={`flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium animate-[slideIn_0.3s_ease-out] ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100'
              : 'bg-red-50 text-red-800 border-red-200 shadow-red-100'
          }`}>
            {toast.type === 'success' ? (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <span>{toast.text}</span>
          </div>
        )}
      </div>

      {/* Pipeline + Stats */}
      <div className="px-6 pt-5 pb-3 space-y-3 shrink-0">
        {/* Pipeline breadcrumb */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-stretch gap-0">
            {PIPELINE_STEPS.map((step, i) => {
              const rawCount = breakdown?.[step.key]?.count ?? 0
              // Kesin ret: sadece mail bekleyenleri say
              const count = (step.key === 'kesin_ret' || step.key === 'yas_kucuk')
                ? allApps.filter(a => a.status === step.key && !a.mail_sent).length
                : rawCount
              const isSelected = selectedStep === step.key
              return (
                <div key={step.key} className="flex items-stretch flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedStep(isSelected ? null : step.key)}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border-2 transition-all min-w-0 cursor-pointer ${
                      isSelected ? `${step.bg} ${step.text} border-current ring-2 ${step.ring} ring-offset-1 shadow-sm` :
                      count > 0 ? `${step.bg} ${step.border} ${step.text} hover:shadow-sm` :
                      'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <span className={`text-xl font-bold leading-none ${!count && !isSelected ? 'text-gray-300' : ''}`}>{count}</span>
                    <span className="text-[10px] font-medium mt-0.5 truncate w-full text-center">{step.label}</span>
                  </button>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className="flex items-center px-0.5">
                      <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Exit statuses */}
          {(() => {
            const exits = EXIT_STATUSES.filter(s => (breakdown?.[s.key]?.count ?? 0) > 0 || selectedStep === s.key)
            if (!exits.length) return null
            return (
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 mr-1">Cikarilan:</span>
                {exits.map(s => (
                  <button key={s.key} onClick={() => setSelectedStep(selectedStep === s.key ? null : s.key)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                      selectedStep === s.key ? `${s.bg} ${s.text} ring-1 ${s.ring}` : `${s.bg} ${s.text}`
                    }`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label} {breakdown?.[s.key]?.count ?? 0}
                  </button>
                ))}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Main content: List + Side Panel */}
      <div className="flex-1 flex px-6 pb-6 gap-4 min-h-0">
        {/* Left: List */}
        <div className={`bg-white rounded-xl border border-gray-200 flex flex-col min-h-0 transition-all ${sel ? 'flex-1' : 'w-full'}`}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {selectedStep && (() => { const s = ALL_STATUSES.find(x => x.key === selectedStep); return s ? <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} /> : null })()}
              <h2 className="text-sm font-semibold text-gray-900">{ALL_STATUSES.find(s => s.key === selectedStep)?.label || 'Kayıtlar'}</h2>
              {selectedStep && <span className="text-xs text-gray-400">({filteredApps.length})</span>}
            </div>
            {selectedStep && <button onClick={() => setSelectedStep(null)} className="text-[11px] text-gray-500 hover:text-gray-700">Temizle</button>}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !selectedStep ? (
              <div className="p-10 text-center text-gray-400 text-sm">Kayıtları görmek için yukarıdaki bir aşamaya tıklayın</div>
            ) : filteredApps.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">Bu asamada kimse yok</div>
            ) : groupedByDate.map(group => (
              <div key={group.date}>
                {/* Gün başlığı */}
                <div className="sticky top-0 z-10 bg-gray-50 px-4 py-1.5 border-b border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{group.label}</span>
                  <span className="text-[10px] text-gray-400 ml-2">({group.apps.length})</span>
                </div>
                {/* Kayıtlar */}
                {group.apps.map(app => {
                  const step = ALL_STATUSES.find(s => s.key === app.status)
                  const initials = app.full_name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2)
                  const isActive = sel?.id === app.id
                  const note = (app.review_note || '').toLowerCase()
                  const flag = (note.includes('18') && (note.includes('yas') || note.includes('yaş'))) ? '18yas'
                    : (note.includes('topluluk') && note.includes('ilke')) ? 'topluluk' : null
                  const time = String(app.submitted_at || '').slice(11, 16)

                  return (
                    <button key={app.id} onClick={() => setSelectedApp(isActive ? null : app)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors border-b border-gray-50 ${isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: step?.color || '#6B7280' }}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{app.full_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{app.email}</p>
                      </div>
                      {time && <span className="text-[10px] text-gray-400 shrink-0">{time}</span>}
                      {flag === '18yas' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 shrink-0">18Y</span>}
                      {flag === 'topluluk' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">IHL</span>}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${step?.bg} ${step?.text}`}>{step?.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detail Side Panel */}
        {sel && (
          <div className="w-[400px] shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selStep?.color || '#6B7280' }}>
                  {sel.full_name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{sel.full_name}</p>
                  <p className="text-[11px] text-gray-400">{sel.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApp(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Flag warning */}
            {selFlag && (
              <div className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 ${selFlag === '18yas' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                {selFlag === '18yas' ? '18 yasindan kucuk' : 'Topluluk ilkeleri kabul edilmemis'}
              </div>
            )}

            {/* Degerlendirme + Islem */}
            <div className="px-4 py-3 border-b border-gray-100 space-y-2.5 shrink-0">
              {sel.status === 'kesin_ret' || sel.status === 'yas_kucuk' ? (
                <>
                  {/* Kesin ret: mail gonder */}
                  {!sel.mail_sent ? (
                    <>
                      {!sel.email && (
                        <p className="text-[11px] text-amber-600">E-posta adresi yok</p>
                      )}
                      <button
                        onClick={async () => {
                          const note = (sel.review_note || '').toLowerCase()
                          const tplId = note.includes('18') && (note.includes('yas') || note.includes('yaş')) ? 'kesin-ret-18yas'
                            : note.includes('topluluk') && note.includes('ilke') ? 'kesin-ret-topluluk' : 'kesin-ret'
                          const tpl = mailTemplates.find(t => t.id === tplId)
                          setActionLoading(true)
                          try {
                            const nameParts = sel.full_name.split(' ')
                            const res = await fetch('/api/mail/send', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                email: sel.email,
                                firstName: nameParts[0] || '',
                                lastName: nameParts.slice(1).join(' ') || '',
                                template_id: tplId,
                                subject: tpl?.subject || 'Başvurunuz Hakkında',
                                application_id: sel.id,
                                sent_by: 'dashboard',
                              }),
                            })
                            const result = await res.json()
                            if (result.success) {
                              setToast({ type: 'success', text: 'Red maili gönderildi — kayıt Kesin Ret tablosuna taşındı' })
                              // Listeden kaldır + paneli kapat
                              setAllApps(prev => prev.filter(a => a.id !== sel.id))
                              setSelectedApp(null)
                            } else {
                              setToast({ type: 'error', text: result.error || 'Gönderilemedi' })
                            }
                          } catch { setToast({ type: 'error', text: 'Bağlantı hatası' }) }
                          setActionLoading(false)
                          setTimeout(() => setToast(null), 3000)
                        }}
                        disabled={actionLoading || !sel.email}
                        className="w-full px-3 py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Gönderiliyor...' : 'Red Maili Gönder'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-green-600 text-xs bg-green-50 rounded-lg p-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Mail gönderildi
                    </div>
                  )}
                  <button onClick={() => handleRollback(sel)} disabled={actionLoading}
                    className="w-full px-3 py-2 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                    Geri Al
                  </button>
                </>
              ) : (
                <>
                  {/* Kontrol/diger: degerlendirme formu */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-gray-400 block mb-0.5">Degerlendiren</label>
                      <select value={reviewer} onChange={e => setReviewer(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-indigo-300 outline-none">
                        <option value="">Sec...</option>
                        <option value="Tuna">Tuna</option>
                        <option value="Taha">Taha</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-400 block mb-0.5">Not</label>
                      <input type="text" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Degerlendirme notu..."
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-indigo-300 outline-none" />
                    </div>
                  </div>

                  {/* Action butonlari */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selActions.map(a => (
                      <button key={a.toStatus} onClick={() => handleAction(sel, a.toStatus)} disabled={actionLoading}
                        className={`px-3 py-2 text-[11px] font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${a.color}`}>
                        {actionLoading ? '...' : a.label}
                      </button>
                    ))}
                    <button onClick={() => handleRollback(sel)} disabled={actionLoading}
                      className="px-3 py-2 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 ml-auto">
                      Geri Al
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Scrollable detail — two columns: info left, principles right */}
            <div className="flex-1 overflow-y-auto flex min-h-0">
              {/* Left column: bilgiler */}
              <div className="flex-1 px-3 py-3 space-y-3 overflow-y-auto border-r border-gray-100">
                {/* Kisisel */}
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Kisisel</h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <InfoRow label="Telefon" value={sel.phone} />
                    <InfoRow label="Dogum" value={sel.birth_date} />
                    <InfoRow label="Cinsiyet" value={sel.gender} />
                    <InfoRow label="Durum" value={sel.professional_status} />
                  </div>
                </div>

                {/* Egitim */}
                {(sel.university || sel.department) && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Egitim</h4>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <InfoRow label="Universite" value={sel.university} />
                      <InfoRow label="Bolum" value={sel.department} />
                      <InfoRow label="Ogrenim" value={sel.education_type} />
                    </div>
                  </div>
                )}

                {/* Rol */}
                {sel.main_role && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Rol & Degerler</h4>
                    <InfoRow label="Ana Rol" value={sel.main_role} />
                    <InfoRow label="Degerler" value={sel.core_values} />
                  </div>
                )}

                {/* Kendini ifade */}
                {(sel.self_expression || sel.video_link || sel.plan_description) && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Kendini Ifade</h4>
                    {sel.self_expression && <p className="text-[11px] text-gray-700 leading-relaxed mb-1">{sel.self_expression}</p>}
                    {sel.video_link && <a href={sel.video_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 hover:underline block truncate mb-1">{sel.video_link}</a>}
                    {sel.plan_description && <p className="text-[11px] text-gray-600 leading-relaxed">{sel.plan_description}</p>}
                  </div>
                )}

                {/* Acik uclu sorular */}
                {(sel.future_ideas || sel.feedback_experience || sel.project_steps || sel.curiosity_topic) && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Sorular</h4>
                    <div className="space-y-1">
                      <QABlock label="Alanin gelecegi" value={sel.future_ideas} />
                      <QABlock label="Geri bildirim" value={sel.feedback_experience} />
                      <QABlock label="Proje fikri" value={sel.project_steps} />
                      <QABlock label="Merak konusu" value={sel.curiosity_topic} />
                      <QABlock label="Ek notlar" value={sel.additional_notes} />
                    </div>
                  </div>
                )}

                {/* Degerlendirme — sadece kesin ret olmayanlarda goster (kesin ret bilgisi zaten ust banner'da) */}
                {sel.reviewer && sel.status !== 'kesin_ret' && sel.status !== 'yas_kucuk' && (
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <span className="text-[10px] text-gray-400">Degerlendirme</span>
                    <p className="text-[11px]"><span className="font-medium">{sel.reviewer}</span>{sel.review_note ? ` — ${sel.review_note}` : ''}</p>
                    {sel.mail_sent && <p className="text-[10px] text-emerald-600 mt-0.5">Mail gonderildi{sel.mail_template ? ` (${sel.mail_template})` : ''}</p>}
                  </div>
                )}
              </div>

              {/* Right column: Topluluk Ilkeleri — sadece flag'li (ihlal) olanlarda goster */}
              {selFlag === 'topluluk' && <div className="w-[140px] shrink-0 px-2.5 py-3 overflow-y-auto">
                {(() => {
                  const principles = Array.from({ length: 10 }, (_, i) => sel[`principle_${i + 1}`] as string || '')
                  const filled = principles.filter(Boolean).length
                  const allFilled = filled === 10
                  const noneFilled = filled === 0

                  return (
                    <>
                      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Ilkeler</h4>
                      {/* Ozet badge */}
                      <div className={`rounded-lg px-2 py-1.5 mb-2 text-center ${
                        noneFilled ? 'bg-red-50 border border-red-200' : allFilled ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                      }`}>
                        {noneFilled ? (
                          <div className="flex items-center justify-center gap-1">
                            <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-[10px] font-bold text-red-700">0/10</span>
                          </div>
                        ) : allFilled ? (
                          <div className="flex items-center justify-center gap-1">
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span className="text-[10px] font-bold text-emerald-700">{filled}/10</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-bold text-amber-700">⚠ {filled}/10</span>
                          </div>
                        )}
                      </div>

                      {/* Her ilke */}
                      <div className="space-y-0.5">
                        {principles.map((val, i) => (
                          <div key={i} className="flex items-center gap-1" title={val || 'Kabul edilmedi'}>
                            {val ? (
                              <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            <span className={`text-[10px] truncate ${val ? 'text-gray-600' : 'text-red-400'}`}>{i + 1}. ilke</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
