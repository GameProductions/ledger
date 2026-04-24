import React, { useEffect, useState } from 'react';
import { Shield, Smartphone, Monitor, Trash2, ShieldAlert } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';

interface Session {
  id: string;
  device_name: string;
  os: string;
  browser: string;
  ip_address: string;
  last_active_at: string;
}

export function SecurityDashboard() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const apiUrl = (getApiUrl() || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/user/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (e) {
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
      const res = await fetch(`${apiUrl}/api/user/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(s => s.filter(x => x.id !== id));
        showToast('Session revoked successfully', 'success');
      } else {
        showToast('Failed to revoke session', 'error');
      }
    } catch (e) {
      showToast('Error revoking session', 'error');
    }
  };

  if (loading) return <div className="text-gray-400 p-8">Loading Security Details...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-[#121212] border-white/5" title="Active Device Sessions" subtitle="Manage and revoke unauthorized logins across your network.">
          
        
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
                    <h3 className="text-slate-200 font-semibold flex items-center gap-2">
                      {s.device_name} ({s.browser})
                      {idx === 0 && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider bg-emerald-500/20 text-emerald-400">Current</span>}
                    </h3>
                    <p className="text-sm text-gray-400">IP: {s.ip_address} • Last Active: {new Date(s.last_active_at).toLocaleString()}</p>
                  </div>
                </div>
                {idx !== 0 && (
                  <Button 
                    variant="glass" 
                    size="sm" 
                    onClick={() => revokeSession(s.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Revoke
                  </Button>
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
