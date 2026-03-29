import React, { useState } from 'react';
import Papa from 'papaparse';
import { 
  FileCheck, 
  AlertTriangle, 
  Trash2, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  Building 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ImportReviewProps {
  onImportComplete: () => void;
  scope: 'household' | 'private';
}

const ImportReview: React.FC<ImportReviewProps> = ({ onImportComplete, scope }) => {
  const [file, setFile] = useState<File | null>(null);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const { showToast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    
    const analyzeData = async (rows: any[]) => {
      // Mock analysis for now - typically sends to /api/data/analyze
      setReviewItems(rows.slice(0, 100).map((r, i) => ({
        id: `rev-${i}`,
        description: r.Description || r.merchant || r.Name || 'Unknown Transaction',
        amount: parseFloat(r.Amount || r.amount || '0'),
        date: r.Date || r.date || new Date().toISOString().split('T')[0],
        category: r.Category || 'Uncategorized'
      })));
    };

    if (file.name.endsWith('.pdf')) {
       // PDF Simulation: In a real app, use pdfjs-dist here
       showToast('Extracting text from statement...', 'info');
       setTimeout(() => {
          analyzeData([{ Description: 'Mock PDF Transaction', Amount: '125.50', Date: '2026-03-25' }]);
          setAnalyzing(false);
       }, 1500);
       return;
    }

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        analyzeData(results.data);
        setAnalyzing(false);
      }
    });
  };

  const handleCommit = async () => {
    if (reviewItems.length === 0) return;
    setCommitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data/import/confirm`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
        },
        body: JSON.stringify({ 
           type: 'transactions',
           scope, 
           data: reviewItems 
        })
      });
      if (res.ok) {
        showToast(`Successfully imported to ${scope === 'household' ? 'Shared Ledger' : 'Personal Hub'}`, 'success');
        onImportComplete();
        setReviewItems([]);
        setFile(null);
      }
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {!file && (
        <label className="block border-2 border-dashed border-white/10 rounded-[2.5rem] p-20 text-center hover:border-emerald-500/50 transition-all cursor-pointer group bg-black/20">
          <input type="file" accept=".csv,.qif,.ofx,.pdf" onChange={handleFileUpload} className="hidden" />
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform text-4xl">📄</div>
          <p className="font-extrabold text-2xl mb-2 text-white italic tracking-tighter uppercase">Drop Records Here</p>
          <p className="text-xs text-slate-500 font-black uppercase tracking-[0.3em]">CSV • QIF • OFX • PDF</p>
        </label>
      )}

      {file && reviewItems.length === 0 && (
        <div className="p-12 text-center rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/20 shadow-inner">
             <FileCheck size={32} />
          </div>
          <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">{file.name}</h4>
          <p className="text-xs text-emerald-500/60 font-black uppercase tracking-widest mb-8">File detected and ready for review</p>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="px-10 py-4 bg-emerald-500 text-black font-black uppercase text-sm rounded-2xl hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
            >
              {analyzing ? 'Scanning Records...' : 'Start Review'}
            </button>
            <button onClick={() => setFile(null)} className="px-10 py-4 bg-white/5 text-white font-black uppercase text-sm rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
          </div>
        </div>
      )}

      {reviewItems.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <ShieldCheck size={20} />
                </div>
                <div>
                   <p className="font-black text-sm uppercase italic tracking-tight">{reviewItems.length} Records Detected</p>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Target: {scope === 'household' ? 'Shared Ledger' : 'Personal Hub'}</p>
                </div>
             </div>
             <button 
               onClick={handleCommit}
               disabled={committing}
               className="px-8 py-3 bg-emerald-500 text-black font-black text-xs uppercase rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
             >
               {committing ? 'Saving...' : 'Finish Import'}
             </button>
          </div>

          <div className="rounded-[2.5rem] border border-white/5 bg-black/40 overflow-hidden shadow-2xl">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Details</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Amount</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reviewItems.map((item) => (
                      <tr key={item.id} className="group hover:bg-white/5 transition-all">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-slate-600 group-hover:text-emerald-500 transition-all">
                                 <Building size={14} />
                              </div>
                              <div>
                                 <p className="font-bold text-sm tracking-tight text-white">{item.description}</p>
                                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{item.category}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <span className="font-black text-sm italic tracking-tighter text-emerald-400">${Math.abs(item.amount).toFixed(2)}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <span className="text-xs text-slate-500 font-bold tracking-tight">{item.date}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportReview;
