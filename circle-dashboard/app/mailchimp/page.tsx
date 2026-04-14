'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type ViewKey = 'subscribers' | 'campaigns'
type SubStatusKey = 'all' | 'subscribed' | 'unsubscribed' | 'cleaned'
type CampaignStatusKey = 'all' | 'sent' | 'draft'

interface Subscriber {
  id: string
  email: string
  first_name: string
  last_name: string
  status: string
  subscribed_at: string | null
  last_changed: string | null
  avg_open_rate: number | null
  avg_click_rate: number | null
  tags: string[]
  source: string
}

interface Campaign {
  id: string
  title: string
  subject: string
  from_name: string
  status: string
  sent_at: string | null
  created_at: string | null
  template_id: number | null
  emails_sent: number
  recipient_email: string | null
  opens: number
  clicks: number
  open_rate: number
  click_rate: number
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function pct(n: number) {
  return (n * 100).toFixed(1) + '%'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    subscribed: 'bg-green-100 text-green-700',
    unsubscribed: 'bg-red-100 text-red-700',
    cleaned: 'bg-orange-100 text-orange-700',
    pending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-600',
    sending: 'bg-cyan-100 text-cyan-700',
    scheduled: 'bg-purple-100 text-purple-700',
  }
  const labels: Record<string, string> = {
    subscribed: 'Aktif',
    unsubscribed: 'Ayrıldı',
    cleaned: 'Temizlendi',
    pending: 'Bekliyor',
    sent: 'Gönderildi',
    draft: 'Taslak',
    sending: 'Gönderiliyor',
    scheduled: 'Zamanlandı',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function MailchimpPage() {
  const [view, setView] = useState<ViewKey>('subscribers')

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [subLoading, setSubLoading] = useState(true)
  const [subError, setSubError] = useState<string | null>(null)
  const [subSearch, setSubSearch] = useState('')
  const [subStatus, setSubStatus] = useState<SubStatusKey>('all')
  const [subPage, setSubPage] = useState(1)

  // Unsubscribe state
  const [unsubTarget, setUnsubTarget] = useState<Subscriber | null>(null)
  const [unsubLoading, setUnsubLoading] = useState(false)
  const [unsubError, setUnsubError] = useState<string | null>(null)

  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campLoading, setCampLoading] = useState(true)
  const [campError, setCampError] = useState<string | null>(null)
  const [campSearch, setCampSearch] = useState('')
  const [campStatus, setCampStatus] = useState<CampaignStatusKey>('all')
  const [campPage, setCampPage] = useState(1)

  const PER_PAGE = 15

  const fetchSubscribers = async () => {
    setSubLoading(true)
    setSubError(null)
    try {
      const res = await fetch('/api/mailchimp/subscribers')
      const json = await res.json()
      if (json.success) setSubscribers(json.subscribers)
      else setSubError(json.error)
    } catch (e: any) { setSubError(e.message) }
    finally { setSubLoading(false) }
  }

  const fetchCampaigns = async () => {
    setCampLoading(true)
    setCampError(null)
    try {
      const res = await fetch('/api/mailchimp/campaigns')
      const json = await res.json()
      if (json.success) setCampaigns(json.campaigns)
      else setCampError(json.error)
    } catch (e: any) { setCampError(e.message) }
    finally { setCampLoading(false) }
  }

  const handleUnsubscribe = async () => {
    if (!unsubTarget) return
    setUnsubLoading(true)
    setUnsubError(null)
    try {
      const res = await fetch('/api/mailchimp/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unsubTarget.email }),
      })
      const json = await res.json()
      if (json.success) {
        setSubscribers(prev => prev.map(s =>
          s.email === unsubTarget.email ? { ...s, status: 'unsubscribed' } : s
        ))
        setUnsubTarget(null)
      } else {
        setUnsubError(json.error || 'Bir hata oluştu')
      }
    } catch (e: any) {
      setUnsubError(e.message)
    } finally {
      setUnsubLoading(false)
    }
  }

