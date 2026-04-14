'use client'

import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface MailLog {
  id: string
  application_id: string | null
  email_to: string
  template_name: string | null
  subject: string | null
  status: string
  provider: string
  batch_id: string | null
  sent_by: string | null
  sent_at: string
  applications?: { full_name?: string; email?: string; status?: string } | null
}

const statusBadge: Record<string, string> = {
  sent:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:   'bg-red-50 text-red-700 border-red-200',
  bounced:  'bg-amber-50 text-amber-700 border-amber-200',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function MailServisiPage() {
  const [rows, setRows] = useState<MailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [templateFilter, setTemplateFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [senderFilter, setSenderFilter] = useState<string>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mail/logs?limit=500').then(r => r.json())
      if (res.success) setRows(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const templates = useMemo(() => {
    const seen: Record<string, true> = {}
    for (const r of rows) if (r.template_name) seen[r.template_name] = true
    return Object.keys(seen).sort()
  }, [rows])

  const senders = useMemo(() => {
    const seen: Record<string, true> = {}
    for (const r of rows) if (r.sent_by) seen[r.sent_by] = true
    return Object.keys(seen).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let items = rows
    if (statusFilter !== 'all') items = items.filter(r => r.status === statusFilter)
    if (templateFilter !== 'all') items = items.filter(r => r.template_name === templateFilter)
    if (senderFilter !== 'all') items = items.filter(r => (r.sent_by || '') === senderFilter)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      items = items.filter(r =>
        r.email_to.toLowerCase().includes(q) ||
        (r.subject || '').toLowerCase().includes(q) ||
        (r.applications?.full_name || '').toLowerCase().includes(q),
      )
    }
    return items
  }, [rows, search, templateFilter, statusFilter, senderFilter])

  const counts = useMemo(() => ({
    total: rows.length,
    sent: rows.filter(r => r.status === 'sent').length,
    failed: rows.filter(r => r.status === 'failed').length,
  }), [rows])

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="sticky top-20 z-30 bg-white border-b border-gray-100 px-8 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mail Servisi</h1>
            <p className="text-xs text-gray-500 mt-1">
              {counts.total} kayit · <span className="text-emerald-600 font-medium">{counts.sent} basarili</span>
              {counts.failed > 0 && <> · <span className="text-red-600 font-medium">{counts.failed} hata</span></>}
            </p>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Alici, konu veya isim ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-72"
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white outline-none"
          >
            <option value="all">Tum Durumlar</option>
            <option value="sent">Basarili</option>
            <option value="failed">Hatali</option>
            <option value="bounced">Iade</option>
          </select>
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white outline-none"
          >
            <option value="all">Tum Templateler</option>
            {templates.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={senderFilter}
            onChange={(e) => setSenderFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white outline-none"
          >
            <option value="all">Tum Gonderenler</option>
            {senders.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-44">Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Alici</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Konu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Template</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">Gonderen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Durum</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Yukleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Kayit bulunamadi</td></tr>
              ) : (
                filtered.map(r => {
                  const badge = statusBadge[r.status] || 'bg-gray-50 text-gray-700 border-gray-200'
                  const name = r.applications?.full_name
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.sent_at)}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{r.email_to}</div>
                        {name && <div className="text-xs text-gray-400 mt-0.5">{name}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.subject || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.template_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.sent_by || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge}`}>
                          {r.status === 'sent' ? 'Basarili' : r.status === 'failed' ? 'Hatali' : r.status}
                        </span>
                        {r.batch_id && (
                          <div className="text-[10px] text-gray-400 mt-0.5">Toplu</div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
