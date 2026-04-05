import { NextResponse } from 'next/server'
import { createClient, changeStatus, type ApplicationStatus } from '@/lib/supabase'

// PATCH /api/applications/[id]/status
// Body: { to_status, changed_by, reason?, extra_updates? }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.to_status || !body.changed_by) {
      return NextResponse.json(
        { success: false, error: 'to_status ve changed_by zorunlu' },
        { status: 400 }
      )
    }

    const result = await changeStatus(db, {
      applicationId: params.id,
      toStatus: body.to_status as ApplicationStatus,
      changedBy: body.changed_by,
      reason: body.reason,
      extraUpdates: body.extra_updates,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    // Guncel veriyi don
    const { data } = await db.from('applications').select('*').eq('id', params.id).single()

    return NextResponse.json({ success: true, data, fromStatus: result.fromStatus, toStatus: result.toStatus })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
