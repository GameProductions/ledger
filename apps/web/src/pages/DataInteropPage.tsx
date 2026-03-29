import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import ImportSandbox from '../components/ImportSandbox';
import { useExport } from '../hooks/useExport';
import { useApi } from '../hooks/useApi';

const DataInteropPage: React.FC = () => {
  const { exportData } = useExport();
  const { data: transactions } = useApi('/api/financials/transactions');
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!transactions) return;
    setExporting(true);
    try {
      await exportData({
        format,
        filename: `ledger_export_${new Date().toISOString().split('T')[0]}`,
        data: transactions.map((tx: any) => ({
          ...tx,
          amount: (tx.amount_cents / 100).toFixed(2),
          date: tx.transaction_date
        })),
        columns: [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Description', key: 'description', width: 40 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Status', key: 'reconciliation_status', width: 15 }
        ]
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2">Import & Export</h1>
            <p className="text-secondary font-medium">Easily import or export your financial data.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Import Section */}
          <ImportSandbox onImportComplete={() => window.location.reload()} />

          {/* Export Section */}
          <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl group-hover:scale-110 transition-transform">📊</div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl">📤</div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-blue-500">Export Options</h2>
                <p className="text-sm text-secondary">Save your data in a format that works for you.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {[
                 { id: 'csv', name: 'Standard CSV', desc: 'Common format for all apps', color: 'bg-emerald-500' },
                 { id: 'xlsx', name: 'Excel Workbook', desc: 'Best for detailed analysis', color: 'bg-blue-500' },
                 { id: 'pdf', name: 'PDF Document', desc: 'Best for printing and records', color: 'bg-red-500' }
               ].map(format => (
                 <button 
                   key={format.id}
                   onClick={() => handleExport(format.id as any)}
                   disabled={exporting}
                   className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all text-left"
                 >
                   <div>
                     <p className="font-bold text-lg">{format.name}</p>
                     <p className="text-xs font-black uppercase tracking-widest opacity-40">{format.desc}</p>
                   </div>
                   <div className={`w-10 h-10 rounded-xl ${format.color} flex items-center justify-center text-black font-black text-xs`}>
                     {format.id.toUpperCase()}
                   </div>
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DataInteropPage;
