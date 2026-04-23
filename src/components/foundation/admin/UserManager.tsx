// @ts-nocheck
/** @jsxImportSource react */
import React, { useState } from 'react';
import { Shield, User, Key, Trash2, Mail, CheckCircle, XCircle } from 'lucide-react';

/**
 * Foundation User Management (Stable)
 * Standardized interface for administrative user control, Role assignments, and security auditing.
 */
export const UserManager = (props: any) => {
  const { users = [], onUpdate, onDelete } = props;
  const [filter, setFilter] = useState('');

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(filter.toLowerCase()) || 
    u.email?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="gp-user-manager bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            User Access
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage user access and security.</p>
        </div>
        
        <div className="relative">
          <input 
            type="text"
            placeholder="Search users..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:border-cyan-500/50 outline-none w-64 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              <th className="px-8 py-4">User</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4">Roles</th>
              <th className="px-8 py-4">Last Activity</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-900/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm tracking-tight">{user.username}</div>
                      <div className="text-slate-500 text-xs flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  {user.isActive ? (
                    <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                      <XCircle className="w-3 h-3" />
                      Deactivated
                    </span>
                  )}
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-wrap gap-2">
                    {(user.roles || []).map(role => (
                      <span key={role} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[9px] font-bold uppercase tracking-wider">
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-5 text-slate-500 text-xs font-mono">
                  {user.lastLogin || 'Never'}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onUpdate(user.id, { isActive: !user.isActive })}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Toggle Access"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(user.id)}
                      className="p-2 hover:bg-slate-800 rounded-lg text-red-400/50 hover:text-red-400 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="p-4 bg-slate-900/50 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">
          2026 GameProductions™. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
