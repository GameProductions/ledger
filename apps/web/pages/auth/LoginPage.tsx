import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Fingerprint, RefreshCw, Check, Smartphone, Copy, ExternalLink, Mic } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Modal } from '../../components/ui/Modal'
import { PasswordChecklist } from '../../components/PasswordChecklist'
import { getApiUrl } from '../../utils/api'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [persistent, setPersistent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const { transcript, isListening, isSupported, start, stop } = useSpeechRecognition()

  useEffect(() => {
    if (transcript) {
      setUsername(transcript)
    }
  }, [transcript])
  
  // Cross-Device Auth State
  const [showCrossDevice, setShowCrossDevice] = useState(false)
  const [crossDeviceCode, setCrossDeviceCode] = useState('')
  const [crossDevicePollToken, setCrossDevicePollToken] = useState('')
  const [crossDeviceId, setCrossDeviceId] = useState('')
  const [crossDeviceStatus, setCrossDeviceStatus] = useState<'idle' | 'initiating' | 'showing' | 'approved' | 'expired'>('idle')
  const [crossDeviceCopied, setCrossDeviceCopied] = useState(false)
  const [crossDeviceIdentifier, setCrossDeviceIdentifier] = useState('')

  const handleCrossDeviceInitiate = async () => {
    if (!crossDeviceIdentifier.trim()) return
    setCrossDeviceStatus('initiating')
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/auth/cross-device/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: crossDeviceIdentifier.trim() }),
      })
      if (!res.ok) throw new Error('Initiation failed')
      const json = await res.json() as any
      if (!json.success || !json.data) throw new Error('Invalid response')
      const { code, pollToken, id } = json.data
      setCrossDeviceCode(code)
      setCrossDevicePollToken(pollToken)
      setCrossDeviceId(id)
      setCrossDeviceStatus('showing')
      // Start polling
      pollCrossDeviceStatus(code, pollToken)
    } catch (e: any) {
      showToast('Failed to initiate cross-device sign-in', 'error')
      setCrossDeviceStatus('idle')
    }
  }

  const pollCrossDeviceStatus = async (code: string, pollToken: string) => {
    const apiUrl = getApiUrl()
    const poll = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/auth/cross-device/poll?code=${code}&pollToken=${pollToken}`)
        if (!res.ok) return
        const json = await res.json() as any
        if (!json.success) return
        const { status, token: authToken } = json.data
        if (status === 'approved' && authToken) {
          setCrossDeviceStatus('approved')
          handleTokenLogin(authToken)
          return
        }
        if (status === 'expired') {
          setCrossDeviceStatus('expired')
          return
        }
        setTimeout(poll, 2000)
      } catch {
        setTimeout(poll, 2000)
      }
    }
    poll()
  }

  const handleCrossDeviceCancel = async () => {
    if (!crossDeviceId) return
    try {
      const apiUrl = getApiUrl()
      await fetch(`${apiUrl}/api/auth/cross-device/${crossDeviceId}/cancel`, { method: 'DELETE' })
    } catch {}
    setCrossDeviceStatus('idle')
    setCrossDeviceCode('')
    setCrossDevicePollToken('')
    setCrossDeviceId('')
    setCrossDeviceIdentifier('')
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(crossDeviceCode)
    setCrossDeviceCopied(true)
    setTimeout(() => setCrossDeviceCopied(false), 2000)
  }

  // Recovery State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isForcingChange, setIsForcingChange] = useState(false)

  const handleOAuthCallback = async (token: string) => {
    setLoading(true);
    try {
      const apiUrl = getApiUrl()
      const res = (await fetch(`${apiUrl}/api/user/profile`, {
              headers: { 'Authorization': `Bearer ${token}` },
              credentials: 'include'
            }) as any);
      
      if (!res.ok) {
        showToast('Failed to start session: Invalid profile response', 'error');
        return;
      }
      
      const envelope = (await res.json() as any);
      if (!envelope.success || !envelope.data) {
        showToast('Login sequence failed: Malformed profile envelope', 'error');
        return;
      }
      
      const profile = envelope.data;
      
      if (profile.forcePasswordChange) {
        setIsForcingChange(true)
      } else {
        login(token, profile);
        window.location.hash = '#/';
      }
    } catch (e: any) {
      showToast('OAuth login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const apiUrl = getApiUrl().replace(/\/$/, '')
        const res = await fetch(`${apiUrl}/api/auth/setup-status`)
        if (res.ok) {
          const data = await res.json() as { needsSetup: boolean }
          if (data.needsSetup) {
            window.location.hash = '#/claim'
          }
        }
      } catch (e) {
        console.error('Failed to check setup status', e)
      }
    }
    checkSetup()

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const token = params.get('token');
    const reset = params.get('reset_token');
    const oauthError = params.get('error');
    
    if (token) handleOAuthCallback(token);
    if (reset) setResetToken(reset);
    if (oauthError) showToast(decodeURIComponent(oauthError), 'error');
  }, []);

  const handleLogin = async () => {
    let hasError = false
    if (!username) {
      setUsernameError('User ID is required')
      hasError = true
    } else {
      setUsernameError('')
    }
    if (!password) {
      setPasswordError('Password is required')
      hasError = true
    } else {
      setPasswordError('')
    }
    if (hasError) return

    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const res = (await fetch(`${apiUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                username, 
                password, 
                recoveryCode: recoveryCode || undefined,
                persistent 
              })
            }) as any)
      
      if (!res.ok) {
        const envelope = (await res.json() as any)
        showToast(`Login Failed: ${envelope.error || 'Unknown error'}`, 'error')
        return
      }

      const loginEnvelope = (await res.json() as any)
      if (!loginEnvelope.success || !loginEnvelope.data) {
        showToast('Login Protocol Error: Invalid server response', 'error')
        return
      }
      
      const authData = loginEnvelope.data;
      
      if (authData.requires2FA) {
        setMfaRequired(true)
        setLoading(false)
        return
      }

      if (authData.token) {
        const profileRes = (await fetch(`${apiUrl}/api/user/profile`, {
                  headers: { 'Authorization': `Bearer ${authData.token}` },
                  credentials: 'include'
                }) as any)

        if (!profileRes.ok) {
          showToast('Login sequence failed: Profile retrieval error', 'error');
          return;
        }

        const profileEnvelope = (await profileRes.json() as any)
        if (!profileEnvelope.success || !profileEnvelope.data) {
          showToast('Security Identity Error: Missing profile data', 'error');
          return;
        }
        
        const profile = profileEnvelope.data;
        
        if (profile.forcePasswordChange) {
           setIsForcingChange(true)
           login(authData.token, profile)
        } else {
           login(authData.token, profile)
           
           if ((window as any).PasswordCredential) {
             try {
               const cred = new (window as any).PasswordCredential({
                 id: username,
                 password: password,
                 name: profile.displayName
               });
               navigator.credentials.store(cred);
             } catch (e: any) {
               console.warn('[Credential Manager] Storage failed:', e);
             }
           }

           window.location.hash = '#/'
        }
      }
    } catch (e: any) {
      showToast('Network error during login.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTokenLogin = async (token: string) => {
    try {
      const apiUrl = getApiUrl()
      const profileRes = (await fetch(`${apiUrl}/api/user/profile`, {
              headers: { 'Authorization': `Bearer ${token}` },
              credentials: 'include'
            }) as any)

      if (!profileRes.ok) {
        showToast('Login sequence failed: Profile retrieval error', 'error');
        return;
      }

      const profileEnvelope = (await profileRes.json() as any)
      if (!profileEnvelope.success || !profileEnvelope.data) {
        showToast('Security Identity Error: Missing profile data', 'error');
        return;
      }
      
      const profile = profileEnvelope.data;
      login(token, profile)
      window.location.hash = '#/'
    } catch (e: any) {
      showToast('Network error during profile sync.', 'error')
    }
  }

  const handlePasskeyLogin = async () => {
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const optRes = (await fetch(`${apiUrl}/api/auth/passkeys/login/options`, { 
              method: 'POST',
              credentials: 'include'
            }) as any)
      
      const optEnvelope = (await optRes.json() as any)
      if (!optEnvelope.success || !optEnvelope.data) {
        showToast('Biometric Protocol Error: Options delivery failed', 'error')
        return
      }
      
      const assertion = (await startAuthentication({ optionsJSON: optEnvelope.data }) as any)
      
      const verifyRes = (await fetch(`${apiUrl}/api/auth/passkeys/login/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ assertion })
            }) as any)
      
      const authEnvelope = (await verifyRes.json() as any)
      if (authEnvelope.success && authEnvelope.data?.token) {
        handleTokenLogin(authEnvelope.data.token)
      } else {
        showToast(authEnvelope.error || 'Authentication failed', 'error')
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
      const apiUrl = getApiUrl()
      await fetch(`${apiUrl}/api/auth/password/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: recoveryEmail })
      })
      showToast('Recovery process initiated. Check console.', 'success')
      setIsForgotModalOpen(false)
    } catch (e: any) {
      showToast('Recovery failed', 'error')
    }
  }

  const handleResetPassword = async () => {
    try {
      const apiUrl = getApiUrl()
      const res = (await fetch(`${apiUrl}/api/auth/password/reset`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: resetToken, newPassword })
            }) as any)
      if (res.ok) {
        showToast('Password reset successfully', 'success')
        setResetToken(null)
        window.location.hash = '#/login'
      }
    } catch (e: any) {
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

          <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            {mfaRequired ? (
              <div className="space-y-4 reveal">
                <p className="text-gray-400 text-sm mb-4">Enter your 8-character security recovery code.</p>
                <Input 
                  label="RECOVERY CODE" 
                  type="text" 
                  value={recoveryCode} 
                  onChange={e => setRecoveryCode(e.target.value)} 
                  placeholder="XXXXXXXX"
                  className="bg-white/5 border-white/5 focus:border-primary p-5 rounded-2xl font-bold font-mono tracking-[0.5em] text-center text-xl"
                  autoFocus
                />
              </div>
            ) : (
            <div className="space-y-6">
              <Input 
                label="User ID"
                type="text" 
                placeholder="Username or email" 
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUsernameError('') }}
                autoComplete="username webauthn"
                aria-label="User ID"
                aria-describedby="username-error"
                className="bg-white/5 border-white/5 focus:border-primary p-5 rounded-2xl font-bold"
                rightElement={
                  isSupported ? (
                    <button
                      type="button"
                      onClick={isListening ? stop : start}
                      className="relative text-secondary hover:text-white transition-colors"
                      title={isListening ? 'Stop listening' : 'Voice input'}
                    >
                      {isListening && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                      <Mic size={18} />
                    </button>
                  ) : undefined
                }
              />
              {usernameError && (
                <div id="username-error" role="alert" className="text-xs text-red-500 font-bold uppercase tracking-wider">{usernameError}</div>
              )}
                  <Input 
                    label="Password"
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
                    autoComplete="current-password"
                    aria-label="Password"
                    aria-describedby="password-error"
                    showReveal={true}
                    className="bg-white/5 border-white/5 focus:border-primary p-5 rounded-2xl font-bold font-mono tracking-widest text-lg"
                  />
                  {passwordError && (
                    <div id="password-error" role="alert" className="text-xs text-red-500 font-bold uppercase tracking-wider">{passwordError}</div>
                  )}
                <div className="flex justify-between items-center px-1">
                   <div className="flex items-center gap-3 group cursor-pointer select-none" onClick={() => setPersistent(!persistent)}>
                     <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${persistent ? 'bg-primary border-primary' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
                       {persistent && <Check size={14} className="text-black font-black" strokeWidth={4} />}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-secondary group-hover:text-white transition-colors">Keep me signed in</span>
                   </div>
                   <button 
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                   >
                     Forgot Details?
                   </button>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <Button
                type="button" 
                onClick={(e) => { e.preventDefault(); handleLogin() }}
                variant="primary" 
                size="lg" 
                className="w-full py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-primary/20"
                loading={loading}
              >
                Sign in with Password
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
                const baseApi = getApiUrl().replace(/\/$/, '');
                window.location.href = `${baseApi}/api/auth/login/google?persistent=${persistent}`;
              }}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all font-bold text-sm"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="G" className="w-4 h-4" />
              Google
            </button>
            <button 
              onClick={() => {
                const baseApi = getApiUrl().replace(/\/$/, '');
                window.location.href = `${baseApi}/api/auth/login/discord?persistent=${persistent}`;
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

          {!showCrossDevice ? (
            <button
              type="button"
              onClick={() => setShowCrossDevice(true)}
              className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all font-bold text-xs uppercase tracking-widest text-slate-400"
            >
              <Smartphone className="w-4 h-4" />
              Sign in using another device
            </button>
          ) : crossDeviceStatus === 'idle' || crossDeviceStatus === 'initiating' ? (
            <div className="space-y-3">
              <Input
                label="Target Username or Email"
                value={crossDeviceIdentifier}
                onChange={(e) => setCrossDeviceIdentifier(e.target.value)}
                placeholder="username or email@example.com"
                className="bg-white/5 border-white/5"
              />
              <button
                type="button"
                onClick={handleCrossDeviceInitiate}
                disabled={crossDeviceStatus === 'initiating' || !crossDeviceIdentifier.trim()}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all font-black uppercase tracking-widest text-xs text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {crossDeviceStatus === 'initiating' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Generate Authorization Code
              </button>
            </div>
          ) : crossDeviceStatus === 'showing' ? (
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4 reveal">
              <div className="text-center space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Enter this code on your authorized device</p>
                <p className="text-[10px] text-slate-500">Settings → Security → Authorize Device Sign-In</p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="text-4xl font-black tracking-[0.3em] text-primary font-mono">{crossDeviceCode}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Copy code"
                >
                  {crossDeviceCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                <span className="text-[10px] text-slate-500">Waiting for approval...</span>
              </div>
              <button
                type="button"
                onClick={handleCrossDeviceCancel}
                className="w-full text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest font-black"
              >
                Cancel
              </button>
            </div>
          ) : crossDeviceStatus === 'approved' ? (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-center reveal">
              <Check className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-black text-emerald-400">Authorized! Signing in...</p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3 reveal">
              <p className="text-sm font-black text-red-400 text-center">Code expired</p>
              <button
                type="button"
                onClick={() => { setShowCrossDevice(false); setCrossDeviceStatus('idle') }}
                className="w-full text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Identity Recovery"
        footer={
           <>
             <Button variant="secondary" onClick={() => setIsForgotModalOpen(false)}>Abort</Button>
             <Button variant="primary" onClick={handleRequestReset}>Start Recovery</Button>
           </>
        }
      >
        <div className="space-y-6">
           <p className="text-secondary font-medium tracking-tight">Enter your registered identity to receive a security recovery token.</p>
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
        title="Password Reset"
        footer={
           <Button variant="primary" className="w-full" onClick={handleResetPassword} disabled={newPassword.length < 8}>Reset Password</Button>
        }
      >
        <div className="space-y-6">
           <div className="relative">
             <Input 
              label="New Password"
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
        title="Security Check"
        footer={
           <Button variant="primary" className="w-full" onClick={async () => {
             // Logic to update and login
             await handleResetPassword();
             setIsForcingChange(false);
           }} disabled={newPassword.length < 8}>Commit & Enter</Button>
        }
      >
        <div className="space-y-6">
           <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
              <RefreshCw className="text-blue-500 mt-1 animate-spin-slow" size={20} />
              <p className="text-sm text-blue-500 font-bold leading-relaxed uppercase tracking-tighter">An owner has requested a mandatory security update for your account. Please establish a new password to proceed.</p>
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
