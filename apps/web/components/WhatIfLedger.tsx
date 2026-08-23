import React, { useState, useMemo } from 'react'
import { Price } from './Price'
import { useApi } from '../hooks/useApi'
import { Checkbox } from './ui/Checkbox'
import { CurrencyInput } from './ui/CurrencyInput'
import { GitFork, Sparkles, TrendingUp, ShieldCheck, Plus, Trash2, RotateCcw } from 'lucide-react'

interface HypotheticalExpense {
  id: string
  name: string
  amountCents: number
  type: 'expense' | 'income'
}

const WhatIfLedger: React.FC = () => {
  const { data: subs = [] } = (useApi('/api/planning/subscriptions') as any) || { data: [] }
  const { data: accounts = [] } = (useApi('/api/financials/accounts') as any) || { data: [] }

  const totalCurrentLiquidity = useMemo(() => {
    if (!Array.isArray(accounts)) return 0
    return accounts
      .filter((a: any) => a.type === 'checking' || a.type === 'savings')
      .reduce((sum: number, a: any) => sum + (a.balanceCents || 0), 0)
  }, [accounts])

  const [disabledSubs, setDisabledSubs] = useState<string[]>([])
  const [hypotheticals, setHypotheticals] = useState<HypotheticalExpense[]>([])
  const [newHypoName, setNewHypoName] = useState('')
  const [newHypoAmount, setNewHypoAmount] = useState(0)
  const [newHypoType, setNewHypoType] = useState<'expense' | 'income'>('expense')
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'hypothetical'>('subscriptions')

  const originalSubTotal = useMemo(() => {
    if (!Array.isArray(subs)) return 0
    return subs.reduce((acc: number, sub: any) => acc + (sub.amountCents || 0), 0)
  }, [subs])

  const activeSubTotal = useMemo(() => {
    if (!Array.isArray(subs)) return 0
    return subs.reduce((acc: number, sub: any) => {
      if (disabledSubs.includes(sub.id)) return acc
      return acc + (sub.amountCents || 0)
    }, 0)
  }, [subs, disabledSubs])

  const subMonthlySavings = originalSubTotal - activeSubTotal

  const hypotheticalNetMonthly = useMemo(() => {
    return hypotheticals.reduce((acc, h) => {
      return h.type === 'income' ? acc + h.amountCents : acc - h.amountCents
    }, 0)
  }, [hypotheticals])

  const netMonthlyImpact = subMonthlySavings + hypotheticalNetMonthly
  const projectedAnnualImpact = netMonthlyImpact * 12
  const projectedLiquidity = totalCurrentLiquidity + netMonthlyImpact

  const handleAddHypothetical = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHypoName.trim() || newHypoAmount <= 0) return
    setHypotheticals(prev => [
      ...prev,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `hypo-${Date.now()}`,
        name: newHypoName.trim(),
        amountCents: newHypoAmount,
        type: newHypoType
      }
    ])
    setNewHypoName('')
    setNewHypoAmount(0)
  }

  const handleRemoveHypothetical = (id: string) => {
    setHypotheticals(prev => prev.filter(h => h.id !== id))
  }

  const handleResetScenario = () => {
    setDisabledSubs([])
    setHypotheticals([])
  }

  const hasModifications = disabledSubs.length > 0 || hypotheticals.length > 0

  return (
    <section className="card space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-xl font-black tracking-tight italic flex items-center gap-2">
            <GitFork size={20} className="text-primary" /> What-If Scenario Simulator
          </h3>
          <p className="text-xs text-secondary font-medium mt-0.5">
            Fork your financial roadmap to preview runway and Safe-to-Spend trajectory.
          </p>
        </div>
        {hasModifications && (
          <button
            onClick={handleResetScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw size={12} /> Reset Fork
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-black/40 rounded-xl p-1 w-full max-w-sm border border-white/10">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'subscriptions' ? 'bg-primary text-black' : 'text-white/50 hover:text-white'
          }`}
        >
          Subscription Trimming ({disabledSubs.length})
        </button>
        <button
          onClick={() => setActiveTab('hypothetical')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'hypothetical' ? 'bg-primary text-black' : 'text-white/50 hover:text-white'
          }`}
        >
          Hypothetical Changes ({hypotheticals.length})
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'subscriptions' ? (
        <div className="space-y-2">
          {Array.isArray(subs) && subs.length > 0 ? (
            subs.map((sub: any) => {
              const isCut = disabledSubs.includes(sub.id)
              return (
                <label
                  key={sub.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isCut
                      ? 'bg-red-500/10 border-red-500/30 line-through opacity-70'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={!isCut}
                      onChange={() => {
                        if (isCut) {
                          setDisabledSubs(prev => prev.filter(id => id !== sub.id))
                        } else {
                          setDisabledSubs(prev => [...prev, sub.id])
                        }
                      }}
                    />
                    <div>
                      <span className="text-sm font-bold text-white block">{sub.name}</span>
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{sub.billingCycle}</span>
                    </div>
                  </div>
                  <Price amountCents={sub.amountCents} className="font-black text-sm" />
                </label>
              )
            })
          ) : (
            <div className="py-6 text-center text-xs text-white/40 italic">No recurring subscriptions found</div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleAddHypothetical} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Plus size={13} className="text-primary" /> Add Simulated Income or Expense
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={newHypoName}
                onChange={e => setNewHypoName(e.target.value)}
                placeholder="e.g. Freelance Gig / Gym Membership"
                className="bg-black/50 border border-white/10 p-2.5 rounded-xl text-xs font-bold text-white outline-none focus:border-primary"
              />
              <CurrencyInput
                valueCents={newHypoAmount}
                onChangeCents={setNewHypoAmount}
                placeholder="0.00 / month"
                className="bg-black/50 border-white/10"
              />
              <div className="flex gap-2">
                <select
                  value={newHypoType}
                  onChange={e => setNewHypoType(e.target.value as any)}
                  className="bg-black/50 border border-white/10 p-2.5 rounded-xl text-xs font-bold text-white outline-none focus:border-primary flex-1"
                >
                  <option value="expense">Expense (-)</option>
                  <option value="income">Income (+)</option>
                </select>
                <button
                  type="submit"
                  disabled={!newHypoName.trim() || newHypoAmount <= 0}
                  className="px-4 bg-primary text-black font-black text-xs rounded-xl hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-2">
            {hypotheticals.map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                      h.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {h.type}
                  </span>
                  <span className="text-sm font-bold text-white">{h.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Price
                    amountCents={h.amountCents}
                    className={`font-black text-sm ${h.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}
                  />
                  <button
                    onClick={() => handleRemoveHypothetical(h.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenario Projected Delta Impact */}
      <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-blue-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Sparkles size={14} /> Forked Scenario Delta
          </span>
          <span
            className={`text-sm font-black ${
              netMonthlyImpact > 0 ? 'text-emerald-400' : netMonthlyImpact < 0 ? 'text-red-400' : 'text-white/60'
            }`}
          >
            {netMonthlyImpact > 0 ? '+' : ''}
            <Price amountCents={netMonthlyImpact} /> / month
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 border-t border-white/10">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Annual Net Shift</div>
            <div className={`text-base font-black ${projectedAnnualImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {projectedAnnualImpact >= 0 ? '+' : ''}
              <Price amountCents={projectedAnnualImpact} />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Simulated Liquidity</div>
            <div className="text-base font-black text-white">
              <Price amountCents={projectedLiquidity} />
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Safe Runway Impact</div>
            <div className="text-base font-black text-cyan-400 flex items-center gap-1">
              <TrendingUp size={14} />
              {netMonthlyImpact >= 0 ? `+${(netMonthlyImpact / 100000).toFixed(1)} mo` : `${(netMonthlyImpact / 100000).toFixed(1)} mo`}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhatIfLedger
