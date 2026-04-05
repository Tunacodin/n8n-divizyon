/**
 * Google Sheets gviz API - Public visualization query API
 * Fetches data from publicly shared Google Sheets without authentication
 */

export async function fetchGoogleSheet(sheetId: string, gid: number = 0): Promise<Record<string, any>[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=1&gid=${gid}`
    const response = await fetch(url, { cache: 'no-store' })
    const text = await response.text()

    // Remove Google's JSON wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
    const jsonText = text.substring(47).slice(0, -2)
    const data = JSON.parse(jsonText)

    const rows = data.table.rows || []
    const cols = data.table.cols || []

    // Get headers from column labels
    const headers = cols.map((col: any) => col.label || col.id)

    // Convert to array of objects
    const records = rows.map((row: any) => {
      const obj: Record<string, any> = {}
      row.c?.forEach((cell: any, index: number) => {
        const header = headers[index]

        let value: any
        const raw = cell?.v
        const formatted = cell?.f

        if (raw != null && String(raw).startsWith('Date(') && formatted) {
          // Date values: use formatted string
          value = formatted
        } else if (typeof raw === 'number' && Math.abs(raw) > 99999999 && formatted) {
          // Large numbers (phone numbers etc.): use formatted string to avoid scientific notation
          value = formatted
        } else {
          value = raw ?? formatted ?? ''
        }

        obj[header] = value
      })
      return obj
    })

    // Filter out empty rows
    return records.filter((record: Record<string, any>) => {
      return Object.values(record).some(v => v !== '' && v !== false && v != null)
    })
  } catch (error) {
    console.error(`Error fetching sheet ${sheetId}:`, error)
    return []
  }
}
