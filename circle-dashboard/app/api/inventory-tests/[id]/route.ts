import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/inventory-tests/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.inventory_tests.findUnique({
      where: { id: params.id },
      include: { applications: { select: { full_name: true, email: true, status: true } } },
    })

    if (!data) {
      return NextResponse.json({ success: false, error: 'Test bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
