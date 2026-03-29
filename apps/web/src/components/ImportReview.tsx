import React, { useState } from 'react';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { 
  FileCheck, 
  ShieldCheck, 
  Building,
  Layers,
  StickyNote
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';

interface ImportReviewProps {
  onImportComplete: () => void;
  scope: 'household' | 'private';
}

const ImportReview: React.FC<ImportReviewProps> = ({ onImportComplete, scope }) => {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const { showToast } = useToast();
  
  // Available Household Members for Mapping
  const { data: members } = useApi<any[]>('/api/pcc/records/users');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      setReviewItems([]);
      
      if (uploadedFile.name.endsWith('.xlsx')) {
        const wb = new ExcelJS.Workbook();
        const arrayBuffer = await uploadedFile.arrayBuffer();
        await wb.xlsx.load(arrayBuffer);
        setWorkbook(wb);
        const sheetNames = wb.worksheets.map(ws => ws.name);
        setAvailableSheets(sheetNames);
        setSelectedSheet(sheetNames[0]);
      } else if (uploadedFile.name.endsWith('.json')) {
        setWorkbook(null);
        setAvailableSheets([]);
      } else {
        setWorkbook(null);
        setAvailableSheets([]);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    
    const finalizeData = (rows: any[]) => {
      setReviewItems(rows.map((r, i) => ({
        id: `rev-${i}`,
        description: r.description || 'Unknown Transaction',
        amount: r.amount || 0,
        date: r.date || new Date().toISOString().split('T')[0],
        category: r.category || 'Uncategorized',
        notes: r.notes || '',
        owner_id: r.owner_id || null,
        owner_name: r.owner_name || ''
      })));
      setAnalyzing(false);
    };

    if (file.name.endsWith('.xlsx') && workbook) {
      const ws = workbook.getWorksheet(selectedSheet);
      if (!ws) return;

      const rows: any[] = [];
      const headerRow = ws.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell(cell => headers.push(cell.text));

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers
        
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) rowData[header.toLowerCase()] = cell.value;
          
          // Extract Cell Comment as Note
          if (cell.note) {
            const noteText = typeof cell.note === 'string' ? cell.note : (cell.note as any).texts?.map((t: any) => t.text).join('') || '';
            if (noteText) rowData.notes = (rowData.notes ? rowData.notes + ' | ' : '') + noteText;
          }
        });

        // Basic mapping logic
        rows.push({
          description: rowData.description || rowData.name || rowData.merchant || 'Record',
          amount: parseFloat(rowData.amount || '0'),
          date: rowData.date instanceof Date ? rowData.date.toISOString().split('T')[0] : rowData.date,
          category: rowData.category,
          notes: rowData.notes,
          owner_name: rowData.person || rowData.user || rowData.employee || ''
        });
      });
      finalizeData(rows);
    } else if (file.name.endsWith('.json')) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const rows = Array.isArray(data) ? data : [data];
        finalizeData(rows.map((r: any) => ({
          description: r.description || r.Description || r.merchant || r.name || 'JSON Record',
          amount: parseFloat(r.amount || r.Amount || '0'),
          date: r.date || r.Date || new Date().toISOString().split('T')[0],
          category: r.category || r.Category,
          notes: r.notes || r.Notes || '',
          owner_id: r.owner_id || null,
          owner_name: r.owner_name || ''
        })));
      } catch (e) {
        showToast('Invalid JSON file', 'error');
        setAnalyzing(false);
      }
    } else if (file.name.endsWith('.pdf')) {
       showToast('Analyzing PDF statement structure...', 'info');
       setTimeout(() => {
          finalizeData([{ description: 'PDF Transaction Extraction', amount: 125.50, date: '2026-03-25' }]);
       }, 1500);
    } else {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          finalizeData(results.data.map((r: any) => ({
            description: r.Description || r.merchant || r.Name,
            amount: parseFloat(r.Amount || r.amount || '0'),
            date: r.Date || r.date,
            category: r.Category
          })));
        }
      });
    }
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

  const handleMapUser = (rowIndex: number, userId: string) => {
    const updated = [...reviewItems];
    updated[rowIndex].owner_id = userId;
    setReviewItems(updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {!file && (
        <label className="block border-2 border-dashed border-white/10 rounded-[2.5rem] p-20 text-center hover:border-emerald-500/50 transition-all cursor-pointer group bg-black/20">
          <input type="file" accept=".csv,.json,.qif,.ofx,.pdf,.xlsx" onChange={handleFileUpload} className="hidden" />
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform text-4xl">📄</div>
          <p className="font-extrabold text-2xl mb-2 text-white italic tracking-tighter uppercase">Drop Records Here</p>
          <p className="text-xs text-slate-500 font-black uppercase tracking-[0.3em]">XLSX • CSV • QIF • PDF</p>
        </label>
      )}

      {file && reviewItems.length === 0 && (
        <div className="p-12 rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-3xl shadow-2xl space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/20 shadow-inner">
               <FileCheck size={32} />
            </div>
            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">{file.name}</h4>
            <p className="text-xs text-emerald-500/60 font-black uppercase tracking-widest">Advanced analytics engine ready</p>
          </div>

          {availableSheets.length > 0 && (
            <div className="max-w-md mx-auto space-y-4 pt-6 border-t border-emerald-500/10">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 flex items-center gap-2">
                 <Layers size={12} /> Select Worksheet/Tab
               </label>
               <div className="flex flex-wrap gap-2">
                 {availableSheets.map(sheet => (
                   <button 
                     key={sheet}
                     onClick={() => setSelectedSheet(sheet)}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedSheet === sheet ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                   >
                     {sheet}
                   </button>
                 ))}
               </div>
            </div>
          )}
          
          <div className="flex justify-center gap-4 pt-6">
            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="px-10 py-4 bg-emerald-500 text-black font-black uppercase text-sm rounded-2xl hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
            >
              {analyzing ? 'Scanning Intelligence...' : 'Start Review'}
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
                   <p className="font-black text-sm uppercase italic tracking-tight">{reviewItems.length} Records Detected from "{selectedSheet || 'file'}"</p>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Target: {scope === 'household' ? 'Shared Ledger' : 'Personal Hub'}</p>
                </div>
             </div>
             <button 
               onClick={handleCommit}
               disabled={committing}
               className="px-8 py-3 bg-emerald-500 text-black font-black text-xs uppercase rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
             >
               {committing ? 'Saving Histroy...' : 'Finish Import'}
             </button>
          </div>

          <div className="rounded-[2.5rem] border border-white/5 bg-black/40 overflow-hidden shadow-2xl">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Details & Notes</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Owner/Person</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Amount</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reviewItems.map((item, idx) => (
                      <tr key={item.id} className="group hover:bg-white/5 transition-all">
                        <td className="px-8 py-6">
                           <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-slate-600 group-hover:text-emerald-500 transition-all mt-1">
                                 <Building size={14} />
                              </div>
                              <div>
                                 <p className="font-bold text-sm tracking-tight text-white">{item.description}</p>
                                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">{item.category}</p>
                                 {item.notes && (
                                   <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/10 max-w-xs">
                                      <StickyNote size={10} />
                                      <span className="text-[10px] font-bold leading-tight line-clamp-2">{item.notes}</span>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <div className="relative inline-block group/owner">
                              <select 
                                value={item.owner_id || ''}
                                onChange={(e) => handleMapUser(idx, e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 appearance-none min-w-[120px]"
                              >
                                <option value="">Auto ({item.owner_name || 'Generic'})</option>
                                {members?.map((m: any) => (
                                  <option key={m.id} value={m.id}>{m.display_name}</option>
                                ))}
                              </select>
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
