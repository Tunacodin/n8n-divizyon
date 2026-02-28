'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'

interface Workflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  nodes: any[]
  tags?: string[]
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkflows()
    const interval = setInterval(fetchWorkflows, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchWorkflows() {
    try {
      const res = await fetch('/api/workflows')
      const data = await res.json()
      setWorkflows(data.data || [])
    } catch (error) {
      console.error('Error fetching workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeCount = workflows.filter(w => w.active).length
  const inactiveCount = workflows.length - activeCount

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">n8n Workflows</h1>
        <p className="text-gray-500 mt-1">
          {workflows.length} workflow - {activeCount} aktif, {inactiveCount} pasif
        </p>
      </div>

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{workflow.name}</CardTitle>
                    <Badge variant={workflow.active ? 'success' : 'secondary'}>
                      {workflow.active ? '🟢 Aktif' : '⚫ Pasif'}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">
                    ID: {workflow.id} • {workflow.nodes.length} nodes
                  </CardDescription>
                </div>

                <div className="text-right text-sm text-gray-500">
                  <p>Güncelleme: {formatRelativeTime(workflow.updatedAt)}</p>
                  <p className="text-xs mt-1">Oluşturulma: {formatRelativeTime(workflow.createdAt)}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {workflow.tags?.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>

                <a
                  href={`https://83ohvlw5.rpcld.net/workflow/${workflow.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  n8n'de Aç →
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
