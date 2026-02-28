import { NextResponse } from 'next/server'
import { sheetsClient } from '@/lib/sheets'

export async function GET() {
  try {
    const stats = await sheetsClient.getDashboardStats()
    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export const revalidate = 30 // Revalidate every 30 seconds
