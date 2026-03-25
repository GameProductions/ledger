import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const PrivacySettings: React.FC = () => {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [shredMonths, setShredMonths] = useState(12);
  const [shredReason, setShredReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/export/full`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger-export-${user?.id}.json`;
      a.click();
      showToast('Data export complete', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShred = async () => {
    if (!shredReason) {
      showToast('Please provide a reason for data shredding', 'error');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/privacy/shred`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ months: shredMonths, reason: shredReason })
      });
      if (res.ok) {
        showToast(`Successfully shredded data older than ${shredMonths} months`, 'success');
        setShowConfirm(false);
        setShredReason('');
      } else {
        throw new Error();
      }
    } catch (e) {
      showToast('Shredding failed', 'error');
    }
  };

  return (
    <div className="space-y-6 reveal">
      <Card className="p-8">
        <h3 className="text-xl font-black mb-2">Data Sovereignty</h3>
        <p className="text-sm text-secondary opacity-60 mb-8 font-medium">Download or permanently erase your financial history from the LEDGER platform.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Export */}
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Portability</div>
            <h4 className="font-bold">Full Data Export</h4>
            <p className="text-xs text-secondary opacity-50">Generate a comprehensive JSON package containing your accounts, transactions, and audit history.</p>
            <Button 
              onClick={handleExport} 
              loading={isExporting}
              className="w-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20"
            >
              Request Export
            </Button>
          </div>

          {/* Shred */}
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-red-500 font-bold">Erasure</div>
            <h4 className="font-bold">Privacy Shredder</h4>
            <p className="text-xs text-secondary opacity-50">Permanently delete historical transactions and scrub associated logs. This action is irreversible.</p>
            
            <div className="flex gap-2">
               {[3, 6, 12, 24].map(m => (
                 <button 
                   key={m}
                   onClick={() => setShredMonths(m)}
                   className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all ${shredMonths === m ? 'bg-red-500 border-red-500 text-white' : 'bg-white/5 border-white/10 text-secondary'}`}
                 >
                   {m}M+
                 </button>
               ))}
            </div>

            <Button 
              onClick={() => setShowConfirm(true)}
              className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
            >
              Open Shredder
            </Button>
          </div>
        </div>
      </Card>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="max-w-md w-full p-8 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <h3 className="text-2xl font-black text-red-500 mb-4">Confirm Shredding</h3>
            <p className="text-sm font-medium mb-6">Are you sure you want to delete all data older than **{shredMonths} months**? This cannot be undone.</p>
            
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-bold text-secondary opacity-50 ml-1">Reason for audit log</label>
                  <input 
                    type="text"
                    value={shredReason}
                    onChange={e => setShredReason(e.target.value)}
                    placeholder="e.g., General Privacy Cleanup"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-500/50 outline-none transition-all"
                  />
               </div>
               
               <div className="flex gap-3 pt-2">
                 <Button onClick={() => setShowConfirm(false)} className="flex-1 bg-white/5 border-white/10">Cancel</Button>
                 <Button onClick={handleShred} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none">Shred Data</Button>
               </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
