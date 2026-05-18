import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useToast } from '../../context/ToastContext';
import { 
  Fingerprint, 
  Key, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Activity, 
  Globe, 
  MapPin, 
  Clock, 
  Shield, 
  Cpu,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineToast } from '../ui/InlineToast';

interface PasskeyRecord {
  id: string;
  name: string | null;
  aaguid: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  counter: number;
  manufacturer: string | null;
  securityLevel: string | null;
  logo: string | null;
  providerName: string | null;
  lastUsedIpV4: string | null;
  lastUsedIpV6: string | null;
  lastUsedCity: string | null;
  lastUsedCountry: string | null;
  lastUsedUa: string | null;
}

export const AuthVault: React.FC = () => {
  const { showToast } = useToast();
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const fetchPasskeys = useCallback(async () => {
    try {
      const resp = (await fetch('/api/admin/webauthn/passkeys') as any);
      if (!resp.ok) return;
      const data = await resp.json() as any;
      setPasskeys(data.passkeys || []);
    } catch {
      // silent fail on load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    try {
      const genResp = (await fetch('/api/admin/webauthn/generate-registration', { method: 'POST' }) as any);
      if (!genResp.ok) throw new Error('Failed to generate challenge');
      const options = await genResp.json() as any;

      showToast('Hardware interaction required: touch your security key.', 'info');
      const attResp = (await startRegistration({ optionsJSON: options }) as any);

      const name = prompt('Label this hardware key:', 'Primary Admin Key');
      if (!name) return;

      const verifyResp = (await fetch('/api/admin/webauthn/verify-registration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ attestation: attResp, name }),
            }) as any);

      if (verifyResp.ok) {
        showToast('Administrative passkey anchored to hardware.', 'success');
        await fetchPasskeys();
      } else {
        throw new Error('Verification failed');
      }
    } catch (e: any) {
      showToast(`Authentication Failure: ${e.message}`, 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const resp = (await fetch(`/api/admin/webauthn/passkeys/${id}`, { method: 'DELETE' }) as any);
      if (resp.ok) {
        showToast(`Passkey revoked.`, 'success');
        setConfirmRevokeId(null);
        await fetchPasskeys();
      }
    } catch {
      showToast('Failed to revoke passkey.', 'error');
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Authentication Vault</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Fleet Security Standard v6.1 • Biometric Isolation</p>
            </div>
          </div>
          <button 
            onClick={handleRegisterPasskey}
            disabled={registering}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
          >
            {registering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Register Key</span>
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div>
          ) : passkeys.length === 0 ? (
            <div className="text-center p-12 bg-slate-950/50 rounded-3xl border border-white/5 border-dashed">
              <Fingerprint className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 text-sm font-medium">No hardware signatures detected in vault.</p>
            </div>
          ) : (
            passkeys.map((pk) => (
              <div key={pk.id} className="bg-slate-950/60 border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/20 transition-all group">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2.5 shadow-inner">
                      {pk.logo ? (
                        <img src={pk.logo} alt="" className="w-full h-full object-contain filter grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                      ) : (
                        <Key className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-black text-sm uppercase tracking-tight">{pk.name || 'Unnamed Signature'}</h4>
                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[7px] font-black uppercase tracking-tighter rounded border border-blue-500/20">
                          {pk.securityLevel?.includes('SE') ? 'FIDO2 L2+' : 'FIDO2 L1'}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{pk.manufacturer || 'Generic'} • {pk.providerName || 'Authenticator'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setExpandedId(expandedId === pk.id ? null : pk.id)}
                      className={`p-2 rounded-lg transition-all ${expandedId === pk.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-600 hover:text-white'}`}
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    {confirmRevokeId === pk.id ? (
                      <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-1">
                        <button onClick={() => handleRevoke(pk.id)} className="px-2 py-1 bg-rose-500 text-white text-[8px] font-black rounded uppercase">Revoke</button>
                        <button onClick={() => setConfirmRevokeId(null)} className="px-2 py-1 text-slate-500 text-[8px] font-black uppercase">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRevokeId(pk.id)} className="p-2 bg-white/5 text-slate-600 hover:text-rose-400 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === pk.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-5 pt-0 border-t border-white/5 bg-blue-500/[0.02] grid grid-cols-1 md:grid-cols-2 gap-3">
                        <AuditItem icon={<Clock />} label="Created" value={new Date(pk.createdAt).toLocaleString()} />
                        <AuditItem icon={<Activity />} label="Counter" value={pk.counter.toString()} />
                        <AuditItem icon={<Globe />} label="Network" value={pk.lastUsedIpV4 || pk.lastUsedIpV6 || 'Unknown'} />
                        <AuditItem icon={<MapPin />} label="Location" value={`${pk.lastUsedCity || 'Unknown City'}, ${pk.lastUsedCountry || 'Unknown'}`} />
                        <div className="md:col-span-2 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <Shield className="w-3 h-3" /> Forensics Descriptor
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono break-all">{pk.lastUsedUa || 'N/A'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const AuditItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="bg-slate-900/50 p-2.5 rounded-2xl border border-white/5 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-blue-500/40 w-3 h-3 flex items-center justify-center">{icon}</span>
      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-[10px] text-slate-300 font-bold font-mono">{value}</span>
  </div>
);
