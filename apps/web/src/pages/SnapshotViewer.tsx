import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';

const SnapshotViewer: React.FC = () => {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSnapshot = async () => {
      const id = window.location.hash.split('/').pop();
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/public/snapshots/${id}`);
        if (!res.ok) throw new Error('Snapshot not found or expired');
        const data = await res.json();
        setSnapshot(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshot();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-emerald-500 animate-pulse">LOADING SNAPSHOT...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center font-black text-red-500">ERROR: {error}</div>;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/10 pb-8">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Read-Only Snapshot</div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white">{snapshot.name}</h1>
            <p className="text-secondary text-xs uppercase tracking-widest font-bold mt-2">Captured on {new Date(snapshot.created_at).toLocaleString()}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          <div className="card p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
             <table className="w-full text-left">
               <thead>
                 <tr className="text-[10px] font-black uppercase tracking-widest text-secondary border-b border-white/10">
                   <th className="pb-4">Date</th>
                   <th className="pb-4">Description</th>
                   <th className="pb-4 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {snapshot.data.map((row: any, i: number) => (
                   <tr key={i} className="text-sm">
                     <td className="py-4 font-medium opacity-60">{row.date || row.Date}</td>
                     <td className="py-4 font-bold">{row.description || row.Description}</td>
                     <td className="py-4 text-right font-black text-emerald-500">${row.amount || row.Amount}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        <footer className="text-center pt-12">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-20">Securely served by LEDGER Platform</p>
        </footer>
      </div>
    </MainLayout>
  );
};

export default SnapshotViewer;
