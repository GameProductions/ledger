import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Cloud, Download, Upload, Shield } from 'lucide-react';

const BackupHub: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCloudBackup = async (provider: string) => {
    setLoading(provider);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/backup/cloud/${provider}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(`Master Backup successfully synced to ${provider}`, 'success');
    } catch (e: any) {
      showToast(`Cloud Backup failed: ${e.message}`, 'error');
    } finally {
      setLoading(null);
    }
  };

  const downloadLocalBackup = async () => {
    setLoading('local');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/backup/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger_master_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showToast('Local Master Backup generated', 'success');
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading('restore');
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/backup/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(backup)
      });
      
      if (!res.ok) throw new Error(await res.text());
      showToast('Master Restore complete. Data has been synchronized.', 'success');
      window.location.reload();
    } catch (e: any) {
      showToast(`Restore failed: ${e.message}`, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        <header>
          <div className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-2">Security & Recovery</div>
          <h1 className="text-4xl font-black italic tracking-tighter">Backup Hub</h1>
          <p className="text-secondary font-medium">Strategic data preservation and multi-cloud redundancy.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Local Sovereignty */}
           <Card className="p-8 space-y-8 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><Download /></div>
                <div>
                  <h2 className="text-xl font-bold">Local Sovereignty</h2>
                  <p className="text-sm text-secondary">Export your entire ledger as a portable JSON file.</p>
                </div>
              </div>
              <button 
                onClick={downloadLocalBackup}
                disabled={!!loading}
                className="w-full py-4 bg-primary text-black font-black uppercase rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {loading === 'local' ? 'Generating Backup...' : 'Download Master Backup'}
              </button>
           </Card>

           {/* Cloud Redundancy */}
           <div className="space-y-4">
              {[
                { id: 'google', name: 'Google Drive', icon: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png' },
                { id: 'dropbox', name: 'Dropbox', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111381.png' },
                { id: 'onedrive', name: 'OneDrive', icon: 'https://cdn-icons-png.flaticon.com/512/888/888874.png' }
              ].map(provider => (
                <div key={provider.id} className="card p-6 flex items-center justify-between group hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-4">
                    <img src={provider.icon} className="w-8 h-8" alt={provider.name} />
                    <div>
                      <p className="font-bold text-sm">{provider.name}</p>
                      <p className="text-xs text-secondary font-black uppercase tracking-widest opacity-50 italic">Cloud Recovery Point</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCloudBackup(provider.id)}
                    disabled={!!loading}
                    className="p-3 rounded-xl bg-white/5 hover:bg-primary hover:text-black transition-all"
                  >
                    {loading === provider.id ? '...' : <Cloud size={18} />}
                  </button>
                </div>
              ))}
           </div>
        </div>

        <section className="card p-12 text-center bg-white/5 border-white/5">
           <div className="inline-flex p-4 rounded-full bg-blue-500/10 text-blue-400 mb-6"><Shield size={32} /></div>
           <h3 className="text-2xl font-black mb-4 italic uppercase tracking-tighter">Disaster Recovery Interface</h3>
           <p className="text-secondary text-sm max-w-xl mx-auto mb-8">
             Restoration is an atomic operation. Uploading a master backup will merge new data and categories into your current household. Existing transaction IDs will be preserved to prevent duplicates.
           </p>
           <input 
             type="file" 
             id="restore-upload" 
             className="hidden" 
             accept=".json"
             onChange={handleRestore}
           />
           <button 
             disabled={!!loading}
             onClick={() => document.getElementById('restore-upload')?.click()}
             className="flex items-center gap-3 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-black uppercase tracking-widest mx-auto transition-all"
           >
             <Upload size={16} />
             {loading === 'restore' ? 'Restoring Core...' : 'Restore from Backup'}
           </button>
        </section>
      </div>
    </MainLayout>
  );
};

export default BackupHub;
