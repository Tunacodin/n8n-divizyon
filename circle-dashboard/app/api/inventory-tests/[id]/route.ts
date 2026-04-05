import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/inventory-tests/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const { data, error } = await db
      .from('inventory_tests')
      .select('*, applications(full_name, email, status)')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Test bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
