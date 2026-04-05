import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/applications/[id]/history
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const [statusHistory, auditLog, snapshots] = await Promise.all([
      db
        .from('status_history')
        .select('*')
        .eq('application_id', params.id)
        .order('created_at', { ascending: false }),
      db
        .from('audit_log')
        .select('*')
        .eq('entity_type', 'application')
        .eq('entity_id', params.id)
        .order('created_at', { ascending: false }),
      db
        .from('application_snapshots')
        .select('id, trigger_action, created_by, created_at')
        .eq('application_id', params.id)
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        status_history: statusHistory.data || [],
        audit_log: auditLog.data || [],
        snapshots: snapshots.data || [],
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
