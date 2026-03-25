import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';

const PCCUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/api/pcc/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleUpdateRole = async (id: string, role: string, status: string) => {
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    await fetch(`${apiUrl}/api/pcc/users/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ global_role: role, status })
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, global_role: role, status } : u));
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <PCCPortal activePath="#/system-pcc/users"><div className="animate-pulse">Syncing User Directory...</div></PCCPortal>;

  return (
    <PCCPortal activePath="#/system-pcc/users">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-purple-500/50 underline-offset-8">User Directory</h2>
          <p className="text-sm text-gray-500 mt-2">Manage roles and platform access status.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search email or name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-purple-500/50 transition-all text-sm w-80"
          />
          <span className="absolute left-4 top-3.5 opacity-30">🔍</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
              <th className="px-8 py-5">User</th>
              <th className="px-8 py-5">Global Role</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-8 py-6">
                  <div className="font-bold text-white group-hover:text-purple-400 transition-colors">{u.display_name || 'Anonymous User'}</div>
                  <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                </td>
                <td className="px-8 py-6">
                  <select 
                    value={u.global_role} 
                    onChange={(e) => handleUpdateRole(u.id, e.target.value, u.status)}
                    className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none"
                  >
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                    <option value="super_admin">SUPER ADMIN</option>
                  </select>
                </td>
                <td className="px-8 py-6">
                   <select 
                    value={u.status} 
                    onChange={(e) => handleUpdateRole(u.id, u.global_role, e.target.value)}
                    className={`bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider focus:outline-none ${u.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="text-[10px] font-bold text-gray-400 opacity-60">Last Seen: {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : 'Never'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PCCPortal>
  );
};

export default PCCUsers;
