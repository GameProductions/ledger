import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { getApiUrl } from '../utils/api'
import { Smartphone, Check, X, RefreshCw, ArrowRight } from 'lucide-react'
import { InlineToast } from './ui/InlineToast'

interface PendingRequest {
  id: string
  code: string
  deviceInfo: string
  status: string
  expiresAt: string
  createdAt: string
}

export function CrossDeviceRequests() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [approvalCode, setApprovalCode] = useState('')
  const [approving, setApproving] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loadingPending, setLoadingPending] = useState(false)

  const apiUrl = (getApiUrl() || '').replace(/\/$/, '')

  const fetchPending = useCallback(async () => {
    if (!token) return
    setLoadingPending(true)
    try {
      const res = await fetch(`${apiUrl}/api/auth/cross-device/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const json = await res.json() as any
        setPendingRequests(json.data || [])
      }
    } catch (e: any) {
      console.error('Failed to fetch pending cross-device requests', e)
    } finally {
      setLoadingPending(false)
    }
  }, [token, apiUrl])

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 10000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const handleApprove = async () => {
    if (approvalCode.length !== 6) return
    setApproving(true)
    try {
      const res = await fetch(`${apiUrl}/api/auth/cross-device/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: approvalCode.toUpperCase() })
      })
      if (res.ok) {
        showToast('Device authorized successfully', 'success')
        setApprovalCode('')
        fetchPending()
      } else {
        const json = await res.json() as any
        showToast(json.error || 'Failed to authorize device', 'error')
      }
    } catch (e: any) {
      showToast('Error authorizing device', 'error')
    } finally {
      setApproving(false)
    }
  }

  return (
    <Card className="bg-[#121212] border-white/5 overflow-hidden" title="Authorize Device Sign-In" subtitle="Approve a sign-in request from another device by entering the 6-character code shown there.">
      <div className="space-y-5">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Input
              label="Author Code"
              value={approvalCode}
              onChange={(e) => setApprovalCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ENTER CODE"
              className="bg-white/5 border-white/5 font-mono font-black text-center tracking-[0.5em] text-lg"
              maxLength={6}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApprove}
            disabled={approvalCode.length !== 6}
            loading={approving}
            className="px-6"
          >
            <ArrowRight className="w-4 h-4 mr-2" /> Authorize
          </Button>
        </div>

        <div className="border-t border-white/5 pt-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Pending Requests</h4>
            <button
              onClick={fetchPending}
              className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingPending ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Smartphone className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold">No pending authorization requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => {
                const deviceInfo = (() => {
                  try { return JSON.parse(req.deviceInfo) } catch { return {} }
                })()
                return (
                  <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{deviceInfo.userAgent?.slice(0, 50) || 'Unknown device'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{req.code} · Expires {new Date(req.expiresAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <InlineToast
                      message="Authorize this device?"
                      type="confirm"
                      onConfirm={async () => {
                        try {
                          const res = await fetch(`${apiUrl}/api/auth/cross-device/approve`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ code: req.code })
                          })
                          if (res.ok) {
                            showToast('Device authorized', 'success')
                            fetchPending()
                          } else {
                            const json = await res.json() as any
                            showToast(json.error || 'Failed', 'error')
                          }
                        } catch (e: any) {
                          showToast('Error', 'error')
                        }
                      }}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
