import React, { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { Bell, Trash2, X } from 'lucide-react'

interface ReminderManagerProps {
  targetId: string
  targetType: string
  targetName: string
  onClose: () => void
}

export const ReminderManager: React.FC<ReminderManagerProps> = ({ targetId, targetType, targetName, onClose }) => {
  const { token, householdId } = useAuth()
  const { showToast } = useToast()
  const { data: reminders, loading, mutate } = useApi(`/api/planning/reminders/${targetType}/${targetId}`)
  const [showAdd, setShowAdd] = useState(false)

  const [deliveryType, setDeliveryType] = useState('discord_dm')
  const [deliveryTarget, setDeliveryTarget] = useState('')
  const [frequencyDays, setFrequencyDays] = useState(3)
  const [note, setNote] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')

    const res = await fetch(`${apiUrl}/api/planning/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({
        target_id: targetId,
        target_type: targetType,
        delivery_type: deliveryType,
        delivery_target: deliveryTarget,
        frequency_days: Number(frequencyDays),
        note: note
      })
    })

    if (res.ok) {
      showToast('Reminder added successfully!', 'success')
      setShowAdd(false)
      setDeliveryTarget('')
      setNote('')
      mutate()
    } else {
      showToast('Failed to add reminder', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')

    const res = await fetch(`${apiUrl}/api/planning/reminders/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    })

    if (res.ok) {
      showToast('Reminder deleted', 'success')
      mutate()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Bell size={14} className="text-primary" /> Reminders
            </h3>
            <p className="text-[10px] text-white/50 tracking-widest uppercase">{targetName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto scrollable-list">
          {loading ? (
            <p className="text-xs text-white/50 text-center py-4">Loading reminders...</p>
          ) : (
            <div className="space-y-3">
              {reminders && reminders.length > 0 ? reminders.map((r: any) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold font-mono text-primary flex items-center gap-1.5">
                      {r.delivery_type === 'discord_dm' ? 'Discord DM' : 'Discord Webhook'}
                      <span className="text-[9px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded-sm tracking-widest uppercase">
                        {r.frequency_days} Days Prior
                      </span>
                    </div>
                    {r.note && <div className="text-[11px] text-white/60 mt-1">{r.note}</div>}
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )) : (
                <p className="text-xs text-white/30 text-center py-8 italic font-serif">No custom reminders configured.</p>
              )}
            </div>
          )}

          {!showAdd ? (
            <button 
              onClick={() => setShowAdd(true)} 
              className="w-full mt-4 py-3 border border-dashed border-white/20 rounded-xl text-xs font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 hover:border-white/40 transition-all"
            >
              + Create Reminder
            </button>
          ) : (
            <form onSubmit={handleAdd} className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">Delivery Method</label>
                <select 
                  value={deliveryType} 
                  onChange={(e) => setDeliveryType(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-primary/50"
                  required
                >
                  <option value="discord_dm">Discord Direct Message</option>
                  <option value="discord_webhook">Discord Webhook</option>
                </select>
              </div>

              {deliveryType === 'discord_webhook' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">Webhook URL</label>
                  <input 
                    type="url" 
                    value={deliveryTarget}
                    onChange={(e) => setDeliveryTarget(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-primary/50"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">Alert Timing</label>
                <select 
                  value={frequencyDays} 
                  onChange={(e) => setFrequencyDays(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-primary/50"
                  required
                >
                  <option value={0}>On the Due Date (0 Days)</option>
                  <option value={1}>1 Day Before</option>
                  <option value={3}>3 Days Before</option>
                  <option value={7}>1 Week Before (7 Days)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">Custom Note (Optional)</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Ensure $50 is in Checking"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 text-xs font-black uppercase tracking-widest border border-white/10 rounded-lg hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex-1 py-2 text-xs font-black uppercase tracking-widest bg-primary text-black rounded-lg hover:bg-primary/90">Save</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
