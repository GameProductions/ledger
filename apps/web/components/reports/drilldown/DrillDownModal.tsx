import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { getApiUrl } from '../../../utils/api'
import { Price } from '../../Price'
import { DrillDownPayload } from '../types'

interface DrillDownModalProps {
  payload: DrillDownPayload
  onClose: () => void
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({ payload, onClose }) => {
  const { token } = useAuth()
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (payload.from) params.set('from', payload.from)
        if (payload.to) params.set('to', payload.to)
        if (payload.categoryIds?.length) params.set('category_ids', payload.categoryIds.join(','))
        if (payload.description) params.set('q', payload.description)
        if (payload.type && payload.type !== 'all') params.set('type', payload.type)
        params.set('limit', '50')

        const res = await fetch(`${getApiUrl()}/api/financials/transactions?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json: any = await res.json()
          setTxns(json.success ? json.data : json)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    if (token) load()
  }, [payload, token])

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[80vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h3 className="text-sm font-black tracking-tighter">{payload.title}</h3>
            <p className="text-[10px] text-white/40 font-medium mt-0.5">{txns.length} transactions</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-white/30 font-black tracking-widest">Loading...</div>
          ) : txns.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/30 italic font-medium">No transactions found</div>
          ) : (
            txns.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-white/[0.02] rounded-lg transition-all">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white/80 truncate">{tx.description || 'Untitled'}</div>
                  <div className="text-[10px] text-white/30 font-medium">{tx.transactionDate}</div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <Price amountCents={tx.amountCents} className={`text-xs font-black ${tx.amountCents < 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
