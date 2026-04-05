'use client'

import { useEffect, useState, useMemo } from 'react'
// DB field names used directly
import { Badge } from '@/components/ui/badge'
import { XMarkIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

interface MailTemplate {
  id: string
  name: string
  subject: string
}

type SendStatus = 'idle' | 'confirm' | 'loading' | 'success' | 'error'
type TabKey = 'tumu' | 'otomasyon' | 'manuel' | 'mailBekliyor'
type RetSebebiKey = 'tumu' | '18yas' | 'toplulukIlkeleri' | 'diger'

function classifyRetSebebi(row: Record<string, any>): RetSebebiKey {
  const not = (row.review_note || '').toLowerCase()
  if (not.includes('18 yas') || not.includes('yaş')) return '18yas'
  if (not.includes('topluluk ilkeleri')) return 'toplulukIlkeleri'
  if (not) return 'diger'
  return 'diger'
}

async function updateApplication(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updated_by: 'dashboard', ...updates }),
  })
  return res.json()
}

export default function KesinRetContent() {
  const [data, setData] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('tumu')
  const [sortAsc, setSortAsc] = useState(true)

  // Advanced filters
  const [retSebebiFilter, setRetSebebiFilter] = useState<RetSebebiKey>('tumu')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Single mail dialog
  const [mailTarget, setMailTarget] = useState<Record<string, any> | null>(null)
  const [templates, setTemplates] = useState<MailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Bulk selection
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())

  // Bulk mail modal
  const [bulkMailOpen, setBulkMailOpen] = useState(false)
  const [bulkMailTemplateId, setBulkMailTemplateId] = useState<string | null>(null)
  const [bulkMailSubject, setBulkMailSubject] = useState('')
  const [bulkMailProcessing, setBulkMailProcessing] = useState(false)
  const [bulkMailProgress, setBulkMailProgress] = useState({ done: 0, total: 0, errors: [] as string[] })

  const PER_PAGE = 10

  useEffect(() => {
    fetch('/api/applications?status=kesin_ret')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const kesinRet = res.data || []
          setData(kesinRet)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/mail/templates')
      .then((r) => r.json())
      .then((res) => { if (res.success) setTemplates(res.data || []) })
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    let items = [...data]

    // Tab filter
    if (activeTab === 'otomasyon') {
      items = items.filter((d) => (d.reviewer || '') === 'Otomasyon')
    } else if (activeTab === 'manuel') {
      items = items.filter((d) => {
        const val = (d.reviewer || '')
        return val && val !== 'Otomasyon'
      })
    } else if (activeTab === 'mailBekliyor') {
      items = items.filter((d) => d.mail_sent !== true)
    }

    // Ret sebebi filter
    if (retSebebiFilter !== 'tumu') {
      items = items.filter((d) => classifyRetSebebi(d) === retSebebiFilter)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((d) => {
        const name = ((d.full_name || '') || '').toLowerCase()
        const email = ((d.email || '') || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    }

    // Date filter
    if (dateFrom || dateTo) {
      items = items.filter((d) => {
        if (!d.submitted_at) return false
        const dt = new Date(d.submitted_at)
        if (!dt) return false
        if (dateFrom && dt < new Date(dateFrom)) return false
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59)
          if (dt > toDate) return false
        }
        return true
      })
    }

    // Sort by name
    items.sort((a, b) => {
      const nameA = ((a.full_name || '') || '').toLowerCase()
      const nameB = ((b.full_name || '') || '').toLowerCase()
      return sortAsc ? nameA.localeCompare(nameB, 'tr') : nameB.localeCompare(nameA, 'tr')
    })

    return items
  }, [data, activeTab, retSebebiFilter, search, sortAsc, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [activeTab, retSebebiFilter, search, dateFrom, dateTo])
  useEffect(() => { setSelectedEmails(new Set()) }, [activeTab, retSebebiFilter, search, dateFrom, dateTo])

  const counts = useMemo(() => {
    const otomasyon = data.filter((d) => (d.reviewer || '') === 'Otomasyon').length
    const manuel = data.filter((d) => {
      const val = (d.reviewer || '')
      return val && val !== 'Otomasyon'
    }).length
    const mailBekliyor = data.filter((d) => d.mail_sent !== true).length
    return { tumu: data.length, otomasyon, manuel, mailBekliyor }
  }, [data])

  function getRetBadge(row: Record<string, any>) {
    const not = (row.review_note || '') || ''
    const sebep = classifyRetSebebi(row)
    if (sebep === 'toplulukIlkeleri') {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Topluluk İlkeleri</Badge>
    }
    if (sebep === '18yas') {
      return <Badge className="bg-red-100 text-red-700 border-red-200">18 Yaşından Küçük</Badge>
    }
    if (not) {
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200">{not.length > 40 ? not.slice(0, 40) + '...' : not}</Badge>
    }
    return <span className="text-gray-400 text-xs">-</span>
  }

  function openMailDialog(row: Record<string, any>) {
    setMailTarget(row)
    setSendStatus('idle')
    setErrorMessage('')
    // Ret sebebine gore template otomatik sec
    const templateId = row.mail_template || (classifyRetSebebi(row) === '18yas' ? 'kesin-ret-18yas' : classifyRetSebebi(row) === 'toplulukIlkeleri' ? 'kesin-ret-topluluk' : 'kesin-ret')
    setSelectedTemplateId(templateId)
    const tmpl = templates.find((t) => t.id === templateId)
    setSubject(tmpl?.subject || 'Başvurunuz Hakkında')
  }

  async function handleSendMail() {
    if (!mailTarget) return
    const email = (mailTarget.email || '') || ''
    const name = (mailTarget.full_name || '') || ''
    const nameParts = name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    if (sendStatus === 'idle') { setSendStatus('confirm'); return }

    if (sendStatus === 'confirm') {
      if (!selectedTemplateId) { setErrorMessage('Template secilmeli'); return }
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
            application_id: mailTarget.id,
            sent_by: 'dashboard',
          }),
        })
        const result = await res.json()
        if (result.success) {
          setSendStatus('success')
          setData((prev) => prev.map((d) => {
            if (d.id === mailTarget.id) {
              return { ...d, mail_sent: true }
            }
            return d
          }))
          setTimeout(() => setMailTarget(null), 1500)
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

  // Bulk selection helpers
  const pagedEmails = paged.map((d) => (d.email || '') || '')
  const allPageSelected = pagedEmails.length > 0 && pagedEmails.every((e) => selectedEmails.has(e))
  const somePageSelected = pagedEmails.some((e) => selectedEmails.has(e))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedEmails)
      pagedEmails.forEach((e) => next.delete(e))
      setSelectedEmails(next)
    } else {
      const next = new Set(selectedEmails)
      pagedEmails.forEach((e) => { if (e) next.add(e) })
      setSelectedEmails(next)
    }
  }

  const toggleSelectItem = (email: string) => {
    const next = new Set(selectedEmails)
    if (next.has(email)) next.delete(email)
    else next.add(email)
    setSelectedEmails(next)
  }

  const selectAllFiltered = () => {
    const next = new Set(selectedEmails)
    filtered.forEach((d) => {
      const e = (d.email || '') || ''
      if (e) next.add(e)
    })
    setSelectedEmails(next)
  }

  const bulkMailTargets = useMemo(() => {
    return filtered.filter((d) => {
      const e = (d.email || '') || ''
      return selectedEmails.has(e) && d.mail_sent !== true
    })
  }, [filtered, selectedEmails])

  const handleBulkMail = async () => {
    setBulkMailProcessing(true)
    setBulkMailProgress({ done: 0, total: bulkMailTargets.length, errors: [] })

    let done = 0
    const errors: string[] = []

    for (const item of bulkMailTargets) {
      const email = (item.email || '') || ''
      const name = (item.full_name || '') || ''
      const nameParts = name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      try {
        const res = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, firstName, lastName,
            template_id: 'kesin-ret',
            application_id: item.id,
            sent_by: 'dashboard',
          }),
        })
        const result = await res.json()
        if (!result.success) errors.push(email)
      } catch {
        errors.push(email)
      }
      done++
      setBulkMailProgress({ done, total: bulkMailTargets.length, errors })
    }

    setBulkMailProcessing(false)
    setSelectedEmails(new Set())
    setBulkMailOpen(false)
    // Refresh
    fetch('/api/applications?status=kesin_ret')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data || [])
      })
      .catch(() => {})
  }

  const hasActiveFilters = !!(retSebebiFilter !== 'tumu' || dateFrom || dateTo)

  const clearFilters = () => {
    setRetSebebiFilter('tumu')
    setDateFrom('')
    setDateTo('')
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'tumu', label: 'Tümü', count: counts.tumu },
    { key: 'otomasyon', label: 'Otomasyon Retleri', count: counts.otomasyon },
    { key: 'manuel', label: 'Manuel Retler', count: counts.manuel },
    { key: 'mailBekliyor', label: 'Mail Bekliyor', count: counts.mailBekliyor },
  ]

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kesin Ret</h1>
            <p className="text-sm text-gray-500 mt-1">Reddedilen basvurular (otomasyon ve manuel)</p>
          </div>
          <Badge className="bg-red-50 text-red-700 border-red-200 text-sm px-3 py-1">
            {data.length} kayit
          </Badge>
        </div>
      </div>

      <div className="p-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Advanced Filters Row */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Ad soyad veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none min-w-[220px]"
          />

          {/* Ret sebebi */}
          <select
            value={retSebebiFilter}
            onChange={(e) => setRetSebebiFilter(e.target.value as RetSebebiKey)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value="tumu">Ret Sebebi (Tümü)</option>
            <option value="18yas">18 Yaşından Küçük</option>
            <option value="toplulukIlkeleri">Topluluk İlkeleri</option>
            <option value="diger">Diğer</option>
          </select>

          {/* Tarih aralığı */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
            title="Başlangıç tarihi"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
            title="Bitiş tarihi"
          />

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
              <XMarkIcon className="w-4 h-4" />
              Temizle
            </button>
          )}

          <span className="text-sm text-gray-400 ml-auto">{filtered.length} kayıt</span>
        </div>

        {/* Bulk Action Bar */}
        {selectedEmails.size > 0 && (
          <div className="bg-red-600 text-white rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedEmails.size} kişi seçili</span>
            {filtered.length > paged.length && (
              <button onClick={selectAllFiltered} className="text-xs underline opacity-80 hover:opacity-100">
                Tüm {filtered.length} kaydı seç
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setBulkMailOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500 rounded-lg hover:bg-red-400 transition-colors"
            >
              <EnvelopeIcon className="w-4 h-4" />
              Toplu Mail Gönder
              {bulkMailTargets.length < selectedEmails.size && (
                <span className="ml-1 opacity-75">({bulkMailTargets.length} uygun)</span>
              )}
            </button>
            <button onClick={() => setSelectedEmails(new Set())} className="p-2 hover:bg-red-500 rounded-lg transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => setSortAsc(!sortAsc)}
                    >
                      Ad Soyad {sortAsc ? '↑' : '↓'}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">E-Posta</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Değerlendiren</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ret Sebebi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Mail Template</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Mail Atıldı mı?</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">Kayit bulunamadi</td>
                    </tr>
                  ) : (
                    paged.map((row, i) => {
                      const name = (row.full_name || '') || '-'
                      const email = (row.email || '') || '-'
                      const degerlendiren = (row.reviewer || '') || '-'
                      const mailTemplate = (row.mail_template || '') || '-'
                      const isMailSent = row.mail_sent === true
                      const isSelected = selectedEmails.has(email)

                      return (
                        <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(email)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                          <td className="px-4 py-3 text-gray-600">{email}</td>
                          <td className="px-4 py-3">
                            <Badge className={degerlendiren === 'Otomasyon' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}>
                              {degerlendiren}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{getRetBadge(row)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{mailTemplate}</td>
                          <td className="px-4 py-3">
                            {isMailSent ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">Evet</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Hayır</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!isMailSent && (
                              <button
                                onClick={() => openMailDialog(row)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Mail Gönder
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  {filtered.length} sonuctan {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, filtered.length)} arası
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Önceki</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                        <button onClick={() => setPage(p)} className={`px-3 py-1.5 text-sm rounded-md border ${p === page ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>{p}</button>
                      </span>
                    ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sonraki</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single Mail Dialog */}
      {mailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMailTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Red Maili Gönder</h3>
            <p className="text-sm text-gray-500 mb-2">
              <strong>{mailTarget.full_name || ''}</strong> ({mailTarget.email || ''})
            </p>

            {/* Ret bilgisi özeti */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 space-y-1">
              <p className="text-xs text-red-700"><span className="font-medium">Değerlendiren:</span> {mailTarget.reviewer || '-'}</p>
              <p className="text-xs text-red-700"><span className="font-medium">Ret Sebebi:</span> {mailTarget.review_note || '-'}</p>
              <p className="text-xs text-red-700"><span className="font-medium">Template:</span> {templates.find(t => t.id === selectedTemplateId)?.name || selectedTemplateId}</p>
              <p className="text-xs text-red-700"><span className="font-medium">Konu:</span> {subject}</p>
            </div>

            {sendStatus === 'success' ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-700 font-medium">Red maili gönderildi</p>
              </div>
            ) : (
              <>
                {sendStatus === 'confirm' && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-3">
                    Bu kişiye red maili gönderilecek. Emin misin?
                  </p>
                )}
                {errorMessage && <p className="text-sm text-red-600 mb-3">{errorMessage}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setMailTarget(null)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">İptal</button>
                  <button
                    onClick={handleSendMail}
                    disabled={sendStatus === 'loading'}
                    className={`flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 ${sendStatus === 'confirm' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    {sendStatus === 'loading' ? 'Gönderiliyor...' : sendStatus === 'confirm' ? 'Evet, Gönder' : 'Red Maili Gönder'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Mail Modal */}
      {bulkMailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !bulkMailProcessing && setBulkMailOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Toplu Mail Gönder</h3>
            <p className="text-sm text-gray-500 mb-4">
              {bulkMailTargets.length} kişiye mail gönderilecek
              {bulkMailTargets.length < selectedEmails.size && (
                <span className="text-orange-600"> (Mail gönderilmiş olanlar hariç)</span>
              )}
            </p>

            {bulkMailProcessing ? (
              <div className="space-y-3">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${(bulkMailProgress.done / bulkMailProgress.total) * 100}%` }} />
                </div>
                <p className="text-sm text-gray-600 text-center">{bulkMailProgress.done} / {bulkMailProgress.total} gönderildi</p>
                {bulkMailProgress.errors.length > 0 && <p className="text-xs text-red-600">{bulkMailProgress.errors.length} hata</p>}
              </div>
            ) : bulkMailTargets.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">Seçili kişilerin tümüne zaten mail gönderilmiş.</p>
                <button onClick={() => setBulkMailOpen(false)} className="mt-4 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Kapat</button>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-700"><span className="font-medium">Template:</span> Kesin Ret</p>
                  <p className="text-xs text-red-700"><span className="font-medium">Konu:</span> Başvurunuz Hakkında</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBulkMailOpen(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">İptal</button>
                  <button
                    onClick={handleBulkMail}
                    className="flex-1 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    {bulkMailTargets.length} kişiye red maili gönder
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
