import React, { useEffect, useState } from 'react';
import { Shield, Smartphone, Monitor, Trash2, ShieldAlert, ShieldOff } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';
import { InlineToast } from './ui/InlineToast';

interface Session {
  id: string;
  deviceName: string;
  os: string;
  browser: string;
  ipAddress: string;
  lastActiveAt: string;
}

export function SecurityDashboard() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const apiUrl = (getApiUrl() || '').replace(/\/$/, '');
      const res = (await fetch(`${apiUrl}/api/user/sessions`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      if (res.ok) {
        const json = (await res.json() as any);
        setSessions(Array.isArray(json.data) ? json.data : []);
      }
    } catch (e: any) {
      console.error('Failed to load sessions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [token]);

  const revokeSession = async (id: string) => {
    try {
      const apiUrl = (getApiUrl() || '').replace(/\/$/, '');
      const res = (await fetch(`${apiUrl}/api/user/sessions/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      if (res.ok) {
        setSessions(s => s.filter(x => x.id !== id));
        showToast('Session revoked successfully', 'success');
        setConfirmRevokeId(null);
      } else {
        showToast('Failed to revoke session', 'error');
      }
    } catch (e: any) {
      showToast('Error revoking session', 'error');
    }
  };

  const revokeAllOtherSessions = async () => {

    setRevokingAll(true);
    try {
      const apiUrl = (getApiUrl() || '').replace(/\/$/, '');
      const res = (await fetch(`${apiUrl}/api/user/sessions`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      if (res.ok) {
        // Keep only the first session (current)
        setSessions(s => s.length > 0 ? [s[0]] : []);
        showToast('All other sessions revoked', 'success');
      } else {
        showToast('Failed to revoke sessions', 'error');
      }
    } catch (e: any) {
      showToast('Error revoking sessions', 'error');
    } finally {
      setRevokingAll(false);
    }
  };

  if (loading) return <div className="text-gray-400 p-8">Loading Security Details...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-[#121212] border-white/5" title="Active Device Sessions" subtitle="Manage and revoke unauthorized logins across your network.">
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[10px] font-black text-slate-500 tracking-widest">Current Session</span>
            </div>
          </div>
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="text-[10px] font-black text-slate-500 hover:text-white tracking-widest flex items-center gap-1.5 transition-colors"
          >
            Security Legend
          </button>
        </div>

        {showLegend && (
          <div className="mx-5 mb-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 text-[9px] font-black tracking-wider">Persistent</span>
                <span className="text-xs font-bold text-slate-200">30 Day Multi-Device Session</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Standard "Remember Me" session. Survives browser restarts and system reboots.</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-500 text-[9px] font-black tracking-wider">Temporary</span>
                <span className="text-xs font-bold text-slate-200">24 Hour Volatile Session</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Single-use secure session. Automatically purged after 24 hours of inactivity.</p>
            </div>
          </div>
        )}

        {sessions.length > 1 && (
          <div className="mx-5 mb-5 p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldOff className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-400">Bulk Session Revocation</p>
                  <p className="text-xs text-red-500/60">Sign out from all other devices immediately. Only your current session will remain active.</p>
                </div>
              </div>
              {confirmRevokeAll ? (
                <InlineToast
                  message="Revoke all other devices?"
                  type="confirm"
                  onConfirm={revokeAllOtherSessions}
                  onCancel={() => setConfirmRevokeAll(false)}
                />
              ) : (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setConfirmRevokeAll(true)}
                  disabled={revokingAll}
                  className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 font-bold shrink-0"
                >
                  {revokingAll ? 'Revoking...' : `Revoke All (${sessions.length - 1})`}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="divide-y divide-white/5">
          {(sessions || []).map((s: any, idx: number) => (
            <div key={s.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  {s.os?.toLowerCase().includes('mac') || s.os?.toLowerCase().includes('windows') ? (
                    <Monitor className="w-6 h-6 text-gray-400" />
                  ) : (
                    <Smartphone className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-slate-200 font-bold">
                      {s.deviceName} ({s.browser})
                    </h3>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        Current
                      </span>
                    )}
                    {s.isPersistent ? (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 text-[9px] font-black tracking-wider">Persistent</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-500 text-[9px] font-black tracking-wider">Temporary</span>
                    )}
                  </div>
                   <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-slate-500 font-medium">
                      {(() => {
                        const ips = [];
                        if (s.ipV4) ips.push({ label: 'IPv4', value: s.ipV4 });
                        if (s.ipV6) ips.push({ label: 'IPv6', value: s.ipV6 });
                        
                        if (ips.length === 0 && s.ipAddress) {
                          ips.push({ 
                            label: s.ipAddress.includes(':') ? 'IPv6' : 'IPv4', 
                            value: s.ipAddress 
                          });
                        }
                        
                        return ips.map((ip, idx) => (
                          <span key={idx} className={idx > 0 ? 'ml-3' : ''}>
                            <span className="text-slate-400 font-black tracking-tighter mr-1">{ip.label}:</span>
                            <span className="font-mono">{ip.value}</span>
                          </span>
                        ));
                      })()}
                    </p>
                    <p className="text-[11px] text-slate-600">Last Active: {new Date(s.lastActiveAt).toLocaleString()} • {s.location || 'Unknown Location'}</p>
                  </div>
                </div>
              </div>
                {idx !== 0 && (
                  <div className="flex items-center">
                    {confirmRevokeId === s.id ? (
                      <InlineToast 
                        message="Revoke session?" 
                        type="confirm" 
                        onConfirm={() => revokeSession(s.id)} 
                        onCancel={() => setConfirmRevokeId(null)} 
                      />
                    ) : (
                      <Button 
                        variant="glass" 
                        size="sm" 
                        onClick={() => setConfirmRevokeId(s.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Revoke
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <ShieldAlert className="w-8 h-8 opacity-20 mx-auto mb-2" />
                No active device history.
              </div>
            )}
          </div>
        
      </Card>
    </div>
  );
}

