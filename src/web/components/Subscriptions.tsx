import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'
import { Link, Bell, ShieldCheck, Share2 } from 'lucide-react'

import { Price } from './Price'
import { SearchableSelect } from './ui/SearchableSelect'
import { ReminderManager } from './ReminderManager'
import { LiabilitySplitter } from './LiabilitySplitter'

const Subscriptions: React.FC = () => {
  const { token, householdId } = useAuth()
  const { showToast } = useToast()
  const { data: subs = [], loading, mutate } = useApi('/api/planning/subscriptions')
  const { data: linkedAccounts = [] } = useApi('/api/user/linked-accounts')
  const [showAdd, setShowAdd] = useState(false)
  const [reminderTarget, setReminderTarget] = useState<{id: string, name: string} | null>(null)

  const handleTogglePublic = async (targetId: string, isPublic: boolean) => {
    if (!token) return;
    const res = await fetch(`${getApiUrl()}/api/planning/splits/subscription/${targetId}/public`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_public: isPublic })
    });

    if (res.ok) {
        showToast(isPublic ? 'Master Ledger is now public' : 'Master Ledger is now private');
        mutate();
    }
  };
  
  // UI State for Splits
  const [openSplitterId, setOpenSplitterId] = useState<string | null>(null)
  const [openTrackerId, setOpenTrackerId] = useState<string | null>(null)

  if (loading) return <div>Loading subscriptions...</div>

  return (
    <section className="card">
      {reminderTarget && (
        <ReminderManager 
          targetId={reminderTarget.id} 
          targetType="subscription" 
          targetName={reminderTarget.name} 
          onClose={() => setReminderTarget(null)} 
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="text-lg font-black tracking-tighter uppercase italic underline decoration-primary/40 underline-offset-4">Subscriptions</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 transition-all">
          {showAdd ? 'Cancel' : '+ New Strategy'}
        </button>
      </div>

      {showAdd && (
        <form style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.8rem' }} className="p-4 rounded-xl bg-white/2 border border-white/5" onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          const apiUrl = getApiUrl().replace(/\/$/, '')
          fetch(`${apiUrl}/api/planning/subscriptions`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-household-id': householdId || ''
            },
            body: JSON.stringify({
              name: formData.get('name'),
              amount_cents: Math.round(parseFloat(formData.get('amount') as string) * 100),
              billing_cycle: formData.get('cycle'),
              next_billing_date: formData.get('date'),
              trial_end_date: formData.get('trial_date') || null,
              is_trial: !!formData.get('trial_date'),
              provider_account_id: formData.get('linked_account') || null,
              upcoming_amount_cents: formData.get('upcoming_amount') ? Math.round(parseFloat(formData.get('upcoming_amount') as string) * 100) : null,
              upcoming_effective_date: formData.get('upcoming_date') || null
            })
          }).then(() => {
            showToast('Subscription added!', 'success')
            setShowAdd(false)
            mutate()
          })
        }}>
          <div className="grid grid-cols-2 gap-3">
             <input name="name" placeholder="Service Name (Netflix, etc)" required className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm" />
             <div className="relative">
               <SearchableSelect 
                  options={linkedAccounts?.map((acc: any) => ({
                    value: acc.id,
                    label: acc.providerName,
                    metadata: { email: acc.emailAttached }
                  })) || []}
                  value="" 
                  onChange={(val) => {
                    const hiddenInput = document.getElementById('hidden-linked-account') as HTMLInputElement;
                    if (hiddenInput) hiddenInput.value = val;
                  }}
                  placeholder="Link Account..."
               />
               <input type="hidden" name="linked_account" id="hidden-linked-account" />
             </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            <select name="cycle" required style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white' }}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Next Billing</label>
              <input name="date" type="date" required style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Trial Ends (Optional)</label>
              <input name="trial_date" type="date" style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-primary">Planned Rate Change (Optional)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Upcoming Amount</label>
                <input name="upcoming_amount" type="number" step="0.01" placeholder="0.00" className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Effective Date</label>
                <input name="upcoming_date" type="date" className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          <button type="submit" className="primary py-3 font-black uppercase text-xs tracking-widest mt-2">Activate Subscription Tracking</button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {subs?.map((sub: any) => (
          <div key={sub.id} className="relative bg-white/[0.03] rounded-xl border border-white/5 p-4 space-y-4 overflow-hidden">
            {sub.upcoming_effective_date && (
               <div className="absolute top-0 right-0 bg-primary/20 border-b border-l border-primary/20 px-3 py-1 rounded-bl-xl">
                 <div className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                   Rate Change: <Price amountCents={sub.upcoming_amountCents} /> on {sub.upcoming_effective_date}
                 </div>
               </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '800', display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="text-sm tracking-tight">
                  {sub.name}
                  {sub.is_trial ? (
                    <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'var(--secondary)', color: 'black', borderRadius: '0.25rem', fontWeight: '900' }}>TRIAL</span>
                  ) : null}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} className="mt-0.5 font-medium opacity-60">
                  {sub.is_trial ? `Trial Ends: ${sub.trial_end_date}` : `Due: ${sub.next_billing_date}`}
                </div>
                <div className="flex gap-2 mt-2">
                  {sub.provider_account_id && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-amber-500 w-fit">
                      <Link size={10} /> Account Linked
                    </div>
                  )}
                  <button onClick={() => setReminderTarget({ id: sub.id, name: sub.name })} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-primary transition-colors">
                    <Bell size={10} /> Alerts
                  </button>
                  {!sub.is_split_originator && !sub.is_split_portion && (
                      <button onClick={() => setOpenSplitterId(openSplitterId === sub.id ? null : sub.id)} className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-colors">
                        <Share2 size={10} /> Split
                      </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <Price amountCents={sub.amountCents} className="font-black tracking-tighter text-lg" />
                <div className="text-[12px] text-secondary uppercase font-black tracking-widest opacity-40 italic">{sub.billing_cycle}</div>
              </div>
            </div>

            {sub.is_split_portion && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/80 bg-white/5 border border-white/10 rounded-lg p-2 w-fit">
                    <Share2 size={12} /> Assigned Split Portion
                </div>
            )}

            {/* Premium Internal Tracking for Originators */}
            {sub.is_split_originator && sub.splits && (
                <div>
                    <button 
                        onClick={() => setOpenTrackerId(openTrackerId === sub.id ? null : sub.id)}
                        className="w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col hover:bg-primary/20 transition-all text-left group/tracker shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-primary group-hover/tracker:scale-110 transition-transform" />
                                <span className="text-[10px] uppercase font-black tracking-widest text-primary">Master Split Ledger</span>
                            </div>
                            <span className="text-[10px] uppercase font-black text-white/40">{openTrackerId === sub.id ? 'Close' : 'View Stats'}</span>
                        </div>
                        {openTrackerId === sub.id && (
                            <div className="mt-3 pt-3 border-t border-primary/20 space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/5 mb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Broadcasting Status</span>
                                    <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                                        <input 
                                            type="checkbox" 
                                            checked={sub.splits?.[0]?.is_master_ledger_public || false} 
                                            onChange={(e) => handleTogglePublic(sub.id, e.target.checked)}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-white/10 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                {sub.splits.map((split: any) => (
                                    <div key={split.id} className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 text-[9px] flex items-center justify-center font-bold">{split.assigned_user_id.substring(0, 2)}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Portion</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                split.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                                            }`}>
                                                {split.status}
                                            </span>
                                            <Price amountCents={split.calculated_amountCents} className="text-[11px] font-black tracking-widest" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </button>
                </div>
            )}

            {openSplitterId === sub.id && (
                <div className="mt-2 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                    <LiabilitySplitter 
                        targetId={sub.id} 
                        targetType="subscription" 
                        totalAmountCents={sub.amountCents} 
                        onComplete={() => {
                            setOpenSplitterId(null);
                            mutate();
                        }} 
                    />
                </div>
            )}
          </div>
        ))}
        {subs?.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No subscriptions tracked yet.</p>}
      </div>
    </section>
  )
}

export default Subscriptions
