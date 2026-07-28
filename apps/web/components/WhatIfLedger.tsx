import React, { useState, useMemo } from 'react'
import { Price } from './Price'
import { useApi } from '../hooks/useApi'
import { Checkbox } from './ui/Checkbox'

const WhatIfLedger: React.FC = () => {
  const { data: subs } = (useApi('/api/planning/subscriptions') as any)
  const [disabledSubs, setDisabledSubs] = useState<string[]>([])
  
  const originalTotal = useMemo(() => {
    return subs?.reduce((acc: number, sub: any) => acc + sub.amountCents, 0) || 0
  }, [subs])

  const projectedTotal = useMemo(() => {
    return subs?.reduce((acc: number, sub: any) => {
      if (disabledSubs.includes(sub.id)) return acc
      return acc + sub.amountCents
    }, 0) || 0
  }, [subs, disabledSubs])

  const savings = originalTotal - projectedTotal

  return (
    <section className="card">
      <h3 className="text-lg font-black tracking-tighter italic mb-1">Savings Simulator</h3>
      <p className="text-xs text-secondary font-medium mb-6">
        Uncheck subscriptions to see how much you would save monthly if cancelled.
      </p>
      
      <div className="space-y-2">
        {Array.isArray(subs) && (subs as any[]).map((sub: any) => (
          <label
            key={sub.id}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
              disabledSubs.includes(sub.id) ? 'bg-red-500/10 line-through' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={!disabledSubs.includes(sub.id)}
                onChange={() => {
                  if (disabledSubs.includes(sub.id)) {
                    setDisabledSubs(disabledSubs.filter(id => id !== sub.id))
                  } else {
                    setDisabledSubs([...disabledSubs, sub.id])
                  }
                }}
              />
              <span className="text-sm font-bold text-white">{sub.name}</span>
            </div>
            <Price amountCents={sub.amountCents} className="font-black" />
          </label>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60 font-medium">Monthly Savings</span>
          <span className="text-emerald-400 font-black">
            <Price amountCents={savings} />
          </span>
        </div>
        <div className="flex justify-between text-base font-black">
          <span className="text-white">Estimated Balance</span>
          <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            <Price amountCents={124550 + savings} />
          </span>
        </div>
      </div>
    </section>
  )
}

export default WhatIfLedger
