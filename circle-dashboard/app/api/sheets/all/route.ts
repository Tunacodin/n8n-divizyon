import { NextResponse } from 'next/server'
import { SHEETS, fetchGoogleSheet, fetchIfExists, normalizeItem } from '@/lib/fetch-sheet'

const OPTIONAL_SHEETS = new Set(['etkinliktenGelenler', 'deaktive', 'nihaiAgUyesi'])

const SHEET_LABELS: Record<string, { sheet: string; status: string; color: string }> = {
  basvuru:              { sheet: 'Başvuru Formu',            status: 'pending',      color: 'blue'   },
  kontrol:              { sheet: 'Kontrol',                  status: 'review',       color: 'yellow' },
  yasKucuk:             { sheet: '18 Yaş Altı',              status: 'rejected',     color: 'orange' },
  kesinRet:             { sheet: 'Kesin Ret',                status: 'rejected',     color: 'red'    },
  nihaiOlmayan:         { sheet: 'Nihai Olmayan Ağ Üyeleri', status: 'warning',      color: 'purple' },
  kesinKabul:           { sheet: 'Kesin Kabul',              status: 'accepted',     color: 'green'  },
  etkinliktenGelenler:  { sheet: 'Etkinlikten Gelenler',     status: 'event',        color: 'cyan'   },
  deaktive:             { sheet: 'Deaktive',                 status: 'deactivated',  color: 'gray'   },
  nihaiAgUyesi:         { sheet: 'Nihai Ağ Üyesi',           status: 'final',        color: 'amber'  },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const singleKey = searchParams.get('key')

  try {
    // Tek sheet modu
    if (singleKey && SHEETS[singleKey]) {
      const fetchFn = OPTIONAL_SHEETS.has(singleKey) ? fetchIfExists : fetchGoogleSheet
      const rows = await fetchFn(SHEETS[singleKey])
      const meta = SHEET_LABELS[singleKey] ?? { sheet: singleKey, status: 'unknown', color: 'gray' }
      const data: Record<string, any>[] = rows.map((item: Record<string, any>) => ({ ...normalizeItem(item), ...meta }))
      data.sort((a, b) =>
        new Date(b['Timestamp'] || b['timestamp'] || 0).getTime() -
        new Date(a['Timestamp'] || a['timestamp'] || 0).getTime()
      )
      return NextResponse.json({ success: true, total: data.length, data, breakdown: { [singleKey]: data.length } })
    }

    // Tüm sheetler
    const [basvuru, kontrol, yasKucuk, kesinRet, nihaiOlmayan, kesinKabul, etkinliktenGelenler, deaktive, nihaiAgUyesi] =
      await Promise.all([
        fetchGoogleSheet(SHEETS.basvuru),
        fetchGoogleSheet(SHEETS.kontrol),
        fetchGoogleSheet(SHEETS.yasKucuk),
        fetchGoogleSheet(SHEETS.kesinRet),
        fetchGoogleSheet(SHEETS.nihaiOlmayan),
        fetchGoogleSheet(SHEETS.kesinKabul),
        fetchIfExists(SHEETS.etkinliktenGelenler),
        fetchIfExists(SHEETS.deaktive),
        fetchIfExists(SHEETS.nihaiAgUyesi),
      ])

    const allData: Record<string, any>[] = [
      ...basvuru.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Başvuru Formu', status: 'pending', color: 'blue' })),
      ...kontrol.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Kontrol', status: 'review', color: 'yellow' })),
      ...yasKucuk.map((item: Record<string, any>) => ({
        ...normalizeItem(item),
        sheet: '18 Yaş Altı',
        status: 'rejected',
        color: 'orange',
        Timestamp: item['Timestamp'] || item['Doğum Tarihin (GG/AA/YYYY)'] || '',
      })),
      ...kesinRet.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Kesin Ret', status: 'rejected', color: 'red' })),
      ...nihaiOlmayan.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Nihai Olmayan Ağ Üyeleri', status: 'warning', color: 'purple' })),
      ...kesinKabul.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Kesin Kabul', status: 'accepted', color: 'green' })),
      ...etkinliktenGelenler.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Etkinlikten Gelenler', status: 'event', color: 'cyan' })),
      ...deaktive.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Deaktive', status: 'deactivated', color: 'gray' })),
      ...nihaiAgUyesi.map((item: Record<string, any>) => ({ ...normalizeItem(item), sheet: 'Nihai Ağ Üyesi', status: 'final', color: 'amber' })),
    ]

    allData.sort((a: Record<string, any>, b: Record<string, any>) =>
      new Date(b['Timestamp'] || b['timestamp'] || 0).getTime() -
      new Date(a['Timestamp'] || a['timestamp'] || 0).getTime()
    )

    return NextResponse.json({
      success: true,
      total: allData.length,
      data: allData,
      breakdown: {
        basvuru: basvuru.length,
        kontrol: kontrol.length,
        yasKucuk: yasKucuk.length,
        kesinRet: kesinRet.length,
        nihaiOlmayan: nihaiOlmayan.length,
        kesinKabul: kesinKabul.length,
        etkinliktenGelenler: etkinliktenGelenler.length,
        deaktive: deaktive.length,
        nihaiAgUyesi: nihaiAgUyesi.length,
      },
    })
  } catch (error) {
    console.error('Error fetching all sheets:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch sheets' }, { status: 500 })
  }
}
