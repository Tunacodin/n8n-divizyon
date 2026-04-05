import { NextResponse } from 'next/server'
import { SHEETS, fetchGoogleSheet, fetchIfExists, getSheetHeaders, normalizeItem } from '@/lib/fetch-sheet'

const N8N_URL = process.env.N8N_API_URL || ''
const SHEET_WRITE_WEBHOOK = `${N8N_URL}/webhook/sheet-write`

// Sheets that support gviz (public) — dedup check possible
const READABLE_SHEETS = new Set([
  'basvuru', 'kontrol', 'yasKucuk', 'kesinRet', 'nihaiOlmayan',
  'kesinKabul', 'etkinliktenGelenler', 'deaktive', 'nihaiAgUyesi',
])

function normalizeEmail(e: string) {
  return String(e ?? '').toLowerCase().trim()
}

async function emailExistsInSheet(sheetKey: string, email: string): Promise<boolean> {
  if (!READABLE_SHEETS.has(sheetKey) || !SHEETS[sheetKey]) return false
  try {
    const rows = await fetchIfExists(SHEETS[sheetKey])
    const norm = normalizeEmail(email)
    return rows.some(
      (r: Record<string, any>) =>
        normalizeEmail(r['E-Posta Adresin'] ?? r['E-Posta Adresi'] ?? r['E-Posta'] ?? r['Email'] ?? r['Mail'] ?? '') === norm
    )
  } catch {
    return false
  }
}

/**
 * POST /api/sheets/move
 *
 * Body: {
 *   email:      string
 *   fromSheet:  string  — source sheet key (basvuru, kontrol, …)
 *   toSheet:    string  — target sheet key (kesinKabul, kesinRet, …)
 *   extra?:     Record<string, string>  — Değerlendiren, Not, etc.
 * }
 *
 * Rules enforced here (not in n8n):
 *  1. Email must exist in fromSheet (if provided)
 *  2. Email must NOT already exist in toSheet  → 409 duplicate
 *  3. Writes via n8n sheet-write webhook
 */
export async function POST(request: Request) {
  try {
    const { email, fromSheet, toSheet, extra = {} } = await request.json()

    if (!email || !toSheet) {
      return NextResponse.json({ success: false, error: 'email and toSheet required' }, { status: 400 })
    }

    const targetSheetId = SHEETS[toSheet]
    if (!targetSheetId) {
      return NextResponse.json({ success: false, error: `Unknown sheet: ${toSheet}` }, { status: 400 })
    }

    // ── 1. Duplicate check: email already in target sheet? ──────────────────
    const alreadyExists = await emailExistsInSheet(toSheet, email)
    if (alreadyExists) {
      return NextResponse.json(
        { success: false, duplicate: true, error: `${email} already exists in ${toSheet}` },
        { status: 409 }
      )
    }

    // ── 2. Fetch source row ─────────────────────────────────────────────────
    let rowData: Record<string, any> = {}
    if (fromSheet && SHEETS[fromSheet]) {
      const rows = await fetchGoogleSheet(SHEETS[fromSheet])
      const normalized = rows.map(normalizeItem)
      const found = normalized.find(
        (r) => normalizeEmail(r['E-Posta Adresin'] ?? r['E-Posta Adresi'] ?? r['E-Posta'] ?? r['Email'] ?? r['Mail'] ?? '') === normalizeEmail(email)
      )
      if (!found && fromSheet) {
        return NextResponse.json(
          { success: false, error: `${email} not found in ${fromSheet}` },
          { status: 404 }
        )
      }
      if (found) {
        rowData = { ...found }
        // Remove dashboard-internal fields
        delete rowData.sheet
        delete rowData.status
        delete rowData.color
        delete rowData._sheetId
      }
    }

    // ── 3. "Değerlendiren" alanı otomasyon olamaz ───────────────────────────
    const degerlendiren = String(extra['Değerlendiren'] ?? rowData['Değerlendiren'] ?? '').trim()
    if (['kesinKabul', 'kesinRet'].includes(toSheet)) {
      if (!degerlendiren) {
        return NextResponse.json(
          { success: false, error: 'Değerlendiren alanı zorunludur' },
          { status: 400 }
        )
      }
      if (degerlendiren.toLowerCase() === 'otomasyon') {
        return NextResponse.json(
          { success: false, error: 'Değerlendiren "otomasyon" olamaz, bir değerlendirici adı girilmelidir' },
          { status: 400 }
        )
      }
    }

    // ── 4. Hedef sheet'in gerçek kolonlarını çek, sadece eşleşenleri gönder ──
    const allowedHeaders = await getSheetHeaders(targetSheetId)
    const merged = { ...rowData, ...extra }

    // etkinliktenGelenler farklı kolon adları kullanıyor — ters dönüşüm uygula
    if (toSheet === 'etkinliktenGelenler') {
      const fullName = String(merged['Adın Soyadın'] ?? '').trim()
      const parts = fullName.split(/\s+/)
      if (!merged['Ad'] && parts.length > 0) merged['Ad'] = parts[0]
      if (!merged['Soyad'] && parts.length > 1) merged['Soyad'] = parts.slice(1).join(' ')
      if (!merged['Email']) merged['Email'] = merged['E-Posta Adresin'] ?? ''
      if (!merged['Telefon']) merged['Telefon'] = merged['Telefon Numaran'] ?? ''
    }

    let finalRow: Record<string, any>
    if (allowedHeaders.length > 0) {
      finalRow = {}
      for (const col of allowedHeaders) {
        if (col in merged) finalRow[col] = merged[col]
      }
    } else {
      // Header okunamazsa sadece extra alanlarını gönder, kaynak veriyi gönderme
      finalRow = { ...extra }
    }

    const res = await fetch(SHEET_WRITE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId: targetSheetId, row: finalRow }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ success: false, error: `n8n webhook error: ${text}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, writtenTo: toSheet, email })
  } catch (error: any) {
    console.error('Move error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
