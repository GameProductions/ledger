import React, { useState } from 'react'
import { X, Copy, Check, Link, Trash2, Globe } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

interface ShareDialogProps {
  targetType: 'bill' | 'subscription'
  targetId: string
  targetName: string
  onClose: () => void
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ targetType, targetId, targetName, onClose }) => {
  const { token } = useAuth()
  const { showToast } = useToast()
  const { data: shares = [], mutate } = (useApi(`/api/planning/${targetType}s/${targetId}/share`) as any)
  const [label, setLabel] = useState('')
  const [permission, setPermission] = useState<'view' | 'view_and_pay'>('view')
  const [visibilityScope, setVisibilityScope] = useState<'name_only' | 'full'>('name_only')
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!label.trim() || !token) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/planning/${targetType}s/${targetId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contactLabel: label.trim(),
          permission,
          visibilityScope,
        }),
      })
      const data = await res.json() as any
      if (data.success) {
        showToast('Share link generated!')
        setLabel('')
        mutate()
      }
    } catch {
      showToast('Failed to generate share link')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (token: string) => {
    if (!token) return
    const res = await fetch(`/api/planning/share/${token}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Share link revoked')
      mutate()
    }
  }

  const handleCopy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}${url}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    showToast('Link copied!')
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <div className="card w-full max-w-md p-6 space-y-5 relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black italic tracking-tighter">
            Share <span className="text-primary">{targetName}</span>
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Generate new link */}
        <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest text-secondary">Recipient label</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Sarah, Mom, Roommate"
              className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest text-secondary">Permission</label>
              <select
                value={permission}
                onChange={e => setPermission(e.target.value as any)}
                className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold"
              >
                <option value="view">View only</option>
                <option value="view_and_pay">View & pay</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest text-secondary">Visible info</label>
              <select
                value={visibilityScope}
                onChange={e => setVisibilityScope(e.target.value as any)}
                className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold"
              >
                <option value="name_only">Name only</option>
                <option value="full">Full amount</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !label.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl text-xs font-black tracking-widest hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Link size={14} /> {generating ? 'Generating...' : 'Generate Link'}
          </button>
        </div>

        {/* Active shares */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black tracking-widest text-white/40">Active share links</h4>
          {(!shares || shares.length === 0) ? (
            <p className="text-xs text-white/20 font-medium py-2 text-center">No active shares</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {(shares as any[]).map((share: any) => (
                <div key={share.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <Globe size={12} className="text-primary" />
                      {share.contactLabel}
                    </div>
                    <div className="text-[9px] text-white/30 font-medium mt-0.5">
                      {share.permission === 'view_and_pay' ? 'View & pay' : 'View only'} · {share.visibilityScope === 'full' ? 'Full amount' : 'Name only'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(`/api/shared/${share.token}`, share.id)}
                      className="p-2 text-white/40 hover:text-primary transition-colors"
                      title="Copy link"
                    >
                      {copiedId === share.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleRevoke(share.token)}
                      className="p-2 text-white/40 hover:text-red-500 transition-colors"
                      title="Revoke"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
