import { NextResponse } from 'next/server'
import { fetchGoogleSheet } from '@/lib/gviz'

const AG_UYELERI_SHEET_ID = '1i1zjnCEMYkfIMv8Pjoda1eLHoWKC76YCik8B5LVCP-0'

export async function GET() {
  try {
    const data = await fetchGoogleSheet(AG_UYELERI_SHEET_ID)

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    })
  } catch (error: any) {
    console.error('Error fetching Ağ Üyeleri:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
