/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Fingerprint, Trash2, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl === 'undefined' || !rawApiUrl ? '' : rawApiUrl;


interface Passkey {
  id: string;
  name: string | null;
  aaguid: string | null;
  created_at: string;
  counter: number;
  backedUp?: boolean | number;
  lastUsedAt?: string | null;
}

const AAGUID_MAP: Record<string, string> = {
  'bada5566-a7aa-401f-bd96-45619a55120d': '1Password',
  'd8522d9f-575b-4866-88a9-ba99fa02f35b': '1Password',
  'b9320b1a-0a5c-4a32-b9e4-23ce4bb39f99': '1Password',
  '08987058-cadc-4b81-b6e1-30de50dcbe96': 'Bitwarden',
  '6d44ba9b-f6ec-2e49-b930-0c8fe920cb73': 'Google Password Manager',
  'adce0002-35bc-c60a-648b-0b25f1f05503': 'Chrome Desktop',
  '00000000-0000-0000-0000-000000000000': 'Native iCloud',
  'cb69481e-8ff7-4039-93ec-0a2729a154a8': 'YubiKey',
  'fc2df05a-3cf9-4786-8a0a-ba3f8c8d8b67': 'YubiKey 5',
};

const getServiceName = (aaguid: string | null) => {
  if (!aaguid) return 'Device Native Passkey';
  
  const raw = aaguid.toLowerCase();
  let normalized = raw;
  if (!raw.includes('-') && raw.length === 32) {
    normalized = raw.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  }

  const match = AAGUID_MAP[raw] || AAGUID_MAP[normalized];
  if (match) return match;

  return `Vault / Hardware Key (${normalized})`;
};

export const PasskeyModule = () => {
  const { token } = useAuth();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchPasskeys();
  }, [token]);

  const fetchPasskeys = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/webauthn/passkeys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch passkeys');
      const data = await res.json() as any;
      setPasskeys(data.passkeys || []);
    } catch (err) {
      toast.error('System Interruption: Could not retrieve passkeys from secure enclave.');
    } finally {
      setLoading(false);
    }
  };

  const saveName = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/webauthn/passkeys/${id}`, { 
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName })
      });
      if (!res.ok) throw new Error('Failed to rename parameter');
      
      setPasskeys(p => p.map(k => k.id === id ? { ...k, name: editName } : k));
      setEditingId(null);
      toast.success('Binding Customized: The cryptographic hardware tag was updated.');
    } catch (err) {
      toast.error('Rename Failed: System disconnected while relabeling the hardware binding.');
    }
  };

  const deletePasskey = async (id: string) => {
    if (!confirm('Are you strictly sure you want to revoke this biometric signature? If this is your last passkey, you will trigger a hard 403 lock out on next authentication until manually bypassed by Discord!')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/auth/webauthn/passkeys/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to revoke passkey');
      
      setPasskeys(p => p.filter(k => k.id !== id));
      toast.success('Revocation Successful: The selected biometric signature has been burned.');
    } catch (err) {
      toast.error('Revocation Failed: Failed to burn the signature. Database may be constrained.');
    }
  };

  const generatePasskey = async () => {
    setRegistering(true);
    try {
      // 1. Get Challenge
      const challengeRes = await fetch(`${API_URL}/api/auth/webauthn/generate-registration`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const options = await challengeRes.json() as any;

      if (!challengeRes.ok) {
        throw new Error(options.error || 'Challenge generation failed');
      }

      // 2. Invoke Biometric Hardware
      const attResp = await startRegistration({ optionsJSON: options });

      // 3. Verify Hardware Response
      const verifyRes = await fetch(`${API_URL}/api/auth/webauthn/verify-registration`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attResp),
      });

      if (!verifyRes.ok) {
        let errMsg = 'Hardware verification rejected by the edge router.';
        try {
          const bodyJson = await verifyRes.json() as any;
          if (bodyJson.error) errMsg = bodyJson.error;
        } catch(e) {}
        throw new Error(errMsg);
      }

      toast.success('Enclave Updated: Successfully attached new hardware signature to your God Mode identity.');
      fetchPasskeys(); // Refresh the list
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Hardware Bypass: The registration flow was interrupted or denied.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <>
      <div className="mb-8 space-y-2">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-3"
        >
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
             <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Security & Cryptography</span>
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
                             <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group-hover:bg-blue-500/10 transition-colors">
                                <Key className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                             </div>
                             <div>
                                {editingId === pk.id ? (
                                  <div className="flex items-center gap-2 mb-1">
                                    <input 
                                      type="text" 
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveName(pk.id);
                                        if (e.key === 'Escape') setEditingId(null);
                                      }}
                                      autoFocus
                                      className="bg-slate-900 border border-blue-500 outline-none text-white text-sm font-black px-2 py-1 rounded"
                                    />
                                    <button onClick={() => saveName(pk.id)} className="text-xs font-bold text-blue-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 px-2 py-1 rounded">Save</button>
                                  </div>
                                ) : (
                                  <h4 
                                    className="text-sm font-black text-white hover:text-blue-400 cursor-pointer transition-colors"
                                    onClick={() => {
                                      setEditingId(pk.id);
                                      setEditName(pk.name || '');
                                    }}
                                  >
                                    {pk.name || pk.id.split('-').pop()?.toUpperCase() || pk.id}
                                  </h4>
                                )}
                                <div className="flex items-center flex-wrap gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                   <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${pk.backedUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/50 text-blue-400'}`}>
                                      {pk.backedUp && <RefreshCw className="w-3 h-3" />}
                                      {pk.backedUp ? 'Synced Provider' : 'Hardware-Bound'}
                                   </div>
                                   <span>•</span>
                                   <span className="px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-300">{getServiceName(pk.aaguid)}</span>
                                   <span>•</span>
                                   <span>Uses: {pk.counter}</span>
                                   <span>•</span>
                                   <span>Added: {new Date(pk.created_at).toLocaleDateString()}</span>
                                   {pk.lastUsedAt && (
                                     <>
                                       <span>•</span>
                                       <span className="text-blue-400">Used: {new Date(pk.lastUsedAt).toLocaleDateString()}</span>
                                     </>
                                   )}
                                </div>
                             </div>
                          </div>
                          
                          <button 
                            onClick={() => deletePasskey(pk.id)}
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
    </>
  );
};
