import { TabId } from '../types'
import { formatCsv } from './csvFormatter'

export async function formatXlsx(tabId: TabId, data: any, filename: string): Promise<Blob> {
  const { headers, rows } = formatCsv(tabId, data)
  const { default: Excel } = await import('exceljs')
  const wb = new Excel.Workbook()
  const ws = wb.addWorksheet(tabId.charAt(0).toUpperCase() + tabId.slice(1))
  ws.columns = headers.map(h => ({ header: h, key: h, width: 20 }))
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } }
  rows.forEach(r => ws.addRow(r))
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
