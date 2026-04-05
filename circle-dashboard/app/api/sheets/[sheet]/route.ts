import { NextResponse } from 'next/server'
import { sheetsClient } from '@/lib/sheets'

/**
 * GET /api/sheets/[sheet]
 * Get data from a specific sheet (via n8n or Google Sheets API)
 */
export async function GET(
  request: Request,
  { params }: { params: { sheet: string } }
) {
  try {
    const sheet = params.sheet

    let data: any[] = []

    switch (sheet) {
      case 'kontrol':
        data = await sheetsClient.getKontrol()
        break
      case 'basvuru-formu':
        data = await sheetsClient.getBasvuruFormu()
        break
      case '18-yasından-kucuk':
        data = await sheetsClient.get18YasindanKucuk()
        break
      case 'kesin-ret':
        data = await sheetsClient.getKesinRet()
        break
      case 'timeline':
        data = await sheetsClient.getTimelineData()
        break
      case 'stats':
        const stats = await sheetsClient.getDashboardStats()
        return NextResponse.json({ success: true, data: stats })
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid sheet name' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, count: data.length, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
