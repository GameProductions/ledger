import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, Mail, Shield, ExternalLink } from 'lucide-react'

interface LoginDialogProps {
  appName: string
  providers: Array<'discord' | 'google'>
  onSuccess?: () => void
}

export function LoginDialog({ appName, providers, onSuccess }: LoginDialogProps) {
  const [tab, setTab] = useState<'sso' | 'password'>('sso')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState('')

  function startOAuth(provider: string) {
    window.location.href = `/api/auth/oauth/${provider}`
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoggingIn(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data: any = await res.json()
      if (data.success) {
        if (onSuccess) onSuccess()
        window.location.href = '/directory'
      } else {
        setError(data.error || 'Login failed.')
      }
    } catch {
      setError('Connection error.')
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Sign in to {appName}</h1>
          <p className="text-sm text-slate-400 mt-1">Choose how you would like to sign in.</p>
        </div>

        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setTab('sso')}
            className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${tab === 'sso' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            SSO
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${tab === 'password' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Password
          </button>
        </div>

        {tab === 'sso' ? (
          <div className="space-y-3">
            {providers.includes('discord') && (
              <button
                onClick={() => startOAuth('discord')}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-sm font-bold transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Sign in with Discord
              </button>
            )}
            {providers.includes('google') && (
              <button
                onClick={() => startOAuth('google')}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-bold transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign in with Google
              </button>
            )}
            {providers.length === 0 && (
              <p className="text-sm text-slate-500 text-center italic">No SSO providers configured.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-xs text-red-400 font-medium">{error}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Email or username</label>
              <input
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              {loggingIn ? <LogIn className="w-4 h-4 animate-pulse" /> : <LogIn className="w-4 h-4" />}
              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {tab === 'password' && (
          <p className="text-xs text-slate-500 text-center mt-4">
            Don't have an account yet? Contact an administrator for an invitation.
          </p>
        )}
      </motion.div>
    </div>
  )
}
