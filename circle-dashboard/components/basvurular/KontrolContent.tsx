'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  InboxIcon,
  FunnelIcon,
  XMarkIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import KontrolDetailModal from '@/components/kontrol/KontrolDetailModal'

type TabKey = 'pending' | 'mailWaiting' | 'mailSent' | 'all'

interface KontrolItem {
  id: string
  full_name: string
  email: string
  phone?: string
  birth_date?: string
  gender?: string
  reviewer?: string
  approval_status?: string
  review_note?: string
  mail_sent?: boolean
  mail_template?: string
  submitted_at?: string
  [key: string]: any
}

interface MailTemplate {
  id: number
  name: string
}

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Henüz Kontrol Edilmemiş', icon: InboxIcon },
  { key: 'mailWaiting', label: 'Mail Bekliyor', icon: ClockIcon },
  { key: 'mailSent', label: 'Mail Gönderildi', icon: CheckCircleIcon },
  { key: 'all', label: 'Tümü', icon: FunnelIcon },
]

function getOnayBadge(value: string | undefined) {
  if (!value) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Boş
      </span>
    )
  }
  const lower = value.toLowerCase()
  if (lower.includes('kabul')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        {value}
      </span>
    )
  }
  if (lower.includes('ret')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        {value}
      </span>
    )
  }
  if (lower.includes('beklemede')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        {value}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      {value}
    </span>
  )
}

function getMailBadge(value: boolean | undefined) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircleIcon className="w-3.5 h-3.5" />
        Gönderildi
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Gönderilmedi
    </span>
  )
}

