import React, { useState } from 'react';
import { Archive, RefreshCcw, Database } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

interface ArchivedItem {
  id: string;
  type: string; // 'households' | 'accounts' | 'providers' | 'payment_methods'
  name: string;
  deletedAt: string;
}

export function ArchivalVault() {
  const { token } = useAuth();
  const { showToast } = useToast();
  // Using static mapping for demo purposes. Ideally, this hooks into a GET /archived endpoint
  const [archived, setArchived] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const restoreEntity = async (type: string, id: string) => {
    try {
      const apiUrl = getApiUrl().replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/user/households/restore/${type}/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Entity successfully resurrected from Archive', 'success');
        setArchived(a => a.filter(x => x.id !== id));
      } else {
        showToast('Restoration failed', 'error');
      }
    } catch (e) {
      showToast('Restoration error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#121212] border-white/5 relative overflow-hidden" title="Archival Vault" subtitle="Safely restore historically truncated infrastructure and households.">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Database className="w-32 h-32" />
        </div>
        
        
          <div className="divide-y divide-white/5">
             {archived.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Archive className="w-12 h-12 opacity-20 mx-auto mb-4" />
                  <p className="text-lg font-black tracking-widest text-white/20 uppercase">Vault Empty</p>
                  <p className="text-sm mt-1">No archived infrastructures exist within this tier.</p>
                </div>
             ) : (
                (archived || []).map((item: any) => (
                  <div key={item.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider bg-orange-500/20 text-orange-400">
                          {item.type}
                        </span>
                        <h3 className="text-slate-200 font-bold">{item.name}</h3>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">Archived on {item.deletedAt}</p>
                    </div>
                    <Button 
                      variant="glass" 
                      onClick={() => restoreEntity(item.type, item.id)}
                      className="border-white/10 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Restore Node
                    </Button>
                  </div>
                ))
             )}
          </div>
        
      </Card>
    </div>
  );
}
