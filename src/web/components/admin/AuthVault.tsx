import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useToast } from '../../context/ToastContext';

interface PasskeyRecord {
  id: string;
  name: string | null;
  aaguid: string | null;
  created_at: string;
  counter: number;
}

export const AuthVault: React.FC = () => {
  const { showToast, showConfirm } = useToast();
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchPasskeys = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/webauthn/passkeys');
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
      showToast('Requesting hardware challenge from secure enclave...', 'info');

      const genResp = await fetch('/api/admin/webauthn/generate-registration', { method: 'POST' });
      if (!genResp.ok) {
        const data = await genResp.json().catch(() => ({ error: `Server error ${genResp.status}` }));
        throw new Error((data as any).error || 'Failed to generate registration challenge');
      }
      const options = await genResp.json() as any;

      showToast('Hardware interaction required: touch your security key or sensor.', 'info');
      const attResp = await startRegistration({ optionsJSON: options });

      const verifyResp = await fetch('/api/admin/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      });

      if (verifyResp.ok) {
        showToast('Passkey registered and anchored to hardware.', 'success');
        await fetchPasskeys();
      } else {
        const data = await verifyResp.json().catch(() => ({ error: 'Verification failed' }));
        throw new Error((data as any).error || 'Registration verification failed');
      }
    } catch (e: any) {
      showToast(`Authentication Failure: ${e.message || 'Hardware handshake failed.'}`, 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleRename = async (id: string) => {
    try {
      const resp = await fetch(`/api/admin/webauthn/passkeys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      if (resp.ok) {
        showToast('Signature renamed.', 'success');
        setEditingId(null);
        await fetchPasskeys();
      }
    } catch {
      showToast('Failed to rename signature.', 'error');
    }
  };

  const handleRevoke = async (id: string, name: string | null) => {
    const confirmed = await showConfirm(`Revoke passkey "${name || 'Unnamed'}"? This cannot be undone.`, 'Revoke Passkey');
    if (!confirmed) return;
    try {
      const resp = await fetch(`/api/admin/webauthn/passkeys/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        showToast(`Passkey "${name || 'Unnamed'}" revoked.`, 'success');
        await fetchPasskeys();
      }
    } catch {
      showToast('Failed to revoke passkey.', 'error');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl transition-all hover:border-white/20">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span>🛡️</span> Authentication Vault
          </h2>
          <p className="text-white/60 text-sm font-medium leading-relaxed">
            Manage hardware-backed biometric signatures for administrative access.
          </p>
        </div>
        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          {passkeys.length} key{passkeys.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center p-6 text-white/40 text-sm">
            No passkeys registered. Register your first hardware key below.
          </div>
        ) : (
          passkeys.map((pk) => (
            <div key={pk.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-slate-900 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                  🔒
                </div>
                <div>
                  {editingId === pk.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(pk.id)}
                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-400"
                        autoFocus
                      />
                      <button onClick={() => handleRename(pk.id)} className="text-[10px] text-blue-400 font-bold uppercase">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-[10px] text-white/40 font-bold uppercase">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-black text-white uppercase tracking-tight">
                        {pk.name || 'Unnamed Key'}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">
                        {formatDate(pk.created_at)} · Counter: {pk.counter}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => { setEditingId(pk.id); setEditName(pk.name || ''); }}
                  className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:underline"
                >
                  Rename
                </button>
                <button 
                  onClick={() => handleRevoke(pk.id, pk.name)}
                  className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:underline"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))
        )}

        {/* Register Button */}
        <button 
          onClick={handleRegisterPasskey}
          disabled={registering}
          className="w-full mt-4 py-4 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-blue-600/20 hover:shadow-[0_0_30px_0_rgba(59,130,246,0.2)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {registering ? 'Registering...' : 'Register New Passkey'}
        </button>
      </div>
    </div>
  );
};
