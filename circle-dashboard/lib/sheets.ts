import { n8nClient } from './n8n-client'
import { google } from 'googleapis'

// Hybrid mode: Try n8n first, fallback to Google Sheets API
const USE_N8N = process.env.USE_N8N_WEBHOOKS !== 'false' // Default to n8n
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || ''

// Google Sheets API client (fallback)
let sheetsAPI: any = null
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  sheetsAPI = google.sheets({ version: 'v4', auth })
}

export interface Application {
  email: string
  adSoyad: string
  yas: number
  telefon?: string
  dogumTarihi: string
  ilkeSozlesmesi: string
  yasKontrol: string
  ilkeKontrol: string
  durum: string
  degerlendiren?: string
  degerlendirmeTarihi?: string
  degerlendirmeNotlari?: string
  timestamp: string
}

export interface TestResult {
  email: string
  adSoyad: string
  karakteristikTamamlandi: string
  dijitalUrunTamamlandi: string
  kreatifYapimTamamlandi: string
  dijitalDeneyimTamamlandi: string
  tumTestlerTamamlandi: string
  karakteristikSkor?: number
  dijitalUrunSkor?: number
  kreatifYapimSkor?: number
  dijitalDeneyimSkor?: number
}

export interface FinalMember {
  email: string
  adSoyad: string
  anaRol: string
  atanmaTarihi: string
  status: string
  warningCount: number
}

class SheetsClient {
  // Generic method to fetch sheet data (hybrid: n8n + fallback to Google Sheets API)
  private async getSheetData(sheetName: string): Promise<any[]> {
    // Try n8n webhook first
    if (USE_N8N) {
      try {
        const webhookPath = this.getWebhookPath(sheetName)
        const result = await n8nClient.fetchFromWebhook(webhookPath)

        // Handle different response formats
        if (Array.isArray(result)) {
          console.log(`✅ n8n: Fetched ${result.length} rows from ${sheetName}`)
          return result
        } else if (result.data && Array.isArray(result.data)) {
          console.log(`✅ n8n: Fetched ${result.data.length} rows from ${sheetName}`)
          return result.data
        } else if (result.rows && Array.isArray(result.rows)) {
          console.log(`✅ n8n: Fetched ${result.rows.length} rows from ${sheetName}`)
          return result.rows
        }

        console.warn(`⚠️ n8n: Unexpected format from ${sheetName}, trying fallback...`)
      } catch (error) {
        console.error(`❌ n8n error for ${sheetName}:`, error)
        console.log(`🔄 Trying Google Sheets API fallback...`)
      }
    }

    // Fallback to Google Sheets API
    if (sheetsAPI && SHEETS_ID) {
      try {
        const response = await sheetsAPI.spreadsheets.values.get({
          spreadsheetId: SHEETS_ID,
          range: `${sheetName}!A1:ZZ1000`,
        })

        const rows = response.data.values
        if (!rows || rows.length === 0) {
          console.log(`⚠️ Google Sheets: No data in ${sheetName}`)
          return []
        }

        // Convert to objects using headers
        const headers = rows[0]
        const data = rows.slice(1).map((row: any) => {
          const obj: any = {}
          headers.forEach((header: string, index: number) => {
            obj[header] = row[index] || ''
          })
          return obj
        })

        console.log(`✅ Google Sheets API: Fetched ${data.length} rows from ${sheetName}`)
        return data
      } catch (error) {
        console.error(`❌ Google Sheets API error for ${sheetName}:`, error)
      }
    }

    console.error(`❌ No data source available for ${sheetName}`)
    return []
  }

  // Map sheet names to n8n webhook paths
  private getWebhookPath(sheetName: string): string {
    const webhookMap: Record<string, string> = {
      'Kontrol': 'get-kontrol',
      'Divizyon Açık İnovasyon Ağı | Başvuru Formu': 'get-basvuru-formu',
      '18 Yaşından Küçük': 'get-18-yasından-kucuk',
      'Kesin Ret': 'get-kesin-ret',
    }

    return webhookMap[sheetName] || `get-sheet?name=${encodeURIComponent(sheetName)}`
  }

