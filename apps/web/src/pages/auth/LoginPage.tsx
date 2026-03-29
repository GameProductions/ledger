import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Fingerprint, RefreshCw } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Modal } from '../../components/ui/Modal'
import { PasswordChecklist } from '../../components/PasswordChecklist'

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Recovery State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isForcingChange, setIsForcingChange] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const token = params.get('token');
    const reset = params.get('reset_token');
    
    if (token) handleTokenLogin(token);
    if (reset) setResetToken(reset);
  }, []);

  const handleTokenLogin = async (token: string) => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
      const profileRes = await fetch(`${apiUrl}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profile = await profileRes.json();
      
      if (profile.force_password_change) {
        setIsForcingChange(true)
        // Store token temporarily or login later
      } else {
        login(token, { ...profile, userId: profile.id, globalRole: profile.global_role });
        window.location.hash = '#/';
      }
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
        
        if (profile.force_password_change) {
           setIsForcingChange(true)
           login(authData.token, { ...profile, userId: username, globalRole: profile.global_role })
        } else {
           login(authData.token, { ...profile, userId: username, globalRole: profile.global_role })
           
           // Forensic Credential Harvesting for Password Managers
           if ((window as any).PasswordCredential) {
             try {
               const cred = new (window as any).PasswordCredential({
                 id: username,
                 password: password,
                 name: profile.display_name
               });
               navigator.credentials.store(cred);
             } catch (e) {
               console.warn('[Credential Manager] Storage failed:', e);
             }
           }

           window.location.hash = '#/'
        }
      }
    } catch (e) {
      showToast('Network error during login.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePasskeyLogin = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
      const optRes = await fetch(`${apiUrl}/auth/passkeys/login-options`, { 
        method: 'POST',
        credentials: 'include'
      })
      const options = await optRes.json()
      
      // Real WebAuthn Authentication Prompt
      const assertion = await startAuthentication(options)
      
      const verifyRes = await fetch(`${apiUrl}/auth/passkeys/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assertion })
      })
      
      const authData = await verifyRes.json()
      if (authData.token) {
        handleTokenLogin(authData.token)
      } else {
        showToast(authData.error || 'Authentication failed', 'error')
      }
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        showToast('Authentication cancelled', 'info')
      } else {
        showToast(`Passkey login failed: ${e.message}`, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReset = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
      await fetch(`${apiUrl}/auth/password/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: recoveryEmail })
      })
      showToast('Recovery protocol initiated. Check console.', 'success')
      setIsForgotModalOpen(false)
    } catch (e) {
      showToast('Recovery failed', 'error')
    }
  }

  const handleResetPassword = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
      const res = await fetch(`${apiUrl}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword })
      })
      if (res.ok) {
        showToast('Password reset successfully', 'success')
        setResetToken(null)
        window.location.hash = '#/login'
      }
    } catch (e) {
      showToast('Reset failed', 'error')
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black">
      <div className="w-full max-w-md reveal">
        <div className="card p-10 space-y-10 bg-deep-slate-80/50 backdrop-blur-3xl border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500"></div>
          
          <div className="text-center space-y-6">
            <img src={theme.logoUrl} alt="LEDGER" className="h-20 mx-auto opacity-100 hover:scale-110 transition-transform duration-700 pointer-events-none" />
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-center uppercase italic underline decoration-primary/40 underline-offset-8">LEDGER</h2>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-secondary opacity-40">Live Evaluation of Daily Gains & Expense Records</p>
            </div>
          </div>

          <form 
            className="space-y-8"
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleLogin(); 
            }}
          >
            <div className="space-y-6">
              <Input 
                label="User ID"
                type="text" 
                placeholder="Username or email" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username webauthn"
                className="bg-white/5 border-white/5 focus:border-primary p-5 rounded-2xl font-bold"
              />
                  <Input 
                    label="Password"
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    showReveal
                    className="bg-white/5 border-white/5 focus:border-primary p-5 rounded-2xl font-bold font-mono"
                  />
                <div className="flex justify-end">
                   <button 
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                   >
                     Forgot Protocol?
                   </button>
                </div>
              </div>

            <div className="space-y-4 pt-2">
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className="w-full py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-primary/20"
                loading={loading}
              >
                Launch Session
              </Button>
              
              <button 
                type="button"
                onClick={handlePasskeyLogin}
                className="w-full flex items-center justify-center gap-4 py-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/40 transition-all font-black uppercase tracking-widest text-xs"
              >
                <Fingerprint size={18} className="text-primary" />
                Sign in with Biometrics
              </button>
            </div>
          </form>

          <div className="flex items-center gap-6 text-xs uppercase font-black tracking-widest text-secondary opacity-20">
            <div className="flex-1 border-t border-white/10"></div>
            <span>Cross-Platform Sync</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => {
                const baseApi = import.meta.env.VITE_API_URL.replace(/\/$/, '');
                window.location.href = `${baseApi}/auth/login/google`;
              }}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all font-bold text-sm"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="G" className="w-4 h-4" />
              Google
            </button>
            <button 
              onClick={() => {
                const baseApi = import.meta.env.VITE_API_URL.replace(/\/$/, '');
                window.location.href = `${baseApi}/auth/login/discord`;
              }}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all font-bold text-sm"
            >
              <img 
                src="https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/discord.svg" 
                alt="D" 
                className="w-4 h-4 opacity-80 invert brightness-0" 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              Discord
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Forensic Recovery"
        footer={
           <>
             <Button variant="secondary" onClick={() => setIsForgotModalOpen(false)}>Abort</Button>
             <Button variant="primary" onClick={handleRequestReset}>Initiate Protocol</Button>
           </>
        }
      >
        <div className="space-y-6">
           <p className="text-secondary font-medium tracking-tight">Enter your registered identity to receive a forensic recovery token.</p>
           <Input 
            label="Recovery Identifier"
            placeholder="Username or email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            autoComplete="email"
            className="bg-white/5 border-white/5"
           />
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetToken}
        onClose={() => setResetToken(null)}
        title="Credential Reconstruction"
        footer={
           <Button variant="primary" className="w-full" onClick={handleResetPassword} disabled={newPassword.length < 8}>Reset Credential</Button>
        }
      >
        <div className="space-y-6">
           <div className="relative">
             <Input 
              label="New Secure Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              showReveal
              className="bg-white/5 border-white/5"
             />
           </div>
           {newPassword && <PasswordChecklist password={newPassword} />}
        </div>
      </Modal>

      {/* Force Password Change Modal */}
      <Modal
        isOpen={isForcingChange}
        onClose={() => {}} // Mandatory change
        title="Security Enforcement"
        footer={
           <Button variant="primary" className="w-full" onClick={async () => {
             // Logic to update and login
             await handleResetPassword();
             setIsForcingChange(false);
           }} disabled={newPassword.length < 8}>Commit & Session Init</Button>
        }
      >
        <div className="space-y-6">
           <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
              <RefreshCw className="text-blue-500 mt-1 animate-spin-slow" size={20} />
              <p className="text-sm text-blue-500 font-bold leading-relaxed uppercase tracking-tighter">An administrator has requested a mandatory security refresh for your account. Please establish a new password to proceed.</p>
           </div>
           <div className="relative">
             <Input 
              label="Establish Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              showReveal
              className="bg-white/5 border-white/5"
             />
           </div>
           {newPassword && <PasswordChecklist password={newPassword} />}
        </div>
      </Modal>

    </div>
  )
}

export default LoginPage
