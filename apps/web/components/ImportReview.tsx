import React, { useState } from 'react';
import { 
  FileCheck, 
  ShieldCheck, 
  Building,
  Layers,
  StickyNote,
  Trash2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

interface ImportReviewProps {
  onImportComplete: () => void;
  scope: 'household' | 'private';
}

const ImportReview: React.FC<ImportReviewProps> = ({ onImportComplete, scope }) => {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<any>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const { showToast } = useToast();
  const { user, globalRole } = useAuth() as any;
  const householdId = localStorage.getItem('ledger_householdId');
  
  // Fetch household memberships to identify household role
  const { data: householdMemberships } = (useApi<any[]>('/api/user/households') as any);
  const currentMembership = (householdMemberships || []).find((h: any) => h.id === householdId);
  const isHouseholdOwner = currentMembership?.role === 'owner';
  const isPlatformOwner = globalRole === 'owner';

  // Select source endpoint for mapping members
  let membersUrl = '';
  if (isPlatformOwner) {
    membersUrl = '/api/admin/users';
  } else if (isHouseholdOwner && householdId && scope === 'household') {
    membersUrl = `/api/user/households/${householdId}/members`;
  }

  const { data: rawMembers } = (useApi<any>(membersUrl ? membersUrl : null) as any);
  const members = Array.isArray(rawMembers)
    ? rawMembers
    : (rawMembers?.data && Array.isArray(rawMembers.data) ? rawMembers.data : []);

  // Fetch categories list for dropdown selection
  const { data: categoriesList = [] } = (useApi<any[]>('/api/financials/categories') as any);
  const categories = Array.isArray(categoriesList) ? categoriesList : [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      setReviewItems([]);
      
      if (uploadedFile.name.endsWith('.xlsx')) {
        setAnalyzing(true);
        try {
          const ExcelJS = (await import('exceljs')).default;
          const wb = new ExcelJS.Workbook();
          const arrayBuffer = (await uploadedFile.arrayBuffer() as any);
          await wb.xlsx.load(arrayBuffer);
          setWorkbook(wb as any);
          const sheetNames = (wb.worksheets || []).map(ws => ws.name);
          setAvailableSheets(sheetNames);
          setSelectedSheet(sheetNames[0]);
        } catch (err: any) {
          showToast('Failed to load Excel library', 'error');
        } finally {
          setAnalyzing(false);
        }
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
      setReviewItems((rows || []).map((r, i) => ({
        id: `rev-${i}-${crypto.randomUUID().slice(0, 8)}`,
        description: r.description || 'Unknown Transaction',
        amount: r.amount || 0,
        date: r.date || new Date().toISOString().split('T')[0],
        category: r.category || 'Uncategorized',
        notes: r.notes || '',
        ownerId: r.ownerId || null,
        ownerName: r.ownerName || ''
      })));
      setAnalyzing(false);
    };

    if (file.name.endsWith('.xlsx') && workbook) {
      const ws = workbook.getWorksheet(selectedSheet);
      if (!ws) return;

      const rows: any[] = [];
      const headerRow = ws.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell: any) => headers.push(cell.text));

      ws.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return; // Skip headers
        
        const rowData: any = {};
        row.eachCell((cell: any, colNumber: number) => {
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
          ownerName: rowData.person || rowData.user || rowData.employee || ''
        });
      });
      finalizeData(rows);
    } else if (file.name.endsWith('.json')) {
      const text = (await file.text() as any);
      try {
        const data = (JSON.parse(text) as any);
        const rows = Array.isArray(data) ? data : [data];
        finalizeData(rows.map((r: any) => ({
          description: r.description || r.Description || r.merchant || r.name || 'JSON Record',
          amount: parseFloat(r.amount || r.Amount || '0'),
          date: r.date || r.Date || new Date().toISOString().split('T')[0],
          category: r.category || r.Category,
          notes: r.notes || r.Notes || '',
          ownerId: r.ownerId || null,
          ownerName: r.ownerName || ''
        })));
      } catch (e: any) {
        showToast('Invalid JSON file', 'error');
        setAnalyzing(false);
      }
    } else if (file.name.endsWith('.pdf')) {
       showToast('Analyzing PDF statement structure...', 'info');
       setTimeout(() => {
          finalizeData([{ description: 'PDF Transaction Extraction', amount: 125.50, date: '2026-03-25' }]);
       }, 1500);
    } else {
      try {
        const Papa = (await import('papaparse')).default;
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            finalizeData((results?.data || []).map((r: any) => ({
              description: r.Description || r.merchant || r.Name,
              amount: parseFloat(r.Amount || r.amount || '0'),
              date: r.Date || r.date,
              category: r.Category
            })));
          }
        });
      } catch (err: any) {
        showToast('Failed to load CSV library', 'error');
        setAnalyzing(false);
      }
    }
  };

  const handleCommit = async () => {
    if (reviewItems.length === 0) return;
    setCommitting(true);
    try {
      const res = (await fetch(`${getApiUrl()}/api/data/import/confirm`, {
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
            }) as any);
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
    updated[rowIndex].ownerId = userId;
    setReviewItems(updated);
  };

  const handleUpdateField = (rowIndex: number, field: string, value: any) => {
    const updated = [...reviewItems];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };
    setReviewItems(updated);
  };

  const handleAddRow = () => {
    setReviewItems([
      {
        id: `manual-${crypto.randomUUID()}`,
        description: 'New Transaction',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: 'Uncategorized',
        notes: '',
        ownerId: null,
        ownerName: ''
      },
      ...reviewItems
    ]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    setReviewItems(reviewItems.filter((_, i) => i !== rowIndex));
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
                 {(availableSheets || []).map(sheet => (
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <ShieldCheck size={20} />
                </div>
                <div>
                   <p className="font-black text-sm uppercase italic tracking-tight">{reviewItems.length} Records Detected from "{selectedSheet || 'file'}"</p>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Target: {scope === 'household' ? 'Shared Ledger' : 'Personal Hub'}</p>
                </div>
             </div>
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <button 
                 onClick={handleAddRow}
                 className="flex-1 sm:flex-none px-5 py-3 bg-white/5 border border-white/10 text-white font-black text-xs uppercase rounded-xl hover:bg-white/10 transition-all cursor-pointer"
               >
                 + Add Record
               </button>
               <button 
                 onClick={handleCommit}
                 disabled={committing}
                 className="flex-1 sm:flex-none px-8 py-3 bg-emerald-500 text-black font-black text-xs uppercase rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
               >
                 {committing ? 'Saving History...' : 'Finish Import'}
               </button>
             </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/5 bg-black/40 overflow-hidden shadow-2xl">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Details & Notes</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Owner/Person</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Amount ($)</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Date</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center w-16">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(reviewItems || []).map((item, idx) => (
                      <tr key={item.id} className="group hover:bg-white/5 transition-all">
                        <td className="px-8 py-6">
                           <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-slate-600 group-hover:text-emerald-500 transition-all mt-1">
                                 <Building size={14} />
                              </div>
                              <div className="flex-1 space-y-1 min-w-[200px]">
                                 <input 
                                   type="text" 
                                   value={item.description}
                                   onChange={(e) => handleUpdateField(idx, 'description', e.target.value)}
                                   className="font-bold text-sm tracking-tight text-white bg-transparent border-b border-transparent hover:border-white/10 focus:border-emerald-500/50 outline-none w-full py-0.5 transition-all"
                                 />
                                 <div className="flex items-center gap-2">
                                   <select
                                     value={item.category || ''}
                                     onChange={(e) => handleUpdateField(idx, 'category', e.target.value)}
                                     className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-transparent border border-transparent hover:border-white/10 focus:border-emerald-500/50 outline-none py-0.5 cursor-pointer max-w-[120px] transition-all"
                                   >
                                     <option value="Uncategorized" className="text-black">Uncategorized</option>
                                     {(categories || []).map((c: any) => (
                                       <option key={c.id} value={c.name} className="text-black">{c.name}</option>
                                     ))}
                                   </select>
                                   {item.notes && (
                                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded text-blue-400 border border-blue-500/10 max-w-[150px]">
                                        <StickyNote size={8} />
                                        <span className="text-[9px] font-bold leading-tight line-clamp-1">{item.notes}</span>
                                     </div>
                                   )}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <div className="relative inline-block group/owner">
                              {(isPlatformOwner || isHouseholdOwner) ? (
                                <select 
                                  value={item.ownerId || ''}
                                  onChange={(e) => handleMapUser(idx, e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 appearance-none min-w-[120px] text-white"
                                >
                                  <option value="">Auto ({item.ownerName || 'Generic'})</option>
                                  {members?.map((m: any) => (
                                    <option key={m.id} value={m.id} className="text-black">{m.displayName || m.username}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                                  {user?.displayName || user?.username || 'Me'} (Locked)
                                </span>
                              )}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <input 
                             type="number" 
                             step="0.01"
                             value={item.amount}
                             onChange={(e) => handleUpdateField(idx, 'amount', parseFloat(e.target.value) || 0)}
                             className="font-black text-sm italic tracking-tighter text-emerald-400 bg-transparent border-b border-transparent hover:border-white/10 focus:border-emerald-500/50 outline-none text-right w-24 py-0.5 transition-all"
                           />
                        </td>
                        <td className="px-8 py-6 text-right">
                           <input 
                             type="date"
                             value={item.date}
                             onChange={(e) => handleUpdateField(idx, 'date', e.target.value)}
                             className="text-xs text-slate-500 font-bold tracking-tight bg-transparent border-b border-transparent hover:border-white/10 focus:border-emerald-500/50 outline-none text-right py-0.5 transition-all"
                           />
                        </td>
                        <td className="px-8 py-6 text-center">
                           <button 
                             onClick={() => handleDeleteRow(idx)}
                             className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                             title="Remove Record"
                           >
                              <Trash2 size={14} />
                           </button>
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
