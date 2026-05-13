import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rollbackApplication } from '@/lib/supabase'

// POST /api/applications/[id]/rollback
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    if (!body.rolled_back_by) {
      return NextResponse.json(
        { success: false, error: 'rolled_back_by zorunlu' },
        { status: 400 },
      )
    }

    const result = await rollbackApplication(params.id, body.rolled_back_by)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const data = await prisma.applications.findUnique({ where: { id: params.id } })

    return NextResponse.json({ success: true, data, restoredStatus: result.restoredStatus })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
