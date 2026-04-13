import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Shield, Home, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'

const JoinHouseholdPage: React.FC = () => {
  const { token: userToken } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  
  const query = new URLSearchParams(window.location.hash.split('?')[1])
  const inviteToken = query.get('token')

  const handleJoin = async () => {
    if (!userToken) {
      showToast('Please log in first to join this household', 'warning')
      window.location.hash = '#/login'
      return
    }

    setLoading(true)
    setStatus('loading')
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const res = await fetch(`${apiUrl}/api/user/households/join`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: inviteToken })
      })

      let data: any = {}
      try {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          data = await res.json()
        } else {
          data = { error: await res.text() }
        }
      } catch (e) {
        data = { error: 'Failed to parse server response' }
      }

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Failed to join household')
        showToast(data.error || 'Join failed', 'error')
        return
      }

      setStatus('success')
      showToast('Welcome to the household!', 'success')
      
      // Store the new household ID and redirect
      if (data.householdId) {
        localStorage.setItem('ledger_householdId', data.householdId)
      }
      
      setTimeout(() => {
        window.location.hash = '#/'
        window.location.reload() // Reload to refresh context
      }, 2000)

    } catch (err) {
      setStatus('error')
      setErrorMsg('Network error. Check your connection.')
      showToast('Network error during join.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!inviteToken) {
    return (
      <div className="flex-center min-h-[80vh] flex-col gap-4 text-secondary font-black uppercase tracking-[0.4em] italic">
        <XCircle size={48} className="text-red-500/50 mb-2" />
        Invalid Invitation Token
      </div>
    )
  }

  return (
    <div className="flex-center min-h-screen p-4 bg-black">
      <div className="w-full max-w-lg p-12 rounded-[3.5rem] bg-white/5 border border-white/5 backdrop-blur-3xl reveal space-y-12 text-center relative overflow-hidden group">
        <div className="absolute -inset-24 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
        
        <div className="relative space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-2xl shadow-primary/20 animate-bounce-slow">
            <Home size={32} />
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
               <Shield size={12} className="text-secondary" />
               <p className="text-xs font-black uppercase tracking-[0.4em] text-secondary">Secured Invitation</p>
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-tight underline decoration-primary/30 underline-offset-8">Join Household</h2>
          </div>

          <p className="text-secondary font-medium leading-relaxed">
            You've been invited to join a collaborative financial sector. Joining will allow you to track transactions and budgets together.
          </p>
        </div>

        {status === 'success' ? (
          <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4 animate-in fade-in zoom-in duration-500">
             <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
             <p className="font-bold text-white uppercase tracking-widest text-sm">Authorization Granted</p>
             <p className="text-sm text-secondary italic">Redirecting to Dashboard...</p>
          </div>
        ) : (
          <div className="space-y-4 relative">
             <Button 
               onClick={handleJoin} 
               variant="primary" 
               size="lg" 
               className="w-full py-8 text-sm font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl shadow-primary/20 hover:scale-[1.02]"
               loading={loading}
             >
               Accept Invitation <ArrowRight size={18} className="ml-2" />
             </Button>
             {status === 'error' && (
               <p className="text-red-400 text-xs font-bold uppercase tracking-widest">{errorMsg}</p>
             )}
          </div>
        )}

        <div className="text-xs text-slate-600 font-bold uppercase tracking-widest">
           v3.14.1 Security Protocol Active
        </div>
      </div>
    </div>
  )
}

export default JoinHouseholdPage
