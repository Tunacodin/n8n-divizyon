import { NextResponse } from 'next/server'
import { n8nClient } from '@/lib/n8n-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/n8n/executions?workflowId=xxx&limit=20
 * Get workflow executions
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId') || undefined
    const limit = parseInt(searchParams.get('limit') || '20')

    const executions = await n8nClient.getExecutions(workflowId, limit)
    return NextResponse.json({ success: true, data: executions })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
