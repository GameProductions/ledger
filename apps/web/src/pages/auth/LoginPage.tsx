import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
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
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md reveal">
        <div className="card p-8 space-y-8 bg-deep-slate-80 backdrop-blur-2xl border-glass-border shadow-2xl w-full">
          <div className="text-center space-y-4">
            <img src={theme.logoUrl} alt="LEDGER Logo" className="h-16 mx-auto opacity-90 hover-scale-105 transition-transform" />
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-center">Welcome to LEDGER</h2>
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
              Sign in
            </Button>
          </form>

          <div className="flex items-center gap-4 text-tiny uppercase font-black tracking-widest text-secondary opacity-50">
            <div className="flex-1 border-t border-glass-border"></div>
            <span>Or continue with</span>
            <div className="flex-1 border-t border-glass-border"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => {
                const baseApi = import.meta.env.VITE_API_URL.replace(/\/ledger\/?$/, '').replace(/\/$/, '');
                window.location.href = `${baseApi}/ledger/auth/login/google`;
              }}
              className="sso-button"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" />
              Google
            </button>
            <button 
              onClick={() => {
                const baseApi = import.meta.env.VITE_API_URL.replace(/\/ledger\/?$/, '').replace(/\/$/, '');
                window.location.href = `${baseApi}/ledger/auth/login/discord`;
              }}
              className="sso-button"
            >
              <img 
                src="https://cdn.simpleicons.org/discord/white" 
                alt="Discord" 
                onError={(e) => (e.currentTarget.src = "https://assets.gpnet.dev/icons/discord-white.svg")} 
              />
              Discord
            </button>
          </div>
          
          </div>
        </div>
      </div>
  )
}

export default LoginPage
