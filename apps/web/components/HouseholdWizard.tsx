import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from './ui/Button'
import { getApiUrl } from '../utils/api'
import { Shield, Home, Users, ArrowRight, LogIn, Loader2 } from 'lucide-react'

type Step = 'choose' | 'join' | 'create'

const HouseholdWizard: React.FC = () => {
  const { token: userToken, refreshProfile, setHouseholdId } = useAuth()
  const { showToast } = useToast()
  const [step, setStep] = useState<Step>('choose')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [code, setCode] = useState('')
  const [householdName, setHouseholdName] = useState('')

  const finish = async (householdId: string) => {
    await refreshProfile()
    setHouseholdId(householdId)
  }

  const handleJoinByCode = async () => {
    if (!code.trim()) {
      setErrorMsg('Enter your household invite code.')
      return
    }
    if (!userToken) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = (await fetch(`${getApiUrl()}/api/user/households/join-by-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code.trim() })
      }) as any)

      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(data.error || 'That invite code could not be used.')
        return
      }
      showToast('Welcome to your household!', 'success')
      finish(data.householdId)
    } catch (err: any) {
      setErrorMsg('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!householdName.trim()) {
      setErrorMsg('Give your household a name.')
      return
    }
    if (!userToken) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = (await fetch(`${getApiUrl()}/api/user/households`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: householdName.trim(), currency: 'USD' })
      }) as any)

      const data: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not create your household.')
        return
      }
      showToast('Household created!', 'success')
      finish(data.id)
    } catch (err: any) {
      setErrorMsg('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const back = () => {
    setStep('choose')
    setErrorMsg('')
  }

  return (
    <div className="flex-center min-h-screen p-4 bg-black">
      <div className="w-full max-w-lg p-12 rounded-[3.5rem] bg-white/5 border border-white/5 backdrop-blur-3xl reveal space-y-10 text-center relative overflow-hidden group">
        <div className="absolute -inset-24 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>

        <div className="relative space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-2xl shadow-primary/20">
            <Home size={32} />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield size={12} className="text-secondary" />
              <p className="text-xs font-black tracking-[0.4em] text-secondary">Get Started</p>
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter leading-tight underline decoration-primary/30 underline-offset-8">Welcome to Ledger</h2>
          </div>

          <p className="text-secondary font-medium leading-relaxed">
            You're not part of a household yet. Join an existing household with an invite code, or start your own financial space.
          </p>
        </div>

        {step === 'choose' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            <button
              onClick={() => setStep('join')}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
            >
              <Users size={24} className="text-primary" />
              <p className="font-bold text-white tracking-wide">Join a Household</p>
              <p className="text-sm text-secondary">Use an invite code from a household owner.</p>
            </button>
            <button
              onClick={() => setStep('create')}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
            >
              <Home size={24} className="text-primary" />
              <p className="font-bold text-white tracking-wide">Start Your Own</p>
              <p className="text-sm text-secondary">Create a new household you administer.</p>
            </button>
          </div>
        )}

        {step === 'join' && (
          <div className="space-y-4 relative">
            <label className="block text-left text-xs font-bold tracking-widest text-secondary">
              INVITE CODE
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByCode() }}
                placeholder="ABC123"
                maxLength={12}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-lg tracking-[0.3em] text-white placeholder:text-slate-600 focus:border-primary/50 focus:outline-none"
              />
            </label>
            {errorMsg && <p className="text-red-400 text-xs font-bold tracking-widest">{errorMsg}</p>}
            <div className="flex gap-3">
              <Button variant="glass" onClick={back} className="flex-1">Back</Button>
              <Button onClick={handleJoinByCode} loading={loading} className="flex-1">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} className="mr-2" /> Join</>}
              </Button>
            </div>
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-4 relative">
            <label className="block text-left text-xs font-bold tracking-widest text-secondary">
              HOUSEHOLD NAME
              <input
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                placeholder="Our Household"
                maxLength={100}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary/50 focus:outline-none"
              />
            </label>
            {errorMsg && <p className="text-red-400 text-xs font-bold tracking-widest">{errorMsg}</p>}
            <div className="flex gap-3">
              <Button variant="glass" onClick={back} className="flex-1">Back</Button>
              <Button onClick={handleCreate} loading={loading} className="flex-1">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><ArrowRight size={16} className="mr-2" /> Create</>}
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-600 font-bold tracking-widest">
          Your data stays yours — secure by design.
        </div>
      </div>
    </div>
  )
}

export default HouseholdWizard
