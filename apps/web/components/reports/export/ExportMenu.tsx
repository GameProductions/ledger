import React, { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { TabId } from '../types'
import { useApi } from '../../../hooks/useApi'
import { useReportFilters } from '../context/ReportFilterContext'
import { formatCsv } from './csvFormatter'
import { formatXlsx } from './xlsxFormatter'
import { formatPdf } from './pdfFormatter'
import { useToast } from '../../../context/ToastContext'

interface ExportMenuProps {
  tabId: TabId
  reportRef: React.RefObject<HTMLDivElement | null>
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ tabId, reportRef }) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const { showToast } = useToast()
  const { data: raw } = useApi<any>(`/api/reports/${tabId}`)
  const { filters } = useReportFilters()

  const d = raw as any
  const data = d?.success ? d.data : d

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCsv = () => {
    if (!data) return
    const { headers, rows } = formatCsv(tabId, data)
    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `ledger-${tabId}-${filters.from}-${filters.to}.csv`)
    showToast('CSV exported', 'success')
    setOpen(false)
  }

  const handleXlsx = async () => {
    if (!data) return
    setLoading('xlsx')
    try {
      const blob = await formatXlsx(tabId, data, `ledger-${tabId}-${filters.from}-${filters.to}.xlsx`)
      downloadBlob(blob, `ledger-${tabId}-${filters.from}-${filters.to}.xlsx`)
      showToast('XLSX exported', 'success')
    } catch { showToast('XLSX export failed', 'error') }
    setLoading(null)
    setOpen(false)
  }

  const handlePdf = async () => {
    if (!reportRef.current) return
    setLoading('pdf')
    try {
      const blob = await formatPdf(reportRef.current, `ledger-${tabId}-${filters.from}-${filters.to}.pdf`)
      downloadBlob(blob, `ledger-${tabId}-${filters.from}-${filters.to}.pdf`)
      showToast('PDF exported', 'success')
    } catch { showToast('PDF export failed', 'error') }
    setLoading(null)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black tracking-widest transition-all disabled:opacity-40"
      >
        <Download size={12} /> {loading ? `Exporting ${loading}...` : 'Export'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-deep border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden min-w-[140px]">
            <button onClick={handleCsv} className="w-full text-left px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 transition-all">CSV</button>
            <button onClick={handleXlsx} className="w-full text-left px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 transition-all">XLSX</button>
            <button onClick={handlePdf} className="w-full text-left px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 transition-all">PDF</button>
          </div>
        </>
      )}
    </div>
  )
}
