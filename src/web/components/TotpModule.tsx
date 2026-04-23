/** @jsxImportSource react */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, KeyRound, Copy, Check, QrCode as QrIcon, Smartphone, Trash2, Edit2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl === 'undefined' || !rawApiUrl ? '' : rawApiUrl;

export const TotpModule = () => {
  const { token } = useAuth();
  const { data: profile, mutate: refreshProfile } = useApi('/api/user/profile');
  const { data: totps = [], mutate: refreshTotps } = useApi('/api/user/totps');
  
  const [setupData, setSetupData] = useState<{ secret: string; qrUrl: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [authenticatorName, setAuthenticatorName] = useState('Authenticator App');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const beginSetup = async () => {
    setIsSettingUp(true);
    setAuthenticatorName(`Authenticator App ${totps ? totps.length + 1 : 1}`);
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
        body: JSON.stringify({ code: verificationCode, secret: setupData!.secret, name: authenticatorName })
      });
      
      if (!res.ok) throw new Error('Verification blocked: Code mismatch.');
      
      toast.success('Integrity Verified: Authenticator App successfully bound.');
      await refreshTotps();
      await refreshProfile();
      setSetupData(null);
      setVerificationCode('');
    } catch (err: any) {
      toast.error(err.message || 'Verification Failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const removeTotp = async (id: string) => {
    if (!confirm('Are you sure you want to remove this authenticator? It will no longer be able to generate valid 2FA codes for your account.')) return;
    try {
      const res = await fetch(`${API_URL}/api/user/totps/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete authenticator');
      toast.success('Authenticator removed successfully.');
      await refreshTotps();
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const renameTotp = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/user/totps/${id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editName })
      });
      if (!res.ok) throw new Error('Failed to rename authenticator');
      toast.success('Authenticator renamed');
      setEditingId(null);
      await refreshTotps();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const hasAuthenticators = totps && totps.length > 0;

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

          {hasAuthenticators && !setupData && (
             <div className="mb-8 space-y-3">
               {totps.map((t: any) => (
                 <div key={t.id} className="bg-slate-950/50 flex items-center justify-between p-4 rounded-xl border border-slate-800 transition-colors hover:border-slate-700">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                       <Shield className="w-5 h-5 text-amber-500" />
                     </div>
                     <div>
                       {editingId === t.id ? (
                         <input 
                           type="text" 
                           value={editName}
                           autoFocus
                           className="bg-slate-900 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-sm text-white font-bold outline-none w-48 transition-colors"
                           onChange={(e) => setEditName(e.target.value)}
                           onBlur={() => renameTotp(t.id)}
                           onKeyDown={(e) => e.key === 'Enter' && renameTotp(t.id)}
                         />
                       ) : (
                         <h4 className="text-sm font-bold text-slate-200">{t.name}</h4>
                       )}
                       <p className="text-xs text-slate-500 font-medium">Added on {new Date(t.createdAt).toLocaleDateString()}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={() => startRename(t.id, t.name)}
                       className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                       title="Rename"
                     >
                       <Edit2 className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => removeTotp(t.id)}
                       className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                       title="Remove"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          )}

          <AnimatePresence>
            {setupData && (
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
                        <Smartphone className="w-4 h-4 text-amber-400" />
                        Step 1: Save it to your Device
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
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
              </motion.div>
            )}
            
          </AnimatePresence>
       </div>
    </section>
  );
};
