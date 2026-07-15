import React, { useState, useEffect, useRef } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import {
  Fingerprint,
  Key,
  Plus,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Globe,
  Clock,
  Cpu,
  Activity,
  MapPin,
  Shield,
  ExternalLink,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { secureRequest } from '../utils/api';
import { Card } from './ui/Card';

// ─── Provider Logo ──────────────────────────────────────────────────────────
const ProviderLogo = ({ logo, color, service }: { logo?: string; color?: string; service?: string }) => {
  const [imgError, setImgError] = useState(false);
  const bg = color ? `#${color}18` : 'rgba(99,102,241,0.1)';
  const border = color ? `#${color}40` : 'rgba(99,102,241,0.25)';
  const text = color ? `#${color}` : '#6366F1';

  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
      style={{ background: bg, border: `1.5px solid ${border}` }}
    >
      {logo && !imgError ? (
        <img
          src={logo}
          alt={service || 'Provider'}
          className="w-9 h-9 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-xl font-black" style={{ color: text }}>
          {(service || 'K').charAt(0)}
        </span>
      )}
    </div>
  );
};

// ─── Inline Editable Name ───────────────────────────────────────────────────
const InlineName = ({
  id,
  name,
  onSave,
}: {
  id: string;
  name: string;
  onSave: (id: string, name: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(name); }, [name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    if (!value.trim() || value === name) { setEditing(false); setValue(name); return; }
    setSaving(true);
    await onSave(id, value.trim());
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => { setEditing(false); setValue(name); };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          onBlur={save}
          className="bg-white/5 border border-blue-500/40 rounded-lg px-3 py-1.5 text-white text-base font-black focus:outline-none focus:border-blue-400 w-48"
          maxLength={64}
        />
        {saving ? (
          <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
        ) : (
          <>
            <button onMouseDown={save} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
            <button onMouseDown={cancel} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left hover:text-blue-300 transition-colors"
      title="Click to rename"
    >
      <span className="text-white font-black text-lg group-hover:text-blue-300 transition-colors">{name}</span>
      <Pencil className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
    </button>
  );
};

// ─── Forensic Detail Row ────────────────────────────────────────────────────
const ForensicRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between bg-slate-900/30 px-3 py-2 rounded-xl border border-white/5">
    <div className="flex items-center gap-2">
      <span className="text-blue-400/50">{icon}</span>
      <span className="text-[9px] font-black text-slate-600 tracking-widest">{label}</span>
    </div>
    <span className="text-[10px] text-slate-300 font-bold">{value}</span>
  </div>
);

// ─── FIDO2 Level Badge ──────────────────────────────────────────────────────
const FidoBadge = ({ level }: { level?: string }) => {
  const isL2 = level?.includes('SE') || level?.includes('TPM') || level?.includes('Secure Element') || level?.includes('Enclave');
  return (
    <span className={`px-2 py-0.5 text-[8px] font-black tracking-tighter rounded border ${ isL2 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-700/40 text-slate-500 border-slate-600/20' }`}>
      {isL2 ? 'FIDO2 L2' : 'FIDO2 L1'}
    </span>
  );
};

// ─── Service Badge ──────────────────────────────────────────────────────────
const ServiceBadge = ({ service, color }: { service?: string; color?: string }) => {
  if (!service) return null;
  const bg = color ? `#${color}18` : 'rgba(99,102,241,0.1)';
  const border = color ? `#${color}35` : 'rgba(99,102,241,0.2)';
  const fg = color ? `#${color}CC` : '#818CF8';
  return (
    <span
      className="px-2 py-0.5 text-[9px] font-black tracking-widest rounded-full border"
      style={{ background: bg, borderColor: border, color: fg }}
    >
      {service}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const PasskeyModule = () => {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [inlineStatus, setInlineStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  const showInline = (message: string, type: 'success' | 'error') => {
    setInlineStatus({ message, type });
    setTimeout(() => setInlineStatus(null), 5000);
  };

  const fetchPasskeys = async () => {
    try {
      const res = await secureRequest('/api/admin/webauthn/passkeys') as any;
      if (res.ok) {
        const data = await res.json() as any;
        setPasskeys(data.passkeys || []);
      }
    } catch (err) {
      console.error('Failed to fetch passkeys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPasskeys(); }, []);

  // Register a new passkey — no prompt, auto-named server-side
  const generatePasskey = async () => {
    setRegistering(true);
    try {
      const optionsRes = await secureRequest('/api/admin/webauthn/generate-registration', { method: 'POST' }) as any;
      const options = await optionsRes.json() as any;
      const regResp = await startRegistration({ optionsJSON: options }) as any;

      const verifyRes = await secureRequest('/api/admin/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestation: regResp }),
      }) as any;

      const verification = await verifyRes.json() as any;
      if (verification.verified) {
        showInline('Hardware signature verified and linked.', 'success');
        await fetchPasskeys();
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

  // Inline rename via PUT /api/admin/webauthn/passkeys/:id
  const renamePasskey = async (id: string, name: string) => {
    try {
      const res = await secureRequest(`/api/admin/webauthn/passkeys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }) as any;
      if (res.ok) {
        setPasskeys(prev => prev.map(pk => pk.id === id ? { ...pk, name } : pk));
        showToast('Passkey renamed.', 'success');
      } else {
        showToast('Failed to rename passkey.', 'error');
      }
    } catch {
      showToast('An error occurred.', 'error');
    }
  };

  const deletePasskey = async (id: string) => {
    try {
      const res = await secureRequest(`/api/admin/webauthn/passkeys/${id}`, { method: 'DELETE' }) as any;
      if (res.ok) {
        showInline('Hardware signature revoked.', 'success');
        setConfirmDeleteId(null);
        setPasskeys(prev => prev.filter(pk => pk.id !== id));
        refreshProfile();
      } else {
        showInline('Failed to revoke signature.', 'error');
      }
    } catch {
      showInline('An error occurred during revocation.', 'error');
    }
  };

  return (
    <Card className="bg-[#121212] border-white/5 overflow-hidden">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Passkeys</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Use your fingerprint, face, or security key to sign in quickly and securely
            </p>
          </div>
        </div>

        <button
          onClick={generatePasskey}
          disabled={registering}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] disabled:opacity-50"
        >
          {registering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Register Key</span>
        </button>
      </div>

      {/* Inline status */}
      <AnimatePresence>
        {inlineStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              inlineStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <span className="text-xs font-bold tracking-widest">{inlineStatus.message}</span>
              <button onClick={() => setInlineStatus(null)}>×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passkey list */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex justify-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : passkeys.length === 0 ? (
          <div className="p-12 bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center text-center">
            <Fingerprint className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 font-medium">
              No hardware signatures detected.<br />
              Enroll a passkey to enable administrative access.
            </p>
          </div>
        ) : (
          passkeys.map(pk => (
            <motion.div
              key={pk.id}
              layout
              className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors"
            >
              <div className="p-6">
                {/* Card header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <ProviderLogo logo={pk.logo} color={pk.color} service={pk.service} />

                    <div className="min-w-0">
                      {/* Name (inline editable) + badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <InlineName id={pk.id} name={pk.name} onSave={renamePasskey} />
                        <ServiceBadge service={pk.service} color={pk.color} />
                        <FidoBadge level={pk.securityLevel} />
                      </div>

                      {/* Provider name + manufacturer */}
                      <p className="text-[10px] text-slate-500 font-bold tracking-[0.15em]">
                        {pk.providerName}
                        {pk.manufacturer && pk.manufacturer !== 'Unknown' && pk.manufacturer !== 'Unknown Manufacturer'
                          ? ` · ${pk.manufacturer}`
                          : ''}
                      </p>

                      {/* Security level */}
                      <p className="text-[9px] text-slate-600 mt-0.5 font-medium">
                        {pk.securityLevel}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(expandedId === pk.id ? null : pk.id)}
                      className={`p-2 rounded-lg transition-all ${
                        expandedId === pk.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-white/5 text-slate-500 hover:text-white'
                      }`}
                      title="Details"
                    >
                      <Activity className="w-4 h-4" />
                    </button>

                    {confirmDeleteId === pk.id ? (
                      <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-1">
                        <button
                          onClick={() => deletePasskey(pk.id)}
                          className="px-2 py-1 bg-rose-500 text-white text-[9px] font-black rounded"
                        >
                          Revoke
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-slate-400 text-[9px] font-black"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(pk.id)}
                        className="p-2 bg-white/5 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                        title="Revoke"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedId === pk.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-5 mt-5 border-t border-white/5 space-y-4">

                        {/* Provider profile card */}
                        <div
                          className="rounded-2xl p-4 border flex items-start gap-4"
                          style={{
                            background: pk.color ? `#${pk.color}0A` : 'rgba(99,102,241,0.05)',
                            borderColor: pk.color ? `#${pk.color}25` : 'rgba(99,102,241,0.15)',
                          }}
                        >
                          <ProviderLogo logo={pk.logo} color={pk.color} service={pk.service} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-white font-black text-sm">{pk.providerName}</span>
                              <ServiceBadge service={pk.service} color={pk.color} />
                            </div>
                            {pk.manufacturer && pk.manufacturer !== 'Unknown' && (
                              <p className="text-[10px] text-slate-500 tracking-widest font-bold mb-2">
                                {pk.manufacturer}
                              </p>
                            )}
                            {pk.description && (
                              <p className="text-xs text-slate-400 leading-relaxed mb-2">{pk.description}</p>
                            )}
                            {pk.website && (
                              <a
                                href={pk.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest transition-colors"
                                style={{ color: pk.color ? `#${pk.color}` : '#818CF8' }}
                              >
                                Learn More <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Forensic grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <ForensicRow icon={<Clock className="w-3 h-3" />} label="Registered" value={new Date(pk.createdAt).toLocaleString()} />
                            <ForensicRow icon={<Activity className="w-3 h-3" />} label="Last Used" value={pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleString() : 'Never'} />
                            <ForensicRow icon={<Shield className="w-3 h-3" />} label="Security Tier" value={pk.securityLevel || 'Standard'} />
                          </div>
                          <div className="space-y-2">
                            <ForensicRow icon={<Globe className="w-3 h-3" />} label="Network" value={pk.lastUsedIpV4 || pk.lastUsedIp || 'N/A'} />
                            <ForensicRow icon={<MapPin className="w-3 h-3" />} label="Location" value={`${pk.lastUsedCity || 'Unknown'}, ${pk.lastUsedCountry || 'Unknown'}`} />
                            <ForensicRow icon={<Cpu className="w-3 h-3" />} label="AAGUID" value={pk.aaguid ? `${pk.aaguid.slice(0, 18)}…` : '—'} />
                          </div>

                          {pk.lastUsedUa && (
                            <div className="md:col-span-2 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                              <span className="text-[9px] font-black text-slate-600 tracking-widest block mb-1">
                                Architecture Snapshot
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono break-all">{pk.lastUsedUa}</span>
                            </div>
                          )}
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
    </Card>
  );
};
