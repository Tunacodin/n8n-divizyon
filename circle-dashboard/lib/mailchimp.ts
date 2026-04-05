import { createHash } from 'crypto'

const API_KEY = process.env.MAILCHIMP_API_KEY || ''
const SERVER_PREFIX = API_KEY.split('-').pop() || ''
const BASE_URL = `https://${SERVER_PREFIX}.api.mailchimp.com/3.0`

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`anystring:${API_KEY}`).toString('base64')
}

function subscriberHash(email: string): string {
  return createHash('md5').update(email.toLowerCase()).digest('hex')
}

async function mailchimpFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error: any = new Error(data.detail || data.title || 'Mailchimp API error')
    error.status = res.status
    error.title = data.title
    throw error
  }

  return data
}

export const mailchimp = {
  /** Connection test */
  async ping() {
    return mailchimpFetch('/ping')
  },

  /** List all audiences */
  async getAudiences() {
    const data = await mailchimpFetch('/lists?count=100')
    return data.lists as any[]
  },

  /** Create a new audience */
  async createAudience(name: string) {
    return mailchimpFetch('/lists', {
      method: 'POST',
      body: JSON.stringify({
        name,
        permission_reminder: 'Divizyon Açık İnovasyon Ağı topluluğuna başvurduğunuz için bu listeye eklendiniz.',
        contact: {
          company: 'Divizyon',
          address1: 'Istanbul',
          city: 'Istanbul',
          state: '',
          zip: '34000',
          country: 'TR',
        },
        campaign_defaults: {
          from_name: 'Divizyon',
          from_email: 'info@divizyon.com',
          subject: '',
          language: 'tr',
        },
        email_type_option: false,
      }),
    })
  },

  /** Add a subscriber to an audience */
  async addSubscriber(
    listId: string,
    email: string,
    firstName: string,
    lastName: string
  ) {
    return mailchimpFetch(`/lists/${listId}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: firstName,
          LNAME: lastName,
        },
      }),
    })
  },

  /** Get subscriber status */
  async getSubscriber(listId: string, email: string) {
    const hash = subscriberHash(email)
    return mailchimpFetch(`/lists/${listId}/members/${hash}`)
  },

  /** List templates (user-created only) */
  async getTemplates() {
    const data = await mailchimpFetch('/templates?count=100&type=user')
    return data.templates as { id: number; name: string; type: string }[]
  },

  /** Create a campaign targeting a single email */
  async createCampaign(
    listId: string,
    email: string,
    subject: string,
    fromName: string = 'Divizyon'
  ) {
    return mailchimpFetch('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        type: 'regular',
        recipients: {
          list_id: listId,
          segment_opts: {
            match: 'all',
            conditions: [
              {
                condition_type: 'EmailAddress',
                field: 'EMAIL',
                op: 'is',
                value: email,
              },
            ],
          },
        },
        settings: {
          subject_line: subject,
          from_name: fromName,
          reply_to: 'info@divizyon.com',
        },
      }),
    })
  },

  /** Set campaign content from a template */
  async setCampaignContent(campaignId: string, templateId: number) {
    return mailchimpFetch(`/campaigns/${campaignId}/content`, {
      method: 'PUT',
      body: JSON.stringify({
        template: { id: templateId },
      }),
    })
  },

  /** Send a campaign */
  async sendCampaign(campaignId: string) {
    return mailchimpFetch(`/campaigns/${campaignId}/actions/send`, {
      method: 'POST',
    })
  },

  /** List subscribers of an audience (paginated, all) */
  async getSubscribers(listId: string, count = 1000, offset = 0) {
    const data = await mailchimpFetch(
      `/lists/${listId}/members?count=${count}&offset=${offset}&sort_field=last_changed&sort_dir=DESC`
    )
    return {
      members: data.members as any[],
      total_items: data.total_items as number,
    }
  },

  /** List campaigns with optional status filter */
  async getCampaigns(status?: string, count = 1000) {
    const statusParam = status ? `&status=${status}` : ''
    const data = await mailchimpFetch(
      `/campaigns?count=${count}&sort_field=send_time&sort_dir=DESC${statusParam}`
    )
    return data.campaigns as any[]
  },

  /** Check if a specific email has already received a specific template */
  async hasReceivedTemplate(listId: string, email: string, templateId: number): Promise<{ sent: boolean; campaignId?: string; sentAt?: string }> {
    // Sent kampanyaları çek
    const campaigns = await mailchimpFetch(
      `/campaigns?count=1000&status=sent&list_id=${listId}`
    )
    const sentCampaigns: any[] = campaigns.campaigns || []

    // Bu template ile gönderilmiş kampanya var mı?
    const match = sentCampaigns.find((c: any) => {
      const usesTemplate = c.settings?.template_id === templateId
      const targetEmail =
        c.recipients?.segment_opts?.conditions?.[0]?.value === email
      return usesTemplate && targetEmail
    })

    if (match) {
      return { sent: true, campaignId: match.id, sentAt: match.send_time }
    }
    return { sent: false }
  },

  /** Get campaigns sent to a specific subscriber (via member activity) */
  async getMemberActivity(listId: string, email: string) {
    const hash = subscriberHash(email)
    try {
      const data = await mailchimpFetch(
        `/lists/${listId}/members/${hash}/activity?count=50`
      )
      return data.activity as any[]
    } catch {
      return []
    }
  },

  /** Get campaign report summary */
  async getCampaignReport(campaignId: string) {
    try {
      return await mailchimpFetch(`/reports/${campaignId}`)
    } catch {
      return null
    }
  },

  /** Unsubscribe a member from a list */
  async unsubscribeMember(listId: string, email: string) {
    const hash = subscriberHash(email)
    return mailchimpFetch(`/lists/${listId}/members/${hash}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'unsubscribed' }),
    })
  },
}
