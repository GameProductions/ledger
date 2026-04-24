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
        {(logs || []).map(log => (
          <div key={log.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all flex items-start gap-4">
            <div className={`w-2 h-2 rounded-full mt-2 ${log.action === 'admin_update' || log.action === 'TOGGLE_FEATURE' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-cyan-500'}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black uppercase tracking-widest text-cyan-400">{log.action}</span>
                <span className="text-xs text-gray-500 font-mono tracking-tighter">{new Date(log.createdAt || log.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-300 font-medium">
                Admin: <span className="text-emerald-400">{log.actorName || log.actor_name || 'System'}</span> 
                {' ● '} 
                Target: <span className="text-white">{log.targetName || log.target_name || log.targetType || log.target_type || 'Unknown'}</span> 
                {' - '} 
                ID: <span className="opacity-40 font-mono text-xs">{log.targetId || log.target_id || log.id}</span>
              </p>
              {(log.detailsJson || log.details_json) && (
                <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-gray-500 overflow-x-auto">
                  {JSON.stringify(typeof (log.detailsJson || log.details_json) === 'string' ? JSON.parse(log.detailsJson || log.details_json) : (log.detailsJson || log.details_json), null, 2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminPortal>
  );
};

export default AdminAudit;
