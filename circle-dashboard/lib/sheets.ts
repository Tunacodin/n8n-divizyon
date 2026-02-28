import { google } from 'googleapis'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || ''

// Google Service Account credentials
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

const sheets = google.sheets({ version: 'v4', auth })

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
  // Generic method to fetch sheet data
  private async getSheetData(sheetName: string): Promise<any[]> {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEETS_ID,
        range: `${sheetName}!A1:ZZ1000`, // Get all data
      })

      const rows = response.data.values
      if (!rows || rows.length === 0) return []

      // Convert to objects using headers
      const headers = rows[0]
      return rows.slice(1).map(row => {
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = row[index] || ''
        })
        return obj
      })
    } catch (error) {
      console.error(`Error fetching ${sheetName}:`, error)
      return []
    }
  }

  // Get applications (Başvuru Sheet)
  async getApplications(): Promise<Application[]> {
    return this.getSheetData('Başvuru Sheet')
  }

  // Get pending applications
  async getPendingApplications(): Promise<Application[]> {
    const all = await this.getApplications()
    return all.filter(app => app.durum === 'Beklemede')
  }

  // Get approved applications
  async getApprovedApplications(): Promise<any[]> {
    return this.getSheetData('Kabul Edilenler')
  }

  // Get rejected applications
  async getRejectedApplications(): Promise<any[]> {
    return this.getSheetData('Reddedilenler')
  }

  // Get test results
  async getTestResults(): Promise<TestResult[]> {
    return this.getSheetData('Test Sonuçları')
  }

  // Get final members
  async getFinalMembers(): Promise<FinalMember[]> {
    return this.getSheetData('Nihai AĞ Üyesi')
  }

  // Get deactivated users
  async getDeactivatedUsers(): Promise<any[]> {
    return this.getSheetData('Deaktifler')
  }

  // Get event attendees
  async getEventAttendees(): Promise<any[]> {
    return this.getSheetData('Etkinlik Katılımcıları')
  }

  // Get dashboard stats
  async getDashboardStats() {
    const [
      applications,
      approved,
      rejected,
      testResults,
      finalMembers,
      deactivated,
    ] = await Promise.all([
      this.getApplications(),
      this.getApprovedApplications(),
      this.getRejectedApplications(),
      this.getTestResults(),
      this.getFinalMembers(),
      this.getDeactivatedUsers(),
    ])

    const pending = applications.filter(a => a.durum === 'Beklemede')
    const testCompleted = testResults.filter(t => t.tumTestlerTamamlandi === 'Evet')
    const testPending = testResults.filter(t => t.tumTestlerTamamlandi === 'Hayır')

    return {
      applications: {
        total: applications.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
      },
      tests: {
        total: testResults.length,
        completed: testCompleted.length,
        pending: testPending.length,
      },
      members: {
        active: finalMembers.filter(m => m.status === 'Active').length,
        deactivated: deactivated.length,
        total: finalMembers.length,
      },
    }
  }
}

export const sheetsClient = new SheetsClient()
