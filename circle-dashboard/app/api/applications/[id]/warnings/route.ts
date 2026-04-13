import { NextResponse } from 'next/server'
import { createClient, withAuditLog, isProtectedApplication, PROTECTED_BLOCK_MSG } from '@/lib/supabase'

const VALID_FORM_TYPES = ['karakteristik_envanter', 'disipliner_envanter'] as const

// GET /api/applications/[id]/warnings?form_type=
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()
  const { searchParams } = new URL(req.url)
  const formType = searchParams.get('form_type')

  try {
    let query = db
      .from('warnings')
      .select('*')
      .eq('application_id', params.id)
      .order('warned_at', { ascending: false })

    if (formType === 'null') {
      query = query.is('form_type', null)
    } else if (formType) {
      query = query.eq('form_type', formType)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/applications/[id]/warnings
// Body: { warned_by, reason?, form_type? }
// form_type: 'karakteristik_envanter' | 'disipliner_envanter' | null (genel uyari)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const db = createClient()

  try {
    const body = await req.json()

    if (!body.warned_by) {
      return NextResponse.json({ success: false, error: 'warned_by zorunlu' }, { status: 400 })
    }

    if (await isProtectedApplication(db, params.id)) {
      return NextResponse.json({ success: false, error: PROTECTED_BLOCK_MSG }, { status: 403 })
    }

    let formType: string | null = null
    if (body.form_type) {
      if (!VALID_FORM_TYPES.includes(body.form_type)) {
        return NextResponse.json(
          { success: false, error: `Gecersiz form_type. Gecerli: ${VALID_FORM_TYPES.join(', ')} veya bos` },
          { status: 400 }
        )
      }
      formType = body.form_type
    }

    // Mevcut aktif uyari sayisini al (tum uyarilar icin global sayac)
    const { count } = await db
      .from('warnings')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', params.id)
      .eq('is_active', true)

    const warningNumber = (count || 0) + 1

    const { data, error } = await db
      .from('warnings')
      .insert({
        application_id: params.id,
        warning_number: warningNumber,
        warned_by: body.warned_by,
        reason: body.reason || null,
        form_type: formType,
      })
      .select()
      .single()

    if (error) throw error

    await db
      .from('applications')
      .update({ warning_count: warningNumber })
      .eq('id', params.id)

    await withAuditLog(db, {
      entityType: 'application',
      entityId: params.id,
      action: 'warning_added',
      actor: body.warned_by,
      newValues: { warning_number: warningNumber, reason: body.reason, form_type: formType },
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
