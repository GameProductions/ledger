import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  Key, 
  Plus, 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  ShieldCheck,
  Globe,
  Clock,
  Cpu,
  Smartphone,
  ChevronDown,
  MapPin,
  ChevronUp,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineToast } from './ui/InlineToast';
import { secureRequest } from '../utils/api';

// Hardware AAGUID to Branding Mapping
const AAGUID_MAP: Record<string, { name: string; icon?: string }> = {
  'ad155a33-b093-422d-ba36-11a983b5899a': { name: 'YubiKey 5 Series', icon: 'yubico' },
  '2fc0579f-8113-47ea-b116-bb989a6399c5': { name: 'YubiKey 5 NFC', icon: 'yubico' },
  '6279f72d-cc59-428a-875d-357564756c6f': { name: 'Google Titan Key', icon: 'google' },
  '4e3a9c7b-9f0a-4b1e-8d2c-3f4a5b6c7d8e': { name: 'Apple iCloud Keychain', icon: 'apple' },
  '12345678-1234-1234-1234-1234567890ab': { name: 'Windows Hello', icon: 'windows' },
  '00000000-0000-0000-0000-000000000000': { name: 'Generic Security Key' }
};

const getServiceName = (aaguid: string | null) => {
  if (!aaguid) return 'Unknown Security Key';
  return AAGUID_MAP[aaguid]?.name || 'Hardware Key';
};

const getServiceIconUrl = (name: string) => {
  const providers: Record<string, string> = {
    'yubico': 'https://cdn.simpleicons.org/yubico/000000',
    'google': 'https://cdn.simpleicons.org/google/4285F4',
    'apple': 'https://cdn.simpleicons.org/apple/FFFFFF',
    'windows': 'https://cdn.simpleicons.org/windows/0078D6',
    '1password': 'https://cdn.simpleicons.org/1password/0092E1',
    'bitwarden': 'https://cdn.simpleicons.org/bitwarden/171050'
  };
  
  const key = Object.keys(providers).find(k => name.toLowerCase().includes(k));
  return key ? providers[key] : null;
};

