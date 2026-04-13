'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'

interface Workflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  nodes?: unknown[]
  tags?: Array<string | { name: string }>
}

interface Execution {
  id: string
  workflowId: string
  status: string
  mode: string
  finished: boolean
  startedAt: string | null
  stoppedAt: string | null
}

const N8N_HOST = 'https://jdmjkrs9.rpcld.net'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [execMap, setExecMap] = useState<Record<string, Execution[]>>({})
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try {
      const wRes = await fetch('/api/n8n/workflows').then((r) => r.json())
      const list: Workflow[] = wRes.data || []
      setWorkflows(list)

      // Son execution'ları paralel çek (her workflow için 3)
      const eMap: Record<string, Execution[]> = {}
      await Promise.all(
        list.map(async (w) => {
          try {
            const eRes = await fetch(`/api/n8n/executions?workflowId=${w.id}&limit=3`).then((r) => r.json())
            eMap[w.id] = eRes.data || []
          } catch { eMap[w.id] = [] }
        }),
      )
      setExecMap(eMap)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  const toggleWorkflow = async (id: string, active: boolean) => {
    setToggling(id)
    try {
      const res = await fetch('/api/workflows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active }),
      })
      const result = await res.json()
      if (result.success) {
        setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, active } : w)))
      } else {
        alert(result.error || 'Toggle başarısız')
      }
    } catch { alert('Bağlantı hatası') }
    setToggling(null)
  }

  const activeCount = workflows.filter((w) => w.active).length
  const filtered = workflows
    .filter((w) => !search.trim() || w.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const tagName = (t: unknown) => (typeof t === 'string' ? t : (t as { name?: string })?.name || '')

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workflowlar</h1>
            <p className="text-xs text-gray-500 mt-1">
              {workflows.length} workflow · <span className="text-emerald-600 font-medium">{activeCount} aktif</span> · {workflows.length - activeCount} pasif
            </p>
          </div>
          <input
            type="text"
            placeholder="Workflow ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64"
          />
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Workflow</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Durum</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Son Execution</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tag</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Güncelleme</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-40">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">Workflow bulunamadı</td></tr>
                ) : filtered.map((w) => {
                  const execs = execMap[w.id] || []
                  const last = execs[0]
                  return (
                    <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{w.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{w.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={w.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
                          {w.active ? '● aktif' : '○ pasif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {last ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                last.status === 'success' ? 'bg-emerald-500' :
                                last.status === 'error' ? 'bg-red-500' :
                                last.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                'bg-gray-400'
                              }`} />
                              <span className="text-xs text-gray-700">
                                {last.status} · {last.mode}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {last.startedAt ? formatRelativeTime(last.startedAt) : '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Hiç çalışmadı</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(w.tags || []).slice(0, 3).map((t, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {tagName(t)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatRelativeTime(w.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleWorkflow(w.id, !w.active)}
                            disabled={toggling === w.id}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                              w.active
                                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {toggling === w.id ? '...' : w.active ? 'Durdur' : 'Başlat'}
                          </button>
                          <a
                            href={`${N8N_HOST}/workflow/${w.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                          >
                            n8n'de aç ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
