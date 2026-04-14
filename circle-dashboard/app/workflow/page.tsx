'use client'

import { useEffect, useState, useCallback } from 'react'

interface WorkflowNode {
  name: string
  type: string
}

interface Workflow {
  id: string
  name: string
  active: boolean
  updatedAt?: string
  createdAt?: string
  nodes?: WorkflowNode[]
}

interface Execution {
  id: string
  workflowId: string
  status: 'success' | 'error' | 'running' | 'waiting'
  startedAt: string
  stoppedAt?: string
  mode?: string
}

const NODE_TYPE_LABELS: Record<string, string> = {
  'n8n-nodes-base.googleSheetsTrigger': 'Google Sheets Tetikleyici',
  'n8n-nodes-base.googleSheets': 'Google Sheets',
  'n8n-nodes-base.code': 'Kod',
  'n8n-nodes-base.switch': 'Switch',
  'n8n-nodes-base.if': 'Koşul (If)',
  'n8n-nodes-base.set': 'Alan Düzenle',
  'n8n-nodes-base.webhook': 'Webhook',
  'n8n-nodes-base.httpRequest': 'HTTP İstek',
}

function nodeLabel(type: string) {
  return NODE_TYPE_LABELS[type] ?? type.split('.').pop() ?? type
}

function statusBadge(status: Execution['status']) {
  const map = {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
    waiting: 'bg-yellow-100 text-yellow-700',
  }
  const labels = { success: 'Başarılı', error: 'Hata', running: 'Çalışıyor', waiting: 'Bekliyor' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function formatDate(s?: string) {
  if (!s) return '—'
  return new Date(s).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [execLoading, setExecLoading] = useState(false)

  const loadWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/n8n/workflows')
      const json = await res.json()
      if (json.success) setWorkflows(json.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  const loadExecutions = useCallback(async (workflowId?: string) => {
    setExecLoading(true)
    try {
      const url = workflowId
        ? `/api/n8n/executions?workflowId=${workflowId}&limit=20`
        : '/api/n8n/executions?limit=30'
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) setExecutions(json.data ?? [])
    } catch {}
    finally { setExecLoading(false) }
  }, [])

  useEffect(() => {
    loadWorkflows()
    loadExecutions()
  }, [loadWorkflows, loadExecutions])

  useEffect(() => {
    loadExecutions(selected ?? undefined)
  }, [selected, loadExecutions])

  async function handleToggle(wf: Workflow) {
    setToggling(wf.id)
    try {
      const res = await fetch('/api/n8n/workflows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wf.id, active: !wf.active }),
      })
      const json = await res.json()
      if (json.success) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === wf.id ? { ...w, active: !wf.active } : w))
        )
      }
    } catch {}
    finally { setToggling(null) }
  }

  const activeCount = workflows.filter((w) => w.active).length
  const successCount = executions.filter((e) => e.status === 'success').length
  const errorCount = executions.filter((e) => e.status === 'error').length

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="sticky top-20 z-30 bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">n8n Workflow Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-1">Otomasyon workflow'larını izle ve yönet</p>
          </div>
          <button
            onClick={() => { loadWorkflows(); loadExecutions(selected ?? undefined) }}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Yenile
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Aktif Workflow</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">/ {workflows.length} toplam</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Başarılı Çalışma</p>
            <p className="text-2xl font-bold text-blue-600">{successCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">son çalışmalar</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Hata</p>
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">son çalışmalar</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Workflow listesi */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Workflow'lar</h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
              </div>
            ) : (
              workflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => setSelected(selected === wf.id ? null : wf.id)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                    selected === wf.id ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${wf.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <p className="text-sm font-semibold text-gray-900 truncate">{wf.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 ml-4">Güncellendi: {formatDate(wf.updatedAt)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(wf) }}
                      disabled={toggling === wf.id}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        wf.active ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          wf.active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Node listesi */}
                  {wf.nodes && wf.nodes.length > 0 && (
                    <div className="mt-3 ml-4 flex flex-wrap gap-1.5">
                      {wf.nodes.map((node, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                          {nodeLabel(node.type)}
                        </span>
                      ))}
                    </div>
                  )}
                  {wf.nodes && wf.nodes.length === 0 && (
                    <p className="mt-2 ml-4 text-xs text-gray-400 italic">Node yok (boş workflow)</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Execution geçmişi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                Çalışma Geçmişi
                {selected && (
                  <span className="ml-2 text-xs font-normal text-indigo-600">
                    — {workflows.find((w) => w.id === selected)?.name}
                  </span>
                )}
              </h2>
              {selected && (
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Tümünü göster
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {execLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
                </div>
              ) : executions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Henüz çalışma yok</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {executions.map((ex) => {
                    const wfName = workflows.find((w) => w.id === ex.workflowId)?.name ?? ex.workflowId
                    const duration =
                      ex.startedAt && ex.stoppedAt
                        ? Math.round((new Date(ex.stoppedAt).getTime() - new Date(ex.startedAt).getTime()) / 1000)
                        : null
                    return (
                      <div key={ex.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{wfName}</p>
                          <p className="text-xs text-gray-400">{formatDate(ex.startedAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {duration !== null && (
                            <span className="text-xs text-gray-400">{duration}s</span>
                          )}
                          {statusBadge(ex.status)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