export const PasskeyModule = () => {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { user, refreshProfile } = useAuth();
  const { showToast, showPrompt } = useToast();
  const [inlineStatus, setInlineStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showInline = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setInlineStatus({ message, type });
    setTimeout(() => setInlineStatus(null), 5000);
  };

  const fetchPasskeys = async () => {
    try {
      const res = await secureRequest('/api/auth/passkeys');
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data);
      }
    } catch (err) {
      console.error('Failed to fetch passkeys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const generatePasskey = async () => {
    setRegistering(true);
    try {
      // Step 1: Get registration options from server
      const optionsRes = await secureRequest('/api/auth/passkeys/register/options', { method: 'POST' });
      const options = await optionsRes.json();

      // Step 2: Use WebAuthn API to create credential
      const { startRegistration } = await import('@simplewebauthn/browser');
      const regResp = await startRegistration(options);

      // Step 3: Send response to server for verification
      const verifyRes = await secureRequest('/api/auth/passkeys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResp),
      });

      const verification = await verifyRes.json();

      if (verification.verified) {
        showInline('Hardware signature verified and linked.', 'success');
        fetchPasskeys();
        refreshProfile();
      } else {
        showInline(verification.error || 'Identity verification failed.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'NotAllowedError') {
        showInline(err.message || 'Passkey registration failed.', 'error');
      }
    } finally {
      setRegistering(false);
    }
  };

  const deletePasskey = async (id: string) => {
    try {
      const res = await secureRequest(`/api/auth/passkeys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showInline('Hardware signature revoked.', 'success');
        setConfirmDeleteId(null);
        fetchPasskeys();
        refreshProfile();
      } else {
        showInline('Failed to revoke signature.', 'error');
      }
    } catch (err) {
      showInline('An error occurred during revocation.', 'error');
    }
  };

  const renamePasskey = async (id: string, currentName: string) => {
    const newName = await showPrompt(
      'Label Identity',
      'Enter a professional label for this hardware signature (e.g., "YubiKey 5C - Primary").',
      currentName
    );

    if (newName === null) return;
    if (newName.trim() === '') {
      showInline('Label cannot be empty.', 'error');
      return;
    }

    try {
      const res = await secureRequest(`/api/auth/passkeys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        showInline('Identity label updated.', 'success');
        fetchPasskeys();
      } else {
        showInline('Failed to update label.', 'error');
      }
    } catch (err) {
      showInline('An error occurred during renaming.', 'error');
    }
  };

  return (
    <>
        <div className="flex items-center gap-4 mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </motion.div>
          <h3 className="text-2xl font-black text-white">Hardware Key Subsystem</h3>
        </div>


          <section className="bg-slate-900/40 backdrop-blur-lg border border-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             {/* Visual Glow */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
             
             <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
                         <Fingerprint className="w-5 h-5 text-blue-400" />
                         Biometric Passkeys
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Hardware-bound cryptographic signatures explicitly authorized for God Mode.</p>
                   </div>
                   
                   <button 
                     onClick={generatePasskey}
                     disabled={registering}
                     className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] disabled:opacity-50"
                   >
                      {registering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>Add Passkey</span>
                   </button>
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

                {loading ? (
                   <div className="flex justify-center items-center py-12">
                      <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
                   </div>
                ) : passkeys.length === 0 ? (
                   <div className="flex flex-col items-center justify-center p-8 bg-slate-950/50 rounded-2xl border border-rose-500/10 border-dashed">
                      <AlertTriangle className="w-8 h-8 text-rose-500/50 mb-3" />
                      <p className="text-slate-400 font-medium text-sm text-center">No hardware signatures detected on this identity.<br/>Your account is structurally vulnerable to standard SSO hijacking.</p>
                   </div>
                ) : (
                   <div className="space-y-4">
                      {passkeys.map(pk => (
                         <div key={pk.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-950/80 border border-slate-800 rounded-2xl group hover:border-blue-500/30 transition-colors">
                            <div className="flex items-center gap-4 mb-4 md:mb-0">
                               <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group-hover:bg-blue-500/10 transition-colors p-2">
                                  {getServiceIconUrl(getServiceName(pk.aaguid)) ? (
                                    <img src={getServiceIconUrl(getServiceName(pk.aaguid))!} alt="Provider" className="w-full h-full object-contain drop-shadow transition-transform group-hover:scale-110" />
                                  ) : (
                                    <Key className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                                  )}
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                    <h4 
                                      className="text-sm font-black text-white group-hover:text-blue-400 transition-colors cursor-pointer"
                                      onClick={() => renamePasskey(pk.id, pk.name)}
                                    >
                                      {pk.name}
                                    </h4>
                                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-tighter rounded border border-blue-500/20">
                                      FIDO2 L2
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    {getServiceName(pk.aaguid)}
                                  </p>
                                  
                                  <div className="mt-3">
                                    <button 
                                      onClick={() => setExpandedId(expandedId === pk.id ? null : pk.id)}
                                      className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                                    >
                                      <Shield className="w-3 h-3" />
                                      Forensic Chronology
                                      {expandedId === pk.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    <AnimatePresence>
                                      {expandedId === pk.id && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                              <span className="text-slate-600 text-[8px]">Linked On</span>
                                              <span className="text-slate-400 font-mono text-[10px]">{new Date(pk.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                              <span className="text-slate-600 text-[8px]">IPv4:</span>
                                              <span className="font-mono text-slate-400">{pk.lastUsedIpV4 || 'DETECTING...'}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                              <span className="text-slate-600 text-[8px]">IPv6:</span>
                                              <span className="font-mono text-slate-400">{pk.lastUsedIpV6 || 'DETECTING...'}</span>
                                            </div>
                                          </div>
                                          
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                              <span className="text-slate-600 text-[8px]">Geolocation</span>
                                              <span className="text-emerald-400/80">{pk.lastUsedLocation || 'Unknown Region'}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                              <span className="text-slate-600 text-[8px]">Architecture</span>
                                              <span className="text-slate-400">{pk.lastUsedUa?.includes('Mac') ? 'macOS Kernel' : pk.lastUsedUa?.includes('Windows') ? 'Windows NT' : 'Mobile / Unknown'}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/30">
                                              <span className="text-slate-600 text-[8px]">Hardware AAGUID</span>
                                              <span className="font-mono text-slate-500 text-[7px] tracking-tighter">{pk.aaguid || '00000000-0000-0000-0000-000000000000'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </AnimatePresence>
                                </div>
                             </div>
                          </div>
                          
                          {confirmDeleteId === pk.id ? (
                            <InlineToast 
                              message="Revoke key?" 
                              type="confirm" 
                              onConfirm={() => deletePasskey(pk.id)} 
                              onCancel={() => setConfirmDeleteId(null)} 
                            />
                          ) : (
                            <button 
                              onClick={() => setConfirmDeleteId(pk.id)}
                              className="bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest self-start md:self-auto"
                            >
                               <Trash2 className="w-3 h-3" />
                               <span>Revoke</span>
                            </button>
                          )}
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </section>
    </>
  );
};
