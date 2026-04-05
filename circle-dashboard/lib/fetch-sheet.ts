export const SHEETS: Record<string, string> = {
  basvuru: '1ldHhZ6H4NqK3ILhhL3tzbFzHLp1YrCYux5Vmg4zL8qE',
  kontrol: '16vorLiEB5_vyqOCuACFChFkVHnYZtCoIDIfIcT6POd8',
  yasKucuk: '1hCc4-lcOs9eYv2loguVY1HWW5ve1OuX9ohN65WkN_Jc',
  kesinRet: '16B9ZjzIHL02rkiZHm7WeLj2oaq-SBRpjqyvAiwULFX0',
  nihaiOlmayan: '1i1zjnCEMYkfIMv8Pjoda1eLHoWKC76YCik8B5LVCP-0',
  kesinKabul: '1MDGfncckImBlf1N70_0FmJqalYOkTYR8dOPX17tYtLo',
  etkinliktenGelenler: '1fkQ8A-qUf41smNDgxKvR7wwaZs-xx-UOpZW3fti1rtQ',
  deaktive: '1bTjcaH-J1RYtUqM9_ER4ib7-MBC1Vjbo0k0nJheVDBY',
  nihaiAgUyesi: '1a8nzWFLIuulbAoFAFW_HaexwvXVKtUD_ESbEExIBycE',
}

function parseGoogleDate(dateStr: string): string {
  try {
    const match = dateStr.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/)
    if (match) {
      const [, year, month, day, hour, minute, second] = match
      const date = new Date(
        parseInt(year), parseInt(month), parseInt(day),
        parseInt(hour), parseInt(minute), parseInt(second)
      )
      return date.toISOString()
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export async function fetchGoogleSheet(sheetId: string): Promise<Record<string, any>[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=1&gid=0`
    const response = await fetch(url, { cache: 'no-store' })
    const text = await response.text()

    const jsonText = text.substring(47).slice(0, -2)
    const data = JSON.parse(jsonText)

    const rows = data.table.rows || []
    const cols = data.table.cols || []
    const headers = cols.map((col: any) => col.label || col.id)

    const records = rows.map((row: any) => {
      const obj: any = {}
      row.c?.forEach((cell: any, index: number) => {
        const header = headers[index]
        let value: any
        const raw = cell?.v
        const formatted = cell?.f
        if (raw != null && String(raw).startsWith('Date(') && formatted) {
          value = formatted
        } else if (typeof raw === 'number' && Math.abs(raw) > 99999999 && formatted) {
          value = formatted
        } else {
          value = raw ?? formatted ?? ''
        }
        if (header === 'Submitted At' && value) {
          obj['Timestamp'] = parseGoogleDate(String(value))
          obj[header] = value
        } else {
          obj[header] = value
        }
      })
      return obj
    })

    return records.filter((record: Record<string, any>) =>
      Object.values(record).some(v => v !== '' && v !== false && v != null)
    )
  } catch (error) {
    console.error(`Error fetching sheet ${sheetId}:`, error)
    return []
  }
}

export async function fetchIfExists(sheetId: string): Promise<Record<string, any>[]> {
  if (!sheetId) return []
  return fetchGoogleSheet(sheetId)
}

/** Hedef sheet'in kolon adlarını döner (veri olmasa bile). */
export async function getSheetHeaders(sheetId: string): Promise<string[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=1&gid=0`
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()
    const data = JSON.parse(text.substring(47).slice(0, -2))
    const cols: any[] = data.table.cols || []
    return cols.map((c: any) => c.label || c.id).filter(Boolean)
  } catch {
    return []
  }
}

export function normalizeItem(item: Record<string, any>): Record<string, any> {
  if (!item['Adın Soyadın'] && item['Ad Soyad']) item['Adın Soyadın'] = item['Ad Soyad']
  if (!item['Adın Soyadın'] && item['Adın Soyadı']) item['Adın Soyadın'] = item['Adın Soyadı']
  if (!item['Adın Soyadın'] && item['İsim']) item['Adın Soyadın'] = item['İsim']
  if (!item['Adın Soyadın'] && item['Adı'] && item['Soyadı']) {
    item['Adın Soyadın'] = `${item['Adı']} ${item['Soyadı']}`.trim()
  }
  if (!item['Adın Soyadın'] && item['Ad'] && item['Soyad']) {
    item['Adın Soyadın'] = `${item['Ad']} ${item['Soyad']}`.trim()
  }
  if (!item['Adın Soyadın'] && item['Ad']) item['Adın Soyadın'] = item['Ad']
  if (!item['Adın Soyadın'] && item['Adı']) item['Adın Soyadın'] = item['Adı']

  if (!item['E-Posta Adresin'] && item['E-Posta']) item['E-Posta Adresin'] = item['E-Posta']
  if (!item['E-Posta Adresin'] && item['E-Posta Adresi']) item['E-Posta Adresin'] = item['E-Posta Adresi']
  if (!item['E-Posta Adresin'] && item['Email']) item['E-Posta Adresin'] = item['Email']
  if (!item['E-Posta Adresin'] && item['Mail']) item['E-Posta Adresin'] = item['Mail']

  if (!item['Telefon Numaran'] && item['Telefon']) item['Telefon Numaran'] = item['Telefon']
  if (!item['Telefon Numaran'] && item['Telefon Numarası']) item['Telefon Numaran'] = item['Telefon Numarası']

  if (!item['Doğum Tarihin (GG/AA/YYYY)'] && item['Doğum Tarihi']) {
    item['Doğum Tarihin (GG/AA/YYYY)'] = item['Doğum Tarihi']
  }

  if (!item['Cinsiyetin'] && item['Cinsiyeti']) item['Cinsiyetin'] = item['Cinsiyeti']

  return item
}
