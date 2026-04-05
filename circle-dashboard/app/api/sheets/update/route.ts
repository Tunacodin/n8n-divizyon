import { NextResponse } from 'next/server'
import { n8nClient } from '@/lib/n8n-client'

// Sheet ID mapping (same as all/route.ts)
const SHEETS: Record<string, string> = {
  kontrol: '16vorLiEB5_vyqOCuACFChFkVHnYZtCoIDIfIcT6POd8',
  kesinRet: '16B9ZjzIHL02rkiZHm7WeLj2oaq-SBRpjqyvAiwULFX0',
  kesinKabul: '1MDGfncckImBlf1N70_0FmJqalYOkTYR8dOPX17tYtLo',
  nihaiOlmayan: '1i1zjnCEMYkfIMv8Pjoda1eLHoWKC76YCik8B5LVCP-0',
}

/**
 * POST /api/sheets/update
 * Proxies sheet cell updates to n8n webhook
 *
 * Body: {
 *   sheet: "kontrol" | "kesinRet" | "kesinKabul" | "nihaiOlmayan"
 *   email: string (row identifier)
 *   updates: { [columnName: string]: string }
 * }
 */
export async function POST(request: Request) {
  try {
    const { sheet, email, updates } = await request.json()

    if (!sheet || !email || !updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'sheet, email, and updates are required' },
        { status: 400 }
      )
    }

    const sheetId = SHEETS[sheet]
    if (!sheetId) {
      return NextResponse.json(
        { success: false, error: `Unknown sheet: ${sheet}` },
        { status: 400 }
      )
    }

    const result = await n8nClient.postToWebhook('update-sheet', {
      sheetId,
      sheet,
      email,
      updates,
    })

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: any) {
    console.error('Sheet update error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
