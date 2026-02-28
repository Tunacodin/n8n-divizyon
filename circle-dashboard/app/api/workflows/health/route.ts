import { NextResponse } from 'next/server'
import { n8nClient } from '@/lib/n8n'

export async function GET() {
  try {
    const health = await n8nClient.getHealthMetrics()
    return NextResponse.json(health)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export const revalidate = 60 // Revalidate every 60 seconds
