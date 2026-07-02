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

  // Mapping states
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    description: '',
    amount: '',
    date: '',
    category: '',
    notes: ''
  });
  const [showMapping, setShowMapping] = useState(false);
  
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

  const handleExcelSheetParsing = async (wb: any, sheetName: string) => {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) return;

    const fileHeaders: string[] = [];
    ws.getRow(1).eachCell((cell: any) => {
      if (cell.text) fileHeaders.push(cell.text);
    });
    setHeaders(fileHeaders);

    const rows: any[] = [];
    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const rowData: any = {};
      row.eachCell((cell: any, colNumber: number) => {
        const h = fileHeaders[colNumber - 1];
        if (h) rowData[h] = cell.value;
      });
      rows.push(rowData);
    });
    setRawRows(rows);

    setColumnMapping({
      description: fileHeaders.find(h => /desc|name|merchant|payee/i.test(h)) || fileHeaders[0] || '',
      amount: fileHeaders.find(h => /amount|cost|val|price|debit/i.test(h)) || fileHeaders[1] || '',
      date: fileHeaders.find(h => /date|time/i.test(h)) || fileHeaders[2] || '',
      category: fileHeaders.find(h => /cat/i.test(h)) || '',
      notes: fileHeaders.find(h => /note|memo/i.test(h)) || ''
    });
    setShowMapping(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      setReviewItems([]);
      setShowMapping(false);
      
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
          await handleExcelSheetParsing(wb, sheetNames[0]);
        } catch (err: any) {
          showToast('Failed to load Excel library', 'error');
        } finally {
          setAnalyzing(false);
        }
      } else if (uploadedFile.name.endsWith('.json')) {
        // Load JSON immediately to preview
        try {
          const text = await uploadedFile.text();
          const parsed = JSON.parse(text);
          const rows = Array.isArray(parsed) ? parsed : [parsed];
          if (rows.length > 0) {
            const fileHeaders = Object.keys(rows[0] as any);
            setHeaders(fileHeaders);
            setRawRows(rows);
            setColumnMapping({
              description: fileHeaders.find(h => /desc|name|merchant|payee/i.test(h)) || fileHeaders[0] || '',
              amount: fileHeaders.find(h => /amount|cost|val|price|debit/i.test(h)) || fileHeaders[1] || '',
              date: fileHeaders.find(h => /date|time/i.test(h)) || fileHeaders[2] || '',
              category: fileHeaders.find(h => /cat/i.test(h)) || '',
              notes: fileHeaders.find(h => /note|memo/i.test(h)) || ''
            });
            setShowMapping(true);
          }
        } catch (e) {
          showToast('Invalid JSON file', 'error');
        }
      } else if (uploadedFile.name.endsWith('.pdf')) {
        // Fallback for PDF
        setHeaders(['description', 'amount', 'date']);
        setRawRows([{ description: 'PDF Transaction Extraction', amount: 125.50, date: '2026-03-25' }]);
        setColumnMapping({ description: 'description', amount: 'amount', date: 'date', category: '', notes: '' });
        setShowMapping(true);
      } else {
        // Parse CSV Papa Parse
        try {
          const Papa = (await import('papaparse')).default;
          Papa.parse(uploadedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results?.data && results.data.length > 0) {
                const fileHeaders = Object.keys(results.data[0] as any);
                setHeaders(fileHeaders);
                setRawRows(results.data);
                setColumnMapping({
                  description: fileHeaders.find(h => /desc|name|merchant|payee/i.test(h)) || fileHeaders[0] || '',
                  amount: fileHeaders.find(h => /amount|cost|val|price|debit/i.test(h)) || fileHeaders[1] || '',
                  date: fileHeaders.find(h => /date|time/i.test(h)) || fileHeaders[2] || '',
                  category: fileHeaders.find(h => /cat/i.test(h)) || '',
                  notes: fileHeaders.find(h => /note|memo/i.test(h)) || ''
                });
                setShowMapping(true);
              }
            }
          });
        } catch (err: any) {
          showToast('Failed to load CSV library', 'error');
        }
      }
    }
  };

  const handleSelectExcelSheet = async (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook) {
      await handleExcelSheetParsing(workbook, sheet);
    }
  };

  const handleAnalyze = () => {
    if (rawRows.length === 0) return;
    setAnalyzing(true);
    
    try {
      const mapped = rawRows.map((r: any, i: number) => {
        const rawAmount = r[columnMapping.amount];
        const parsedAmount = typeof rawAmount === 'number' 
          ? rawAmount 
          : parseFloat(String(rawAmount || '0').replace(/[^0-9.-]/g, '')) || 0;
        
        let rawDate = r[columnMapping.date];
        let parsedDate = '';
        if (rawDate instanceof Date) {
          parsedDate = rawDate.toISOString().split('T')[0];
        } else if (rawDate) {
          parsedDate = String(rawDate).split('T')[0];
        } else {
          parsedDate = new Date().toISOString().split('T')[0];
        }
        
        return {
          id: `rev-${i}-${crypto.randomUUID().slice(0, 8)}`,
          description: String(r[columnMapping.description] || 'Unknown Transaction'),
          amount: parsedAmount,
          date: parsedDate,
          category: columnMapping.category ? String(r[columnMapping.category] || 'Uncategorized') : 'Uncategorized',
          notes: columnMapping.notes ? String(r[columnMapping.notes] || '') : '',
          ownerId: null,
          ownerName: ''
        };
      });
      
      setReviewItems(mapped);
      setShowMapping(false);
    } catch (e) {
      showToast('Error mapping file columns. Please check your config.', 'error');
    } finally {
      setAnalyzing(false);
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

      {file && showMapping && reviewItems.length === 0 && (
        <div className="p-8 sm:p-12 rounded-[2.5rem] border border-emerald-500/20 bg-black/40 backdrop-blur-3xl shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
            <div>
              <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">Column Mapping Configuration</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Map the headers from <span className="text-emerald-400 font-black">{file.name}</span> to import fields correctly</p>
            </div>
            
            {availableSheets.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Worksheet:</span>
                <div className="flex gap-1.5">
                  {availableSheets.map(sheet => (
                    <button 
                      key={sheet}
                      onClick={() => handleSelectExcelSheet(sheet)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${selectedSheet === sheet ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Side: Mapping Fields */}
            <div className="lg:col-span-5 space-y-5 bg-white/2 p-6 rounded-[2rem] border border-white/5">
              <div className="text-xs font-black text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-2">Schema Fields</div>
              
              <div className="space-y-4">
                {/* Description Column */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Description / Merchant *</label>
                  <select 
                    value={columnMapping.description}
                    onChange={(e) => setColumnMapping({ ...columnMapping, description: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Amount Column */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Amount / Price *</label>
                  <select 
                    value={columnMapping.amount}
                    onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Date Column */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Transaction Date *</label>
                  <select 
                    value={columnMapping.date}
                    onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Category Column (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Category (Optional)</label>
                  <select 
                    value={columnMapping.category}
                    onChange={(e) => setColumnMapping({ ...columnMapping, category: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  >
                    <option value="">-- Ignore Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Notes Column (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Notes / Memo (Optional)</label>
                  <select 
                    value={columnMapping.notes}
                    onChange={(e) => setColumnMapping({ ...columnMapping, notes: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50"
                  >
                    <option value="">-- Ignore Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Side: Raw File Data Preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">Raw File Data Preview</div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Showing first {Math.min(5, rawRows.length)} rows</span>
              </div>

              <div className="border border-white/5 rounded-[2rem] bg-black/60 overflow-hidden shadow-inner">
                <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        {headers.map(h => (
                          <th key={h} className="px-4 py-3 font-black uppercase text-slate-400 tracking-wider whitespace-nowrap min-w-[100px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[10px] text-slate-300">
                      {rawRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/2">
                          {headers.map(h => (
                            <td key={h} className="px-4 py-2.5 truncate max-w-[150px]" title={String(row[h] ?? '')}>
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
            <button 
              onClick={() => setFile(null)} 
              className="px-8 py-3 bg-white/5 text-white font-black uppercase text-xs rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleAnalyze}
              disabled={!columnMapping.description || !columnMapping.amount || !columnMapping.date || analyzing}
              className="px-10 py-3 bg-emerald-500 text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              {analyzing ? 'Mapping Columns...' : 'Apply Mapping & Start Review'}
            </button>
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

          <div className="relative rounded-[2.5rem] border border-white/5 bg-black/40 overflow-hidden shadow-2xl">
            {/* Scroll Indication Mask */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10 animate-fade-in" />

            <div className="max-h-[600px] overflow-y-auto custom-scrollbar pb-10">
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

            {/* Scroll Indication text */}
            {reviewItems.length > 5 && (
              <div className="absolute bottom-2 inset-x-0 text-center z-20 pointer-events-none">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400 bg-black/80 backdrop-blur-md border border-white/5 rounded-full px-4 py-1.5 inline-block shadow-lg animate-pulse">
                  ↕ Scroll to view all {reviewItems.length} records
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportReview;
