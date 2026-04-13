'use client'

import { useEffect, useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'

interface TimelineEntry {
  id: string
  application_id: string
  from_status: string | null
  to_status: string
  changed_by: string
  reason: string | null
  change_type: string
  created_at: string
  applications: {
    full_name: string
    email: string
  } | null
}

const STATUS_LABELS: Record<string, string> = {
  basvuru: 'Basvuru',
  kontrol: 'Kontrol',
  kesin_kabul: 'Kesin Kabul',
  kesin_ret: 'Kesin Ret',
  nihai_olmayan: 'Kesin Kabul',
  yas_kucuk: '18 Yas Alti',
  etkinlik: 'Etkinlik',
  deaktive: 'Deaktive',
  nihai_uye: 'Nihai Uye',
}

const STATUS_COLORS: Record<string, string> = {
  basvuru: 'bg-blue-100 text-blue-700',
  kontrol: 'bg-yellow-100 text-yellow-700',
  kesin_kabul: 'bg-green-100 text-green-700',
  kesin_ret: 'bg-red-100 text-red-700',
  nihai_olmayan: 'bg-green-100 text-green-700',
  yas_kucuk: 'bg-orange-100 text-orange-700',
  deaktive: 'bg-gray-100 text-gray-700',
  nihai_uye: 'bg-amber-100 text-amber-700',
  etkinlik: 'bg-cyan-100 text-cyan-700',
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchTimeline()
  }, [statusFilter])

  async function fetchTimeline() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('limit', '200')

      const res = await fetch(`/api/applications/timeline?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Timeline fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, TimelineEntry[]> = {}
    for (const entry of data) {
      const date = new Date(entry.created_at).toLocaleDateString('tr-TR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(entry)
    }
    return groups
  }, [data])

  const statuses = Object.keys(STATUS_LABELS)

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zaman Cizelgesi</h1>
            <p className="text-sm text-gray-500 mt-0.5">Status gecis gecmisi</p>
          </div>
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-sm px-3 py-1">
            {data.length} kayit
          </Badge>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tumu
          </button>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s ? STATUS_COLORS[s] : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Kayit bulunamadi
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{date}</h2>
                    <p className="text-xs text-gray-500">{entries.length} islem</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="ml-5 border-l-2 border-gray-100 pl-6 space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {entry.applications?.full_name || 'Bilinmiyor'}
                            </p>
                            <p className="text-xs text-gray-500">{entry.applications?.email || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.from_status && (
                            <>
                              <Badge className={STATUS_COLORS[entry.from_status] || 'bg-gray-100 text-gray-600'}>
                                {STATUS_LABELS[entry.from_status] || entry.from_status}
                              </Badge>
                              <span className="text-gray-400 text-xs">→</span>
                            </>
                          )}
                          <Badge className={STATUS_COLORS[entry.to_status] || 'bg-gray-100 text-gray-600'}>
                            {STATUS_LABELS[entry.to_status] || entry.to_status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{new Date(entry.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>by {entry.changed_by}</span>
                        {entry.change_type === 'rollback' && (
                          <Badge className="bg-orange-100 text-orange-600 text-[10px]">Geri Alma</Badge>
                        )}
                        {entry.reason && <span className="text-gray-500">— {entry.reason}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
