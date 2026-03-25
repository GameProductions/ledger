import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { GlassFooter } from '../../components/ui/GlassFooter'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      if (!res.ok) {
        const error = await res.json()
        showToast(`Login Failed: ${error.error || 'Unknown error'}`, 'error')
        return
      }

      const authData = await res.json()
      if (authData.token) {
        const profileRes = await fetch(`${apiUrl}/api/user/profile`, {
          headers: { 'Authorization': `Bearer ${authData.token}` }
        })
        const profile = await profileRes.json()
        login(authData.token, { ...profile, userId: username, globalRole: profile.global_role })
      }
    } catch (e) {
      showToast('Network error during login. Please check your connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-viewport">
      <div className="w-full max-w-md reveal">
        <div className="card p-8 space-y-8 bg-[#0f172a]/80 backdrop-blur-2xl border-glass-border shadow-2xl">
          <div className="text-center space-y-4">
            <img src={theme.logoUrl} alt="LEDGER Logo" className="h-20 mx-auto" />
            <div>
              <h2 className="text-2xl font-black tracking-tighter">Welcome to LEDGER</h2>
              <p className="text-[10px] text-secondary uppercase tracking-[0.2em] font-bold opacity-60">
                v{import.meta.env.VITE_APP_VERSION} — Unified Financial Command
              </p>
            </div>
          </div>

          <form 
            className="space-y-6"
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleLogin(); 
            }}
          >
            <Input 
              label="Username / ID"
              type="text" 
              placeholder="e.g. skywalker_77" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input 
              label="Secure Password"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              className="w-full"
              loading={loading}
            >
              Initialize Session
            </Button>
          </form>
        </div>
      </div>
      <div className="w-full max-w-4xl">
        <GlassFooter />
      </div>
    </div>
  )
}

export default LoginPage