export default function KontrolContent() {
  const [data, setData] = useState<KontrolItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<KontrolItem | null>(null)
  const itemsPerPage = 10

  // Advanced filters
  const [onayFilter, setOnayFilter] = useState('')
  const [degerlendirenFilter, setDegerlendirenFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Bulk selection
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())

  // Bulk approve modal
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false)
  const [bulkApproveValue, setBulkApproveValue] = useState('Kabul')
  const [bulkApproveProcessing, setBulkApproveProcessing] = useState(false)
  const [bulkApproveProgress, setBulkApproveProgress] = useState({ done: 0, total: 0, errors: [] as string[] })

  // Bulk mail modal
  const [bulkMailOpen, setBulkMailOpen] = useState(false)
  const [templates, setTemplates] = useState<MailTemplate[]>([])
  const [bulkMailTemplateId, setBulkMailTemplateId] = useState<number | null>(null)
  const [bulkMailSubject, setBulkMailSubject] = useState('')
  const [bulkMailProcessing, setBulkMailProcessing] = useState(false)
  const [bulkMailProgress, setBulkMailProgress] = useState({ done: 0, total: 0, errors: [] as string[] })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/applications?status=kontrol')
      const result = await response.json()
      if (result.success) {
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching kontrol data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetch('/api/mail/templates')
      .then((r) => r.json())
      .then((res) => { if (res.success) setTemplates(res.templates) })
      .catch(() => {})
  }, [])

  // Unique değerlendiren listesi
  const degerlendirenList = useMemo(() => {
    const vals = new Set<string>()
    data.forEach((item) => {
      const v = item.reviewer
      if (v) vals.add(v)
    })
    return Array.from(vals).sort((a, b) => a.localeCompare(b, 'tr'))
  }, [data])

  // Tab filter
  const tabFiltered = useMemo(() => {
    return data.filter((item) => {
      const onay = item.approval_status || ''
      const reviewer = item.reviewer || ''
      const mailSent = item.mail_sent === true
      switch (activeTab) {
        case 'pending': return !onay && !reviewer
        case 'mailWaiting': return !!onay && !mailSent
        case 'mailSent': return mailSent
        default: return true
      }
    })
  }, [data, activeTab])

  // Advanced + search filter
  const filtered = useMemo(() => {
    let items = tabFiltered

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      items = items.filter((item) => {
        const name = (item.full_name || '').toLowerCase()
        const email = (item.email || '').toLowerCase()
        return name.includes(term) || email.includes(term)
      })
    }

    if (onayFilter) {
      if (onayFilter === 'Boş') {
        items = items.filter((item) => !item.approval_status)
      } else {
        items = items.filter((item) =>
          (item.approval_status || '') === onayFilter
        )
      }
    }

    if (degerlendirenFilter) {
      items = items.filter((item) =>
        (item.reviewer || '') === degerlendirenFilter
      )
    }

    if (dateFrom || dateTo) {
      items = items.filter((item) => {
        const dateStr = item.submitted_at || ''
        if (!dateStr) return false
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return false
        if (dateFrom && d < new Date(dateFrom)) return false
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59)
          if (d > toDate) return false
        }
        return true
      })
    }

    return items
  }, [tabFiltered, searchTerm, onayFilter, degerlendirenFilter, dateFrom, dateTo])

  // Sort by date (newest first)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = a.submitted_at ? new Date(a.submitted_at) : null
      const dateB = b.submitted_at ? new Date(b.submitted_at) : null
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return dateB.getTime() - dateA.getTime()
    })
  }, [filtered])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage, itemsPerPage])

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchTerm, onayFilter, degerlendirenFilter, dateFrom, dateTo])
  useEffect(() => { setSelectedEmails(new Set()) }, [activeTab, searchTerm, onayFilter, degerlendirenFilter, dateFrom, dateTo])

  // Tab counts
  const tabCounts = useMemo(() => {
    let pending = 0, mailWaiting = 0, mailSent = 0
    data.forEach((item) => {
      const onay = item.approval_status || ''
      const reviewer = item.reviewer || ''
      const mail = item.mail_sent === true
      if (!onay && !reviewer) pending++
      if (onay && !mail) mailWaiting++
      if (mail) mailSent++
    })
    return { pending, mailWaiting, mailSent, all: data.length }
  }, [data])

  const hasActiveFilters = !!(onayFilter || degerlendirenFilter || dateFrom || dateTo)

  const clearFilters = () => {
    setOnayFilter('')
    setDegerlendirenFilter('')
    setDateFrom('')
    setDateTo('')
  }

  // Selection helpers
  const allPageEmails = paginatedData.map((item) => item.email || '')
  const allPageSelected = allPageEmails.length > 0 && allPageEmails.every((e) => selectedEmails.has(e))
  const somePageSelected = allPageEmails.some((e) => selectedEmails.has(e))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedEmails)
      allPageEmails.forEach((e) => next.delete(e))
      setSelectedEmails(next)
    } else {
      const next = new Set(selectedEmails)
      allPageEmails.forEach((e) => { if (e) next.add(e) })
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
    sorted.forEach((item) => {
      const e = item.email || ''
      if (e) next.add(e)
    })
    setSelectedEmails(next)
  }

  // Bulk approve
  const handleBulkApprove = async () => {
    const targets = sorted.filter((item) => {
      const e = item.email || ''
      return selectedEmails.has(e)
    })
    setBulkApproveProcessing(true)
    setBulkApproveProgress({ done: 0, total: targets.length, errors: [] })

    let done = 0
    const errors: string[] = []

    for (const item of targets) {
      try {
        await fetch(`/api/applications/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updated_by: 'reviewer', approval_status: bulkApproveValue }),
        })
      } catch {
        errors.push(item.email || '')
      }
      done++
      setBulkApproveProgress({ done, total: targets.length, errors })
    }

    setBulkApproveProcessing(false)
    setSelectedEmails(new Set())
    setBulkApproveOpen(false)
    fetchData()
  }

  // Bulk mail
  const bulkMailTargets = useMemo(() => {
    return sorted.filter((item) => {
      const e = item.email || ''
      return selectedEmails.has(e) && item.mail_sent !== true
    })
  }, [sorted, selectedEmails])

  const handleBulkMail = async () => {
    if (!bulkMailTemplateId || !bulkMailSubject.trim()) return
    setBulkMailProcessing(true)
    setBulkMailProgress({ done: 0, total: bulkMailTargets.length, errors: [] })

    let done = 0
    const errors: string[] = []
    const selectedTemplate = templates.find((t) => t.id === bulkMailTemplateId)

    for (const item of bulkMailTargets) {
      const email = item.email || ''
      const name = item.full_name || ''
      const nameParts = name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      try {
        const res = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, firstName, lastName, template_id: bulkMailTemplateId, subject: bulkMailSubject }),
        })
        const result = await res.json()
        if (result.success) {
          await fetch(`/api/applications/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updated_by: 'reviewer',
              mail_sent: true,
              mail_template: selectedTemplate?.name || '',
            }),
          })
        } else {
          errors.push(email)
        }
      } catch {
        errors.push(email)
      }
      done++
      setBulkMailProgress({ done, total: bulkMailTargets.length, errors })
    }

    setBulkMailProcessing(false)
    setSelectedEmails(new Set())
    setBulkMailOpen(false)
    setBulkMailTemplateId(null)
    setBulkMailSubject('')
    fetchData()
  }

  const handleModalClose = () => {
    setSelectedItem(null)
    fetchData()
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Kontrol Paneli</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manuel degerlendirme bekleyen basvurulari inceleyin ve yonetin
        </p>
      </div>

      <div className="p-8">
        {/* Filter Tabs + Search + Advanced */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-wrap border-b border-gray-100">
            {TABS.map((tab) => {
              const count = tabCounts[tab.key]
              const isActive = activeTab === tab.key
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search + Advanced Filters */}
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ad soyad veya e-posta ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Onay Durumu */}
              <select
                value={onayFilter}
                onChange={(e) => setOnayFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Onay Durumu (Tümü)</option>
                <option value="Kabul">Kabul</option>
                <option value="Ret">Ret</option>
                <option value="Beklemede">Beklemede</option>
                <option value="Boş">Boş</option>
              </select>

              {/* Değerlendiren */}
              <select
                value={degerlendirenFilter}
                onChange={(e) => setDegerlendirenFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Değerlendiren (Tümü)</option>
                {degerlendirenList.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              {/* Tarih aralığı */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                title="Başlangıç tarihi"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                title="Bitiş tarihi"
              />

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Temizle
                </button>
              )}
            </div>

            {/* Filtre özeti */}
            {sorted.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{sorted.length} kayıt</span>
                {selectedEmails.size > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600 font-medium">{selectedEmails.size} seçili</span>
                    {sorted.length > paginatedData.length && (
                      <button onClick={selectAllFiltered} className="text-blue-600 underline hover:text-blue-800">
                        Tüm {sorted.length} kaydı seç
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedEmails.size > 0 && (
          <div className="bg-blue-600 text-white rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedEmails.size} kişi seçili</span>
            <div className="flex-1" />
            <button
              onClick={() => setBulkApproveOpen(true)}
              className="px-4 py-2 text-sm font-medium bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Toplu Onayla
            </button>
            <button
              onClick={() => setBulkMailOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 rounded-lg hover:bg-blue-400 transition-colors"
            >
              <EnvelopeIcon className="w-4 h-4" />
              Toplu Mail Gönder
              {bulkMailTargets.length < selectedEmails.size && (
                <span className="ml-1 opacity-75">({bulkMailTargets.length} uygun)</span>
              )}
            </button>
            <button
              onClick={() => setSelectedEmails(new Set())}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-gray-500">Veriler yukleniyor...</span>
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <InboxIcon className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Kayit bulunamadi</p>
              <p className="text-xs mt-1">Bu filtreye uygun basvuru yok</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">E-Posta</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Degerlendiren</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Not</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Onay Durumu</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mail Template</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mail Durumu</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedData.map((item, index) => {
                      const name = item.full_name || '-'
                      const email = item.email || '-'
                      const reviewer = item.reviewer || ''
                      const note = item.review_note || ''
                      const onayDurumu = item.approval_status || ''
                      const mailTemplate = item.mail_template || ''
                      const mailSent = item.mail_sent
                      const dateStr = item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('tr-TR') : ''
                      const isSelected = selectedEmails.has(email)

                      const initials = name.split(' ').map((p: string) => p.charAt(0)).join('').toUpperCase().slice(0, 2)
                      const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500']
                      const colorIndex = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length
                      const avatarColor = colors[colorIndex]

                      return (
                        <tr
                          key={`${email}-${index}`}
                          className={`hover:bg-blue-50/50 cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(email)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-5 py-3.5" onClick={() => setSelectedItem(item)}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor} flex-shrink-0`}>
                                {initials}
                              </div>
                              <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                                {name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5" onClick={() => setSelectedItem(item)}>
                            <span className="text-sm text-gray-600">{email}</span>
                          </td>
                          <td className="px-5 py-3.5" onClick={() => setSelectedItem(item)}>
                            <span className="text-sm text-gray-600">{reviewer || <span className="text-gray-300 italic">-</span>}</span>
                          </td>
                          <td className="px-5 py-3.5 max-w-[200px]" onClick={() => setSelectedItem(item)}>
                            <span className="text-sm text-gray-600 truncate block">{note || <span className="text-gray-300 italic">-</span>}</span>
                          </td>
                          <td className="px-5 py-3.5" onClick={() => setSelectedItem(item)}>{getOnayBadge(onayDurumu)}</td>
                          <td className="px-5 py-3.5" onClick={() => setSelectedItem(item)}>
                            <span className="text-sm text-gray-600">{mailTemplate || <span className="text-gray-300 italic">-</span>}</span>
                          </td>
                          <td className="px-5 py-3.5" onClick={() => setSelectedItem(item)}>{getMailBadge(mailSent)}</td>
                          <td className="px-5 py-3.5" onClick={() => setSelectedItem(item)}>
                            <span className="text-xs text-gray-400">{dateStr || '-'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Toplam <span className="font-semibold text-gray-700">{sorted.length}</span> kayit
                  {sorted.length > 0 && (
                    <> &middot; Sayfa <span className="font-semibold text-gray-700">{currentPage}</span> / <span className="font-semibold text-gray-700">{totalPages}</span></>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) pageNum = i + 1
                    else if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                    return (
                      <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {pageNum}
                      </button>
                    )
                  })}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <KontrolDetailModal data={selectedItem} onClose={handleModalClose} />

      {/* Bulk Approve Modal */}
      {bulkApproveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !bulkApproveProcessing && setBulkApproveOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Toplu Onayla</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedEmails.size} kişi için onay durumu belirle</p>

            {bulkApproveProcessing ? (
              <div className="space-y-3">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(bulkApproveProgress.done / bulkApproveProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {bulkApproveProgress.done} / {bulkApproveProgress.total} güncellendi
                </p>
                {bulkApproveProgress.errors.length > 0 && (
                  <p className="text-xs text-red-600">{bulkApproveProgress.errors.length} hata</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {['Kabul', 'Ret', 'Beklemede'].map((val) => (
                    <label key={val} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${bulkApproveValue === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="bulkApprove" value={val} checked={bulkApproveValue === val} onChange={() => setBulkApproveValue(val)} className="text-blue-600" />
                      <span className="text-sm font-medium">{val}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBulkApproveOpen(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    İptal
                  </button>
                  <button onClick={handleBulkApprove} className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                    {selectedEmails.size} kişiye uygula
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
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(bulkMailProgress.done / bulkMailProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {bulkMailProgress.done} / {bulkMailProgress.total} gönderildi
                </p>
                {bulkMailProgress.errors.length > 0 && (
                  <p className="text-xs text-red-600">{bulkMailProgress.errors.length} hata</p>
                )}
              </div>
            ) : bulkMailTargets.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">Seçili kişilerin tümüne zaten mail gönderilmiş.</p>
                <button onClick={() => setBulkMailOpen(false)} className="mt-4 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Kapat</button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
                    <select
                      value={bulkMailTemplateId ?? ''}
                      onChange={(e) => setBulkMailTemplateId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Template Seç --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Konu</label>
                    <input
                      type="text"
                      value={bulkMailSubject}
                      onChange={(e) => setBulkMailSubject(e.target.value)}
                      placeholder="Mail konusu"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBulkMailOpen(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    İptal
                  </button>
                  <button
                    onClick={handleBulkMail}
                    disabled={!bulkMailTemplateId || !bulkMailSubject.trim()}
                    className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkMailTargets.length} kişiye gönder
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
