import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  KeyRound,
  Shield,
  Copy,
  Check,
  Globe,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

const getServiceIconUrl = (name: string) => {
  const providers: Record<string, string> = {
    'google': 'https://cdn.simpleicons.org/google/4285F4',
    'authy': 'https://cdn.simpleicons.org/authy/FF3300',
    'microsoft': 'https://cdn.simpleicons.org/microsoft/0078D4',
    '1password': 'https://cdn.simpleicons.org/1password/0092E1',
    'bitwarden': 'https://cdn.simpleicons.org/bitwarden/171050',
    'apple': 'https://cdn.simpleicons.org/apple/FFFFFF',
    'yubico': 'https://cdn.simpleicons.org/yubico/000000'
  };
  
  const key = Object.keys(providers).find(k => name.toLowerCase().includes(k));
  return key ? providers[key] : null;
};

export const TotpModule = () => {
  const [totps, setTotps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupData, setSetupData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [authenticatorName, setAuthenticatorName] = useState('My Authenticator');
  const [isVerifying, setIsVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { user, refreshProfile } = useAuth();
  const { showToast, showConfirm, showPrompt } = useToast();
  const [inlineStatus, setInlineStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showInline = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setInlineStatus({ message, type });
    setTimeout(() => setInlineStatus(null), 5000);
  };

  const refreshTotps = async () => {
    try {
      const res = await fetch('/api/auth/totp/list');
      if (res.ok) {
        const data = await res.json();
        setTotps(data);
      }
    } catch (err) {
      console.error('Failed to fetch TOTP list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTotps();
  }, []);

  const beginSetup = async () => {
    setIsSettingUp(true);
    try {
      const res = await fetch('/api/auth/totp/setup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSetupData(data);
        setAuthenticatorName('My Authenticator');
      } else {
        showInline('Failed to initialize TOTP setup.', 'error');
      }
    } catch (err) {
      showInline('An error occurred during setup initialization.', 'error');
    } finally {
      setIsSettingUp(false);
    }
  };

  const verifySetup = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: verificationCode,
          name: authenticatorName 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showInline('Authenticator successfully linked.', 'success');
        if (data.backupCodes) {
          setRecoveryCodes(data.backupCodes);
          setVerificationCode('');
        } else {
          refreshTotps();
          refreshProfile();
          setSetupData(null);
          setVerificationCode('');
        }
      } else {
        const error = await res.json();
        showInline(error.message || 'Invalid verification code.', 'error');
      }
    } catch (err) {
      showInline('An error occurred during verification.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const deleteTotp = async (id: string) => {
    const confirmed = await showConfirm(
      'Structural Revocation',
      'This will permanently invalidate this TOTP secret. Future access from this specific device will be denied. Continue?'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/auth/totp/delete?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showInline('Authenticator secret revoked.', 'success');
        refreshTotps();
        refreshProfile();
      } else {
        showInline('Failed to revoke secret.', 'error');
      }
    } catch (err) {
      showInline('An error occurred during revocation.', 'error');
    }
  };

  const renameTotp = async (id: string, currentName: string) => {
    const newName = await showPrompt(
      'Label Identity',
      'Enter a professional label for this authenticator secret (e.g., "iPhone 15 - Primary").',
      currentName
    );

    if (newName === null) return;
    if (newName.trim() === '') {
      showInline('Label cannot be empty.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/auth/totp/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName }),
      });
      if (res.ok) {
        showInline('Identity label updated.', 'success');
        refreshTotps();
      } else {
        showInline('Failed to update label.', 'error');
      }
    } catch (err) {
      showInline('An error occurred during renaming.', 'error');
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-12">
        <section className="bg-slate-900/40 backdrop-blur-lg border border-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
           
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
                       <Smartphone className="w-5 h-5 text-amber-400" />
                       Authenticator Apps (TOTP)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Link Google Authenticator, Authy, Apple Passwords, or Bitwarden using 6-digit rolling codes.</p>
                 </div>
                 
                 {!setupData && (
                   <button 
                     onClick={beginSetup}
                     disabled={isSettingUp}
                     className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(245,158,11,0.5)] disabled:opacity-50"
                   >
                      <KeyRound className="w-4 h-4" />
                      <span>Bind New Device</span>
                   </button>
                 )}
              </div>

              <AnimatePresence>
                {inlineStatus && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden"
                  >
                    <div className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-between shadow-lg ${
                      inlineStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5' :
                      inlineStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/5' :
                      'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/5'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          inlineStatus.type === 'success' ? 'bg-emerald-500' :
                          inlineStatus.type === 'error' ? 'bg-rose-500' :
                          'bg-blue-500'
                        }`} />
                        <span>{inlineStatus.message}</span>
                      </div>
                      <button onClick={() => setInlineStatus(null)} className="opacity-50 hover:opacity-100 transition-opacity p-1">
                        &times;
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {setupData && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950/60 border border-slate-800 rounded-[1.5rem] p-8 mb-8"
                >
                  <div className="flex flex-col xl:flex-row gap-10 items-center">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl shrink-0">
                      <QRCodeSVG value={setupData.otpauthUrl} size={180} level="H" />
                    </div>
                    
                    <div className="flex-1 space-y-5 w-full">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-2 flex items-center justify-center xl:justify-start gap-2">
                          <Smartphone className="w-4 h-4 text-amber-400" />
                          Step 1: Save it to your Device
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium">
                          We suggest a default name below. You can change it to something more personal like "Personal Phone", "1Password", or "Work iPad".
                        </p>
                        <input 
                            type="text"
                            value={authenticatorName}
                            onChange={(e) => setAuthenticatorName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 mb-4 text-white font-bold text-sm outline-none transition-colors"
                        />
                        
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-slate-900 border border-slate-800 text-amber-300 px-3 py-2 rounded-lg text-sm font-mono tracking-wider overflow-x-auto text-center">
                            {setupData.secret}
                          </code>
                          <button 
                            onClick={copySecret} 
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                            title="Copy raw secret"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="border-t border-slate-800 pt-4">
                        <h4 className="text-sm font-bold text-white mb-2">Step 2: Verify Rolling Code</h4>
                        <div className="flex flex-col gap-3">
                          <input 
                            type="text" 
                            maxLength={6}
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white font-mono text-center tracking-[0.5em] font-black text-2xl outline-none placeholder:text-slate-700 transition-colors"
                          />
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={verifySetup}
                              disabled={verificationCode.length !== 6 || isVerifying || !authenticatorName.trim()}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-6 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-colors"
                            >
                              Verify
                            </button>
                            <button 
                              onClick={() => { setSetupData(null); setVerificationCode(''); }}
                              disabled={isVerifying}
                              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {recoveryCodes && (
                    <div className="mt-8 pt-8 border-t border-slate-800 animate-in fade-in zoom-in-95">
                      <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                          <Shield className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">Save Recovery Codes</h4>
                        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                          If you lose your device, these codes are the <span className="text-emerald-400 font-bold">ONLY</span> way to regain access.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-4 bg-black/40 rounded-2xl border border-slate-800">
                        {recoveryCodes.map((code, idx) => (
                          <div key={idx} className="bg-slate-900/50 border border-slate-800/50 rounded-lg py-2 px-3 text-center">
                            <code className="text-xs font-mono font-black text-white tracking-widest">{code}</code>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex gap-3">
                        <button 
                          onClick={() => {
                            const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'iam-recovery-codes.txt';
                            a.click();
                          }}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Download Codes
                        </button>
                        <button 
                          onClick={async () => {
                            await refreshTotps();
                            await refreshProfile();
                            setSetupData(null);
                            setRecoveryCodes(null);
                          }}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                        >
                          I've Saved Them
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {loading ? (
                 <div className="flex justify-center items-center py-12">
                    <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
                 </div>
              ) : totps.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-8 bg-slate-950/50 rounded-2xl border border-amber-500/10 border-dashed">
                    <AlertTriangle className="w-8 h-8 text-amber-500/50 mb-3" />
                    <p className="text-slate-400 font-medium text-sm text-center">No secondary authenticator secrets found.<br/>Your account requires standard 2FA secrets for baseline compliance.</p>
                 </div>
              ) : (
                 <div className="space-y-4">
                    {totps.map(t => (
                       <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-950/80 border border-slate-800 rounded-2xl group hover:border-amber-500/30 transition-colors">
                          <div className="flex items-center gap-4 mb-4 md:mb-0">
                             <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group-hover:bg-amber-500/10 transition-colors p-2">
                                {getServiceIconUrl(t.name) ? (
                                  <img src={getServiceIconUrl(t.name)!} alt="Provider" className="w-full h-full object-contain drop-shadow transition-transform group-hover:scale-110" />
                                ) : (
                                  <Smartphone className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                                )}
                             </div>
                             <div>
                                <h4 
                                  className="text-sm font-black text-white group-hover:text-amber-400 transition-colors cursor-pointer"
                                  onClick={() => renameTotp(t.id, t.name)}
                                >
                                  {t.name}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Rolling 6-Digit Verification</p>
                                
                                <div className="mt-3">
                                  <button 
                                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                    className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                                  >
                                    <Shield className="w-3 h-3" />
                                    Forensic Chronology
                                    {expandedId === t.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  <AnimatePresence>
                                    {expandedId === t.id && (
                                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                            <span className="text-slate-600 text-[8px]">Linked On</span>
                                            <span className="text-slate-400 font-mono text-[10px]">{new Date(t.createdAt).toLocaleDateString()}</span>
                                          </div>
                                          <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                            <span className="text-slate-600 text-[8px]">Last Used</span>
                                            <span className="text-slate-400 font-mono text-[10px]">{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'Never'}</span>
                                          </div>
                                          <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                            <span className="text-slate-600 text-[8px]">IPv4:</span>
                                            <span className="font-mono text-slate-400">{t.lastUsedIpV4 || 'DETECTING...'}</span>
                                          </div>
                                          <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                            <span className="text-slate-600 text-[8px]">IPv6:</span>
                                            <span className="font-mono text-slate-400">{t.lastUsedIpV6 || 'DETECTING...'}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                            <span className="text-slate-600 text-[8px]">Geolocation</span>
                                            <span className="text-emerald-400/80">{t.lastUsedLocation || 'Unknown Region'}</span>
                                          </div>
                                          <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                            <span className="text-slate-600 text-[8px]">Architecture</span>
                                            <span className="text-slate-400">{t.lastUsedUa?.includes('Mac') ? 'macOS Kernel' : t.lastUsedUa?.includes('Windows') ? 'Windows NT' : 'Mobile / Unknown'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </AnimatePresence>
                                </div>
                             </div>
                          </div>
                          
                          <button 
                            onClick={() => deleteTotp(t.id)}
                            className="bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest self-start md:self-auto"
                          >
                             <Trash2 className="w-3 h-3" />
                             <span>Revoke</span>
                          </button>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </section>
    </div>
  );
};
