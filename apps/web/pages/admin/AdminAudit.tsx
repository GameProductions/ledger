import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { getApiUrl } from '../../utils/api';

const AdminAudit: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/admin/audit`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setLogs(data.data || []);
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  if (loading) return <AdminPortal activePath="#/admin/audit"><div className="animate-pulse">Loading activity history...</div></AdminPortal>;

  return (
    <AdminPortal activePath="#/admin/audit">
       <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-cyan-500/50 underline-offset-8">Activity Logs</h2>
          <p className="text-sm text-gray-500 mt-2">Comprehensive ledger of all system-wide administrative and user events.</p>
        </div>
      </div>

      <div className="space-y-3">
        {(logs || []).map(log => {
          const details = typeof log.detailsJson === 'string' ? JSON.parse(log.detailsJson) : (log.detailsJson || {});
          
          // Rule 235: Human Readable Descriptions
          const renderDescription = () => {
            switch(log.action) {
              case 'TOGGLE_FEATURE':
                return `Changed visibility of ${log.targetName || 'feature'} to ${details.enabled ? 'Enabled' : 'Disabled'}`;
              case 'UPDATE_CONFIG':
                return `Updated system configuration ${details.key} to value "${details.value}"`;
              case 'PASSKEY_REGISTRATION':
                return `Registered new biometric passkey: ${details.credentialName || 'Unnamed'}`;
              case 'TOTP_ENABLED':
                return `Activated multi-factor authentication (TOTP)`;
              case 'HOUSEHOLD_INVITE':
                return `Sent household invitation to ${details.email}`;
              case 'ADMIN_LOGIN':
                return `Administrative session established`;
              case 'USER_LOGIN':
                return `User session established`;
              default:
                return log.description || `Performed action: ${log.action}`;
            }
          };

          return (
            <div key={log.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all group reveal">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${
                  log.action.includes('LOGIN') ? 'bg-emerald-500/10 text-emerald-400' : 
                  log.action.includes('ADMIN') ? 'bg-orange-500/10 text-orange-400' : 'bg-cyan-500/10 text-cyan-400'
                }`}>
                  {log.action.includes('LOGIN') ? '🔐' : log.action.includes('ADMIN') ? '⚡' : '📝'}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary opacity-40">{log.action}</span>
                    <span className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-white mb-1 leading-relaxed">
                    {renderDescription()}
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Actor:</span>
                      <span className="text-xs font-bold text-emerald-400">{log.actorName || 'System'}</span>
                    </div>
                    
                    {/* Rule 234: Forensic Labeling Protocol */}
                    <div className="flex items-center gap-3">
                      {log.ipV4 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">IPv4:</span>
                          <span className="text-xs font-mono text-secondary">{log.ipV4}</span>
                        </div>
                      )}
                      {log.ipV6 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">IPv6:</span>
                          <span className="text-xs font-mono text-secondary">{log.ipV6}</span>
                        </div>
                      )}
                    </div>

                    {log.location && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Location:</span>
                        <span className="text-xs font-bold text-blue-400">{log.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Raw details toggle for advanced forensic debugging */}
                  <details className="mt-4">
                    <summary className="text-[9px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:text-white transition-colors outline-none list-none flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      View Raw Forensic Telemetry
                    </summary>
                    <div className="mt-3 p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-gray-500 overflow-x-auto leading-relaxed shadow-inner">
                      {JSON.stringify(details, null, 2)}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminPortal>
  );
};

export default AdminAudit;
