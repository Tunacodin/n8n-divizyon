const N8N_API_URL = process.env.N8N_API_URL || 'https://83ohvlw5.rpcld.net'
const N8N_API_KEY = process.env.N8N_API_KEY || ''

export interface Workflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  nodes: any[]
  connections: any
  tags?: string[]
}

export interface Execution {
  id: string
  finished: boolean
  mode: string
  retryOf?: string
  retrySuccessId?: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  workflowData?: {
    name: string
  }
  data?: any
}

class N8NClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = N8N_API_URL
    this.apiKey = N8N_API_KEY
  }

  private async fetch(endpoint: string, options?: RequestInit) {
    const url = `${this.baseUrl}/api/v1${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.statusText}`)
    }

    return response.json()
  }

  // Get all workflows
  async getWorkflows(): Promise<{ data: Workflow[] }> {
    return this.fetch('/workflows')
  }

  // Get workflow by ID
  async getWorkflow(id: string): Promise<Workflow> {
    return this.fetch(`/workflows/${id}`)
  }

  // Get executions
  async getExecutions(limit = 100): Promise<{ data: Execution[] }> {
    return this.fetch(`/executions?limit=${limit}`)
  }

  // Get executions for a specific workflow
  async getWorkflowExecutions(workflowId: string, limit = 50): Promise<{ data: Execution[] }> {
    return this.fetch(`/executions?workflowId=${workflowId}&limit=${limit}`)
  }

  // Trigger webhook (for manual approval, etc.)
  async triggerWebhook(path: string, data?: any, method = 'GET') {
    const url = `${this.baseUrl}/webhook/${path}`

    const response = await fetch(url, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body: method === 'POST' && data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      throw new Error(`Webhook trigger error: ${response.statusText}`)
    }

    return response.json()
  }

  // Calculate health metrics
  async getHealthMetrics() {
    const [workflows, executions] = await Promise.all([
      this.getWorkflows(),
      this.getExecutions(100),
    ])

    const totalWorkflows = workflows.data.length
    const activeWorkflows = workflows.data.filter(w => w.active).length

    // Last 10 minutes executions
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentExecs = executions.data.filter(e =>
      new Date(e.startedAt) > tenMinAgo
    )

    const successExecs = recentExecs.filter(e => e.finished && !e.stoppedAt)
    const failedExecs = recentExecs.filter(e => e.stoppedAt && !e.finished)

    const successRate = recentExecs.length > 0
      ? ((successExecs.length / recentExecs.length) * 100).toFixed(2)
      : '100'

    return {
      totalWorkflows,
      activeWorkflows,
      inactiveWorkflows: totalWorkflows - activeWorkflows,
      recentExecutions: recentExecs.length,
      successCount: successExecs.length,
      failedCount: failedExecs.length,
      successRate: parseFloat(successRate),
      healthStatus: failedExecs.length > recentExecs.length * 0.1 ? 'CRITICAL' : 'HEALTHY',
    }
  }
}

export const n8nClient = new N8NClient()
