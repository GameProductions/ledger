import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import ImportReview from '../components/ImportReview';
import { PrivacySettings } from '../components/PrivacySettings';
import { getApiUrl } from '../utils/api';
import { 
  Cloud, 
  Upload, 
  Globe, 
  FileText, 
  Database, 
  Shield, 
  Users, 
  Lock, 
  Download
} from 'lucide-react';

const API_URL = getApiUrl();

const DataCenterPage: React.FC = () => {
  const [importScope, setImportScope] = useState<'household' | 'private'>('household');
  const [activeTab, setActiveTab] = useState<'upload' | 'cloud' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf' | 'json') => {
    const token = localStorage.getItem('ledger_token');
    window.open(`${API_URL}/api/financials/transactions/export?format=${format}&token=${token}`, '_blank');
  };

  const handleUrlScan = async () => {
    if (!url) return;
    setScanning(true);
    try {
      const res = await fetch(`${API_URL}/api/data/scrape`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      setScanResult(data.data);
    } finally {
      setScanning(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-12 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header - Jargon Free */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <Database size={20} />
               </div>
               <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Data Center</p>
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase underline decoration-emerald-500/50 underline-offset-8">Import & Export Hub</h1>
            <p className="mt-4 text-slate-400 font-medium max-w-xl">Move your records between providers, local files, and secure cloud storage with absolute simplicity.</p>
          </div>

          {/* Scope Selector */}
          <div className="p-1 bg-white/5 rounded-2xl border border-white/10 flex gap-1">
             <button 
               onClick={() => setImportScope('household')}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs transition-all ${importScope === 'household' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
             >
               <Users size={14} /> Shared
             </button>
             <button 
               onClick={() => setImportScope('private')}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs transition-all ${importScope === 'private' ? 'bg-emerald-500 text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
             >
               <Lock size={14} /> Just for Me
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          
          {/* Main Work Area */}
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-black/40 border border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
              {/* Tab Navigation */}
              <div className="flex border-b border-white/10 p-2">
                {[
                  { id: 'upload', name: 'File Drop', icon: Upload },
                  { id: 'cloud', name: 'Cloud Drive', icon: Cloud },
                  { id: 'url', name: 'Website Link', icon: Globe }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === tab.id ? 'bg-white/5 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <tab.icon size={16} className={activeTab === tab.id ? 'text-emerald-500' : ''} /> {tab.name}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-12">
                {activeTab === 'upload' && (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <ImportReview scope={importScope} onImportComplete={() => window.location.reload()} />
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                       <FileText className="text-blue-400 shrink-0" />
                       <p className="text-xs text-blue-400/80 font-medium">Supported formats: **CSV, QIF, OFX, and PDF Bank Statements**. Spreadsheets will be auto-mapped to your history.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'cloud' && (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 py-12 text-center">
                    <Cloud size={64} className="mx-auto text-slate-700 mb-6" />
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Remote Storage Sync</h3>
                    <p className="text-slate-500 max-w-md mx-auto">Connect your preferred cloud provider to pick files or store automated exports securely.</p>
                    
                    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-8">
                       {[
                         { name: 'Google Drive', color: 'hover:bg-blue-500/10 hover:border-blue-500/30' },
                         { name: 'Dropbox', color: 'hover:bg-indigo-500/10 hover:border-indigo-500/30' },
                         { name: 'OneDrive', color: 'hover:bg-sky-500/10 hover:border-sky-500/30' }
                       ].map(p => (
                         <button key={p.name} className={`p-6 rounded-3xl bg-white/5 border border-white/5 transition-all group ${p.color}`}>
                            <div className="aspect-square w-full rounded-2xl bg-black/40 mb-3 flex items-center justify-center font-black text-[10px] uppercase group-hover:scale-105 transition-all">{p.name.split(' ')[0]}</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Connect</p>
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'url' && (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                       <h3 className="text-xl font-bold mb-4 flex items-center gap-2 italic uppercase tracking-tight"><Globe className="text-emerald-500" /> Smart Web Scraper</h3>
                       <p className="text-sm text-slate-500 mb-8 font-medium">Paste the website link of a service provider or a direct spreadsheet URL. Our system will extract branding and history details automatically.</p>
                       
                       <div className="flex gap-4">
                          <input 
                            type="url" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/billing or https://docs.google.com/..."
                            className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-emerald-500/50 transition-all outline-none"
                          />
                          <button 
                            onClick={handleUrlScan}
                            disabled={scanning}
                            className="px-8 py-4 bg-emerald-500 text-black font-black uppercase text-sm rounded-2xl hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                          >
                            {scanning ? 'Analyzing Site...' : 'Scan Link'}
                          </button>
                       </div>
                    </div>

                    {scanResult && (
                      <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 animate-in slide-in-from-top-4 duration-500 flex gap-8 items-center">
                         <div className="w-24 h-24 rounded-3xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                            {scanResult.logo_url ? <img src={scanResult.logo_url} alt="" className="w-full h-full object-contain p-4" /> : <Globe size={32} className="text-slate-700" />}
                         </div>
                         <div className="flex-1">
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter">{scanResult.name}</h4>
                            <p className="text-sm text-slate-400 mt-1 line-clamp-1">{scanResult.description || 'Verified provider metadata detected.'}</p>
                            <div className="flex gap-4 mt-6">
                                <button className="px-6 py-2 bg-emerald-500 text-black font-bold uppercase text-xs rounded-lg hover:bg-emerald-400 transition-all">Import to {importScope === 'household' ? 'Shared List' : 'Private Hub'}</button>
                                <button onClick={() => setScanResult(null)} className="px-6 py-2 bg-white/5 text-white font-bold uppercase text-xs rounded-lg hover:bg-white/10 transition-all">Discard</button>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Column: Export & Stats */}
          <div className="space-y-8">
            {/* Jargon Free Export Section */}
            <div className="p-8 rounded-[3rem] bg-gradient-to-br from-blue-500/10 via-transparent to-transparent border border-white/10 backdrop-blur-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl group-hover:scale-110 transition-transform">📄</div>
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl">📤</div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-blue-500">Download Records</h2>
                    <p className="text-xs text-secondary">Export your private or shared history.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'json', name: 'Raw History Hub', format: 'JSON', color: 'bg-amber-500' },
                    { id: 'csv', name: 'Standard Sheets', format: 'CSV', color: 'bg-emerald-500' },
                    { id: 'xlsx', name: 'Advanced Excel', format: 'XLSX', color: 'bg-blue-500' },
                    { id: 'pdf', name: 'Secure Document', format: 'PDF', color: 'bg-red-500' }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => handleExport(item.id as any)}
                      className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all text-left"
                    >
                      <div>
                        <p className="font-bold text-sm tracking-tight">{item.name}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Format: {item.format}</p>
                      </div>
                      <Download size={16} className="text-slate-600" />
                    </button>
                  ))}
               </div>
            </div>

            {/* Privacy Shield Info */}
            <div className="p-8 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10">
               <div className="flex items-center gap-3 mb-4">
                  <Shield className="text-emerald-500" size={20} />
                  <h3 className="text-sm font-black uppercase tracking-widest">Privacy Shield</h3>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed font-medium">Your data is encrypted end-to-end. Private imports bypass the household ledger and are stored in a secure, isolated profile only you can access.</p>
            </div>
          </div>

        </div>

        {/* Privacy & Setup Configurations */}
        <div className="mt-12">
          <PrivacySettings />
        </div>
      </div>
    </MainLayout>
  );
};

export default DataCenterPage;
