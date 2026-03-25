import React, { useState } from 'react';
import Papa from 'papaparse';

interface ImportSandboxProps {
  onImportComplete: () => void;
}

const ImportSandbox: React.FC<ImportSandboxProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [staging, setStaging] = useState(false);
  const [activeSandbox, setActiveSandbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const parseLegacyFormat = (text: string, type: 'qif' | 'ofx'): any[] => {
    const rows: any[] = [];
    if (type === 'qif') {
      const entries = text.split('^');
      entries.forEach(entry => {
        const row: any = {};
        const lines = entry.split('\n');
        lines.forEach(line => {
          if (line.startsWith('D')) row.Date = line.substring(1).trim();
          if (line.startsWith('T')) row.Amount = line.substring(1).trim();
          if (line.startsWith('P')) row.Description = line.substring(1).trim();
        });
        if (row.Date && row.Amount) rows.push(row);
      });
    } else if (type === 'ofx') {
      const matches = text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g);
      for (const match of matches) {
        const content = match[1];
        const row: any = {};
        row.Date = content.match(/<DTPOSTED>(.*?)(\r|\n|<|$)/)?.[1]?.trim() || '';
        row.Amount = content.match(/<TRNAMT>(.*?)(\r|\n|<|$)/)?.[1]?.trim() || '';
        row.Description = content.match(/<NAME>(.*?)(\r|\n|<|$)/)?.[1]?.trim() || '';
        if (row.Date && row.Amount) rows.push(row);
      }
    }
    return rows;
  };

  const handleStage = async () => {
    if (!file) return;
    setStaging(true);
    
    const sendToSandbox = async (rows: any[]) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sandbox/stage`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
        },
        body: JSON.stringify({ filename: file.name, rows })
      });
      return await res.json();
    };

    if (file.name.endsWith('.qif') || file.name.endsWith('.ofx')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const rows = parseLegacyFormat(text, file.name.endsWith('.qif') ? 'qif' : 'ofx');
        await sendToSandbox(rows);
        fetchSandbox();
        setStaging(false);
      };
      reader.readAsText(file);
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          await sendToSandbox(results.data);
          fetchSandbox();
        } catch (err) {
          console.error('Staging failed:', err);
        } finally {
          setStaging(false);
        }
      }
    });
  };

  const fetchSandbox = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sandbox`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ledger_token')}` }
      });
      const data = await res.json();
      setActiveSandbox(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (activeSandbox.length === 0) return;
    setLoading(true);
    try {
      const ids = activeSandbox.map(r => r.id);
      await fetch(`${import.meta.env.VITE_API_URL}/api/sandbox/commit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
        },
        body: JSON.stringify({ ids })
      });
      onImportComplete();
      setActiveSandbox([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl">📥</div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest text-emerald-500">Universal Importer</h2>
          <p className="text-sm text-secondary">Stage and verify bulk financial data.</p>
        </div>
      </div>

      {!file && activeSandbox.length === 0 && (
        <label className="block border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-emerald-500/50 transition-all cursor-pointer group">
          <input type="file" accept=".csv,.qif,.ofx" onChange={handleFileUpload} className="hidden" />
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
          <p className="font-bold text-lg mb-2">Drop your file here</p>
          <p className="text-xs text-gray-500 font-black uppercase tracking-widest">Supports CSV, QIF, and OFX formats</p>
        </label>
      )}

      {file && activeSandbox.length === 0 && (
        <div className="text-center p-8 border border-emerald-500/30 bg-emerald-500/5 rounded-3xl">
          <p className="font-bold mb-4">File: {file.name}</p>
          <button 
            onClick={handleStage} 
            disabled={staging}
            className="px-8 py-3 bg-emerald-500 text-black font-black uppercase rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50"
          >
            {staging ? 'Staging Logic...' : 'Stage for Review'}
          </button>
        </div>
      )}

      {activeSandbox.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
            <span className="font-black text-xs uppercase tracking-widest text-emerald-500">{activeSandbox.length} Items Staged</span>
            <button 
              onClick={handleCommit}
              disabled={loading}
              className="px-6 py-2 bg-emerald-500 text-black font-black text-xs uppercase rounded-lg hover:bg-emerald-400 transition-all"
            >
              Commit to Ledger
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 border border-white/5 p-4 rounded-2xl bg-black/20">
             {activeSandbox.map((record: any) => (
               <div key={record.id} className="text-[10px] grid grid-cols-3 gap-4 p-2 border-b border-white/5 text-gray-400">
                  <span className="truncate font-bold text-white">{record.raw_data.Description || record.raw_data.merchant}</span>
                  <span className="text-right">${record.raw_data.Amount || record.raw_data.amount}</span>
                  <span className="text-right opacity-50">{record.raw_data.Date || record.raw_data.date}</span>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportSandbox;
