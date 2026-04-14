/**
 * n8n API Client
 * Fetches Google Sheets data through n8n workflows
 */

const N8N_API_URL = process.env.N8N_API_URL || ''
const N8N_API_KEY = process.env.N8N_API_KEY || ''

export class N8nClient {
  /**
   * Execute a workflow via n8n REST API
   */
  async executeWorkflow(workflowId: string, data?: any) {
    try {
      const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {}),
      })

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error(`Error executing n8n workflow ${workflowId}:`, error)
      throw error
    }
  }

  /**
   * Get all workflows
   */
  async getWorkflows() {
    try {
      const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`)
      }

      const result = await response.json()
      return result.data || result
    } catch (error) {
      console.error('Error fetching workflows:', error)
      throw error
    }
  }

  /**
   * Get workflow executions
   */
  async getExecutions(workflowId?: string, limit = 20) {
    try {
      const url = new URL(`${N8N_API_URL}/api/v1/executions`)
      if (workflowId) {
        url.searchParams.append('workflowId', workflowId)
      }
      url.searchParams.append('limit', limit.toString())

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`)
      }

      const result = await response.json()
      return result.data || result
    } catch (error) {
      console.error('Error fetching executions:', error)
      throw error
    }
  }

  /**
   * Get specific workflow details
   */
  async getWorkflow(workflowId: string) {
    try {
      const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      })

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error fetching workflow ${workflowId}:`, error)
      throw error
    }
  }

  /**
   * Toggle workflow active/inactive
   */
  async toggleWorkflow(workflowId: string, active: boolean) {
    const endpoint = active ? 'activate' : 'deactivate'
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}/${endpoint}`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
    })
    if (!response.ok) throw new Error(`n8n API error: ${response.status}`)
    return await response.json()
  }

  /**
   * Fetch data from n8n webhook
   * @param webhookPath - The webhook path (e.g., 'get-applications')
   */
  async fetchFromWebhook(webhookPath: string, params?: any) {
    try {
      const url = new URL(`${N8N_API_URL}/webhook/${webhookPath}`)

      if (params) {
        Object.keys(params).forEach(key => {
          url.searchParams.append(key, params[key])
        })
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Don't cache to get fresh data
      })

      if (!response.ok) {
        throw new Error(`n8n webhook error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error fetching from n8n webhook ${webhookPath}:`, error)
      throw error
    }
  }

  /**
   * Post data to n8n webhook
   */
  async postToWebhook(webhookPath: string, data: any) {
    try {
      const response = await fetch(`${N8N_API_URL}/webhook/${webhookPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`n8n webhook error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error(`Error posting to n8n webhook ${webhookPath}:`, error)
      throw error
    }
  }
}

export const n8nClient = new N8nClient()
