import { NextResponse } from 'next/server'
import { n8nClient } from '@/lib/n8n'

export async function GET() {
  try {
    const workflows = await n8nClient.getWorkflows()
    return NextResponse.json(workflows)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
