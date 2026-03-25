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

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const token = params.get('token');
    if (token) {
      handleTokenLogin(token);
    }
  }, []);

  const handleTokenLogin = async (token: string) => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
      const profileRes = await fetch(`${apiUrl}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profile = await profileRes.json();
      login(token, { ...profile, userId: profile.id, globalRole: profile.global_role });
      window.location.hash = '#/';
    } catch (e) {
      showToast('OAuth login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

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

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-secondary"><span className="bg-[#0f172a] px-4">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/ledger/auth/login/google`}
              className="flex items-center justify-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-bold"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-4 h-4" />
              Google
            </button>
            <button 
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/ledger/auth/login/discord`}
              className="flex items-center justify-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-bold"
            >
              <img src="https://assets-assets.adobe.com/link/f3a9a13b-8d0b-4e0c-99f3-80f08e75a8a8/discord-mark-blue.png" className="w-4 h-4" />
              Discord
            </button>
          </div>
        </div>
      </div>
      <div className="w-full max-w-4xl">
        <GlassFooter />
      </div>
    </div>
  )
}

export default LoginPage
