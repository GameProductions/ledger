// @ts-nocheck
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
  Shield,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineToast } from './ui/InlineToast';
import { secureRequest } from '../utils/api';

export const PasskeyModule = () => {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { refreshProfile } = useAuth();
  const { showToast, showPrompt } = useToast();
  const [inlineStatus, setInlineStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showInline = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setInlineStatus({ message, type });
    setTimeout(() => setInlineStatus(null), 5000);
  };

  const fetchPasskeys = async () => {
    try {
      const res = (await secureRequest('/api/admin/webauthn/passkeys') as any);
      if (res.ok) {
        const data = (await res.json() as any);
        setPasskeys(data.passkeys || []);
      }
    } catch (err: any) {
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
      const optionsRes = (await secureRequest('/api/admin/webauthn/generate-registration', { method: 'POST' }) as any);
      const options = (await optionsRes.json() as any);
      const { startRegistration } = (await import('@simplewebauthn/browser') as any);
      const regResp = (await startRegistration({ optionsJSON: options }) as any);

      const name = (await showPrompt('Label Passkey', 'Enter a name for this hardware key (e.g. MacBook TouchID)', 'Primary Key') as any);
      if (!name) return;

      const verifyRes = (await secureRequest('/api/admin/webauthn/verify-registration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ attestation: regResp, name }),
            }) as any);

      const verification = (await verifyRes.json() as any);
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
      const res = (await secureRequest(`/api/admin/webauthn/passkeys/${id}`, { method: 'DELETE' }) as any);
      if (res.ok) {
        showInline('Hardware signature revoked.', 'success');
        setConfirmDeleteId(null);
        fetchPasskeys();
        refreshProfile();
      } else {
        showInline('Failed to revoke signature.', 'error');
      }
    } catch (err: any) {
      showInline('An error occurred during revocation.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Hardware Key Subsystem</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Biometric Step-Up Enforcement v6.1</p>
          </div>
        </div>
        
        <button 
          onClick={generatePasskey}
          disabled={registering}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] disabled:opacity-50"
        >
          {registering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Register Key</span>
        </button>
      </div>

      <AnimatePresence>
        {inlineStatus && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              inlineStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <span className="text-xs font-bold uppercase tracking-widest">{inlineStatus.message}</span>
              <button onClick={() => setInlineStatus(null)}>&times;</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex justify-center"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : passkeys.length === 0 ? (
          <div className="p-12 bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center text-center">
            <Fingerprint className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 font-medium">No hardware signatures detected.<br/>Enroll a passkey to enable administrative access.</p>
          </div>
        ) : (
          passkeys.map(pk => (
            <motion.div 
              key={pk.id} 
              layout
              className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-3 shadow-inner">
                      {pk.logo ? (
                        <img src={pk.logo} alt="" className="w-full h-full object-contain filter grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                      ) : (
                        <Key className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-black text-lg">{pk.name}</h4>
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-tighter rounded border border-blue-500/20">
                          {pk.securityLevel?.includes('SE') ? 'FIDO2 L2+' : 'FIDO2 L1'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{pk.manufacturer} • {pk.providerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setExpandedId(expandedId === pk.id ? null : pk.id)}
                      className={`p-2 rounded-lg transition-all ${expandedId === pk.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === pk.id ? (
                      <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-1">
                        <button onClick={() => deletePasskey(pk.id)} className="px-2 py-1 bg-rose-500 text-white text-[9px] font-black rounded uppercase">Revoke</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-slate-400 text-[9px] font-black uppercase">Cancel</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmDeleteId(pk.id)}
                        className="p-2 bg-white/5 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === pk.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <ForensicRow icon={<Clock className="w-3 h-3"/>} label="Registered" value={new Date(pk.createdAt).toLocaleString()} />
                          <ForensicRow icon={<Activity className="w-3 h-3"/>} label="Last Used" value={pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleString() : 'Never'} />
                          <ForensicRow icon={<Shield className="w-3 h-3"/>} label="Security Tier" value={pk.securityLevel || 'Standard'} />
                        </div>
                        <div className="space-y-2">
                          <ForensicRow icon={<Globe className="w-3 h-3"/>} label="Network" value={`${pk.lastUsedIpV4 || pk.lastUsedIp || 'N/A'}`} />
                          <ForensicRow icon={<MapPin className="w-3 h-3"/>} label="Location" value={`${pk.lastUsedCity || 'Unknown'}, ${pk.lastUsedCountry || 'Unknown'}`} />
                          <ForensicRow icon={<Cpu className="w-3 h-3"/>} label="AAGUID" value={pk.aaguid || '00000...'} />
                        </div>
                        <div className="md:col-span-2 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Architecture Snapshot</span>
                           <span className="text-[10px] text-slate-400 font-mono break-all">{pk.lastUsedUa}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const ForensicRow = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center justify-between bg-slate-900/30 px-3 py-2 rounded-xl border border-white/5">
    <div className="flex items-center gap-2">
      <span className="text-blue-400/50">{icon}</span>
      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-[10px] text-slate-300 font-bold">{value}</span>
  </div>
);
