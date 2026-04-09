/** @jsxImportSource react */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, KeyRound, Copy, Check, QrCode as QrIcon, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl === 'undefined' || !rawApiUrl ? '' : rawApiUrl;

export const TotpModule = () => {
  const { token } = useAuth();
  const { data: profile } = useApi('/api/user/profile');
  
  const [setupData, setSetupData] = useState<{ secret: string; qrUrl: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(profile?.totpEnabled === 1);

  // Sync state if profile loads dynamically
  React.useEffect(() => {
    if (profile?.totpEnabled !== undefined) {
      setTotpEnabled(profile.totpEnabled === 1);
    }
  }, [profile?.totpEnabled]);

  const beginSetup = async () => {
    setIsSettingUp(true);
    try {
      const res = await fetch(`${API_URL}/auth/totp/setup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch TOTP generation payload');
      const data = await res.json();
      setSetupData({ secret: data.secret, qrUrl: data.qrUrl });
    } catch (err: any) {
      toast.error('System Interruption: Failed to bridge secure OTP generation.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const copySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    toast.success('Secret copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const verifySetup = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Invalid token length. Must be 6 digits.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch(`${API_URL}/auth/totp/verify`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });
      
      if (!res.ok) throw new Error('Verification blocked: Code mismatch.');
      
      toast.success('Integrity Verified: Authenticator App successfully bound.');
      setTotpEnabled(true);
      setSetupData(null);
    } catch (err: any) {
      toast.error(err.message || 'Verification Failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="bg-slate-900/40 backdrop-blur-lg border border-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden mt-6">
       {/* Visual Glow */}
       <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
       
       <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
                   <Smartphone className="w-5 h-5 text-amber-400" />
                   Authenticator Apps (TOTP)
                </h3>
                <p className="text-xs text-slate-500 font-medium">Link Google Authenticator, Authy, Apple Passwords, or Bitwarden using 6-digit rolling codes.</p>
             </div>
             
             {!totpEnabled && !setupData && (
               <button 
                 onClick={beginSetup}
                 disabled={isSettingUp}
                 className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(245,158,11,0.5)] disabled:opacity-50"
               >
                  <KeyRound className="w-4 h-4" />
                  <span>Bind Device</span>
               </button>
             )}
             
             {totpEnabled && (
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Active
                </div>
             )}
          </div>

          <AnimatePresence>
            {setupData && !totpEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-6"
              >
                <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start">
                  {/* QR Core */}
                  <div className="flex flex-col items-center gap-4 shrink-0 mx-auto xl:mx-0">
                    <div className="p-4 bg-white rounded-2xl shadow-lg border-4 border-slate-800">
                      <QRCodeSVG 
                        value={setupData.qrUrl} 
                        size={160} 
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <a 
                      href={setupData.qrUrl}
                      className="text-xs font-bold text-amber-500 hover:text-amber-400 border border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-lg transition-all"
                    >
                      Open Authenticator App
                    </a>
                  </div>
                  
                  {/* Instructions */}
                  <div className="flex-1 space-y-5 w-full">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-2 flex items-center justify-center xl:justify-start gap-2">
                        <QrIcon className="w-4 h-4 text-amber-400" />
                        Step 1: Scan QR or Enter Secret
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        Use your native device camera, Apple Passwords, Bitwarden, or any generic Authenticator app to scan the QR code. If your app does not support scanning, copy the manual raw secret below.
                      </p>
                      
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
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="000000"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                          className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-white font-mono text-center tracking-[0.5em] font-black text-lg outline-none placeholder:text-slate-700 transition-colors"
                        />
                        <button 
                          onClick={verifySetup}
                          disabled={verificationCode.length !== 6 || isVerifying}
                          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-6 font-black uppercase text-xs tracking-widest rounded-xl transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {totpEnabled && (
                <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <Shield className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white">Cryptographic Synchronized</h4>
                        <p className="text-xs text-slate-400 font-medium">Your identity is rigorously bound to an isolated rolling code generator.</p>
                    </div>
                </div>
            )}
          </AnimatePresence>
       </div>
    </section>
  );
};
