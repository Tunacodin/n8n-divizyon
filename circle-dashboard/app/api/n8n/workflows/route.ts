import { NextResponse } from 'next/server'
import { n8nClient } from '@/lib/n8n-client'

export async function GET() {
  try {
    const workflows = await n8nClient.getWorkflows()
    return NextResponse.json({ success: true, data: workflows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, active } = await request.json()
    if (!id || typeof active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'id and active required' }, { status: 400 })
    }
    const result = await n8nClient.toggleWorkflow(id, active)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