  useEffect(() => { fetchSubscribers() }, [])
  useEffect(() => { fetchCampaigns() }, [])

  // Subscriber filtering
  const filteredSubs = useMemo(() => {
    let items = subscribers
    if (subStatus !== 'all') items = items.filter(s => s.status === subStatus)
    if (subSearch.trim()) {
      const q = subSearch.toLowerCase()
      items = items.filter(s =>
        s.email.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q)
      )
    }
    return items
  }, [subscribers, subStatus, subSearch])

  const subTotalPages = Math.max(1, Math.ceil(filteredSubs.length / PER_PAGE))
  const pagedSubs = filteredSubs.slice((subPage - 1) * PER_PAGE, subPage * PER_PAGE)
  useEffect(() => setSubPage(1), [subStatus, subSearch])

  // Campaign filtering
  const filteredCamps = useMemo(() => {
    let items = campaigns
    if (campStatus !== 'all') items = items.filter(c => c.status === campStatus)
    if (campSearch.trim()) {
      const q = campSearch.toLowerCase()
      items = items.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.subject || '').toLowerCase().includes(q) ||
        (c.recipient_email || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [campaigns, campStatus, campSearch])

  const campTotalPages = Math.max(1, Math.ceil(filteredCamps.length / PER_PAGE))
  const pagedCamps = filteredCamps.slice((campPage - 1) * PER_PAGE, campPage * PER_PAGE)
  useEffect(() => setCampPage(1), [campStatus, campSearch])

  // Stats
  const subCounts = useMemo(() => ({
    all: subscribers.length,
    subscribed: subscribers.filter(s => s.status === 'subscribed').length,
    unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
    cleaned: subscribers.filter(s => s.status === 'cleaned').length,
  }), [subscribers])

  const campCounts = useMemo(() => ({
    all: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
  }), [campaigns])

  const totalSent = campaigns.filter(c => c.status === 'sent').reduce((s, c) => s + c.emails_sent, 0)

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Unsubscribe Confirm Modal */}
      {unsubTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <NoSymbolIcon className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Listeden Çıkar</h3>
              </div>
              <button onClick={() => setUnsubTarget(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Aşağıdaki kişi Mailchimp listesinden çıkarılacak:
            </p>
            <p className="text-sm font-medium text-gray-900 mb-1">{unsubTarget.email}</p>
            {(unsubTarget.first_name || unsubTarget.last_name) && (
              <p className="text-xs text-gray-500 mb-4">
                {[unsubTarget.first_name, unsubTarget.last_name].filter(Boolean).join(' ')}
              </p>
            )}
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Bu işlem geri alınamaz. Kişi artık mail almayacak, ancak Mailchimp&apos;te &quot;unsubscribed&quot; olarak görünmeye devam edecek.
            </p>
            {unsubError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{unsubError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setUnsubTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={unsubLoading}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {unsubLoading ? 'İşleniyor...' : 'Evet, Çıkar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-20 z-30 bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mailchimp</h1>
            <p className="text-sm text-gray-500 mt-1">Abone listesi ve kampanya geçmişi</p>
          </div>
          <button
            onClick={() => { fetchSubscribers(); fetchCampaigns() }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Özet kartlar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Toplam Abone', value: subCounts.subscribed, icon: UserGroupIcon, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Ayrılan', value: subCounts.unsubscribed, icon: UserGroupIcon, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Gönderilen Kampanya', value: campCounts.sent, icon: PaperAirplaneIcon, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Toplam Mail', value: totalSent, icon: EnvelopeIcon, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value.toLocaleString('tr-TR')}</p>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
          <button
            onClick={() => setView('subscribers')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${view === 'subscribers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UserGroupIcon className="w-4 h-4" />
            Aboneler
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${view === 'subscribers' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
              {subCounts.all}
            </span>
          </button>
          <button
            onClick={() => setView('campaigns')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${view === 'campaigns' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Kampanyalar
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${view === 'campaigns' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
              {campCounts.all}
            </span>
          </button>
        </div>

        {/* ===== SUBSCRIBERS ===== */}
        {view === 'subscribers' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['all', 'subscribed', 'unsubscribed', 'cleaned'] as SubStatusKey[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${subStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {s === 'all' ? 'Tümü' : s === 'subscribed' ? 'Aktif' : s === 'unsubscribed' ? 'Ayrıldı' : 'Temizlendi'}
                    <span className="ml-1.5 text-[10px] text-gray-400">{subCounts[s]}</span>
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="E-posta veya isim ara..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <span className="text-sm text-gray-400 ml-auto">{filteredSubs.length} abone</span>
            </div>

            {subError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{subError}</div>}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {subLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">E-Posta</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Ad Soyad</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Açılma Oranı</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Tıklama Oranı</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Eklenme</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Etiketler</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedSubs.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-12 text-gray-400">Kayıt bulunamadı</td></tr>
                      ) : pagedSubs.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{s.email}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {[s.first_name, s.last_name].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.avg_open_rate != null ? pct(s.avg_open_rate) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.avg_click_rate != null ? pct(s.avg_click_rate) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDate(s.subscribed_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {s.tags.length > 0
                                ? s.tags.map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full border border-blue-100">{tag}</span>
                                ))
                                : <span className="text-gray-300 text-xs">—</span>
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {s.status === 'subscribed' && (
                              <button
                                onClick={() => { setUnsubTarget(s); setUnsubError(null) }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <NoSymbolIcon className="w-3.5 h-3.5" />
                                Çıkar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={subPage} total={filteredSubs.length} perPage={PER_PAGE} totalPages={subTotalPages} onPage={setSubPage} />
            </div>
          </div>
        )}

        {/* ===== CAMPAIGNS ===== */}
        {view === 'campaigns' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['all', 'sent', 'draft'] as CampaignStatusKey[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCampStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${campStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {s === 'all' ? 'Tümü' : s === 'sent' ? 'Gönderildi' : 'Taslak'}
                    <span className="ml-1.5 text-[10px] text-gray-400">{campCounts[s] ?? filteredCamps.length}</span>
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Konu veya alıcı ara..."
                  value={campSearch}
                  onChange={(e) => setCampSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <span className="text-sm text-gray-400 ml-auto">{filteredCamps.length} kampanya</span>
            </div>

            {campError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{campError}</div>}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {campLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Konu</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Alıcı</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Gönderildi</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Açılma</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Tıklama</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Template</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedCamps.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-gray-400">Kayıt bulunamadı</td></tr>
                      ) : pagedCamps.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 max-w-[220px] truncate">{c.subject || c.title || '—'}</p>
                            {c.title && c.title !== c.subject && (
                              <p className="text-xs text-gray-400 truncate max-w-[220px]">{c.title}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {c.recipient_email ? (
                              <span className="text-sm text-gray-600">{c.recipient_email}</span>
                            ) : (
                              <span className="text-xs text-gray-300">Toplu</span>
                            )}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.sent_at)}</td>
                          <td className="px-4 py-3">
                            {c.status === 'sent' ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-14 bg-gray-100 rounded-full h-1.5">
                                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(c.open_rate * 100, 100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-500">{pct(c.open_rate)}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {c.status === 'sent' ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-14 bg-gray-100 rounded-full h-1.5">
                                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(c.click_rate * 100, 100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-500">{pct(c.click_rate)}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {c.template_id ? `#${c.template_id}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={campPage} total={filteredCamps.length} perPage={PER_PAGE} totalPages={campTotalPages} onPage={setCampPage} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Pagination({ page, total, perPage, totalPages, onPage }: {
  page: number; total: number; perPage: number; totalPages: number; onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <p className="text-sm text-gray-500">
        {total} kayıttan {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} gösteriliyor
      </p>
      <div className="flex gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, idx, arr) => (
            <span key={p}>
              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
              <button onClick={() => onPage(p)}
                className={`px-3 py-1.5 text-sm rounded-md border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                {p}
              </button>
            </span>
          ))}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}