  // Get Kontrol sheet data
  async getKontrol(): Promise<any[]> {
    return this.getSheetData('Kontrol')
  }

  // Get Başvuru Formu (Applications)
  async getBasvuruFormu(): Promise<any[]> {
    return this.getSheetData('Divizyon Açık İnovasyon Ağı | Başvuru Formu')
  }

  // Get 18 Yaşından Küçük (Under 18)
  async get18YasindanKucuk(): Promise<any[]> {
    return this.getSheetData('18 Yaşından Küçük')
  }

  // Get Kesin Ret (Definite Reject)
  async getKesinRet(): Promise<any[]> {
    return this.getSheetData('Kesin Ret')
  }

  // Get timeline data (all applications with their status)
  async getTimelineData() {
    const [
      basvuruFormu,
      yasindanKucuk,
      kesinRet,
      kontrol,
    ] = await Promise.all([
      this.getBasvuruFormu(),
      this.get18YasindanKucuk(),
      this.getKesinRet(),
      this.getKontrol(),
    ])

    const timeline: any[] = []

    // Add 18 Yaşından Küçük (Under 18)
    yasindanKucuk.forEach(item => {
      timeline.push({
        ...item,
        status: 'under_18',
        statusLabel: '18 Yaşından Küçük',
        sheet: '18 Yaşından Küçük',
        timestamp: item['Timestamp'] || item['Otomasyon'] || '',
        adSoyad: item['Adın Soyadın'] || item['Ad Soyad'] || '',
        email: item['E-Posta Adresin'] || item['Email'] || '',
      })
    })

    // Add Kesin Ret (Definite Reject)
    kesinRet.forEach(item => {
      timeline.push({
        ...item,
        status: 'kesin_ret',
        statusLabel: 'Kesin Ret',
        sheet: 'Kesin Ret',
        timestamp: item['Timestamp'] || item['Otomasyon'] || '',
        adSoyad: item['Adın Soyadın'] || item['Ad Soyad'] || '',
        email: item['E-Posta Adresin'] || item['Email'] || '',
      })
    })

    // Add Kontrol (Control List)
    kontrol.forEach(item => {
      timeline.push({
        ...item,
        status: 'kontrol',
        statusLabel: 'Kontrol',
        sheet: 'Kontrol',
        timestamp: item['Timestamp'] || item['Otomasyon'] || '',
        adSoyad: item['Adın Soyadın'] || item['Ad Soyad'] || '',
        email: item['E-Posta Adresin'] || item['E-Posta'] || item['Email'] || '',
      })
    })

    // Add Başvuru Formu (Applications)
    basvuruFormu.forEach(item => {
      timeline.push({
        ...item,
        status: 'basvuru',
        statusLabel: 'Başvuru',
        sheet: 'Divizyon Açık İnovasyon Ağı | Başvuru Formu',
        timestamp: item['Timestamp'] || item['timestamp'] || '',
        adSoyad: item['Adın Soyadın'] || item['Ad Soyad'] || '',
        email: item['E-Posta Adresin'] || item['Email'] || '',
      })
    })

    // Sort by timestamp (newest first)
    timeline.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime()
      const dateB = new Date(b.timestamp).getTime()
      return dateB - dateA
    })

    return timeline
  }

  // Get dashboard stats
  async getDashboardStats() {
    const [
      basvuruFormu,
      yasindanKucuk,
      kesinRet,
      kontrol,
    ] = await Promise.all([
      this.getBasvuruFormu(),
      this.get18YasindanKucuk(),
      this.getKesinRet(),
      this.getKontrol(),
    ])

    return {
      applications: {
        total: basvuruFormu.length,
        kontrol: kontrol.length,
        under18: yasindanKucuk.length,
        rejected: kesinRet.length,
      },
    }
  }
}

export const sheetsClient = new SheetsClient()
