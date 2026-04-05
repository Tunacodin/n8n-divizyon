import { NextResponse } from 'next/server'
import { createClient, rollbackApplication } from '@/lib/supabase'

// POST /api/applications/[id]/rollback
// Body: { rolled_back_by }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.rolled_back_by) {
      return NextResponse.json(
        { success: false, error: 'rolled_back_by zorunlu' },
        { status: 400 }
      )
    }

    const result = await rollbackApplication(db, params.id, body.rolled_back_by)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const { data } = await db.from('applications').select('*').eq('id', params.id).single()

    return NextResponse.json({ success: true, data, restoredStatus: result.restoredStatus })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
