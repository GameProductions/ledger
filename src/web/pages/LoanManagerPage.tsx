import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { HandCoins, Plus, Trash2, Calendar, User, Phone, BadgeDollarSign, Receipt } from 'lucide-react';
import { Price } from '../components/Price';

const LoanManagerPage: React.FC = () => {
  const { token, householdId } = useAuth();
  const { showToast } = useToast();
  const { data: loans = [], mutate } = useApi('/api/planning/p2p/loans');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newLoan, setNewLoan] = useState({
    borrowerName: '',
    borrowerContact: '',
    total_amountCents: 0,
    interestRateApy: 0,
    termMonths: 12,
    origination_date: new Date().toISOString().split('T')[0]
  });

  const [paymentData, setPaymentData] = useState({
    loanId: '',
    amountCents: 0,
    email: ''
  });

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/planning/p2p/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify(newLoan)
      });
      if (res.ok) {
        showToast('Loan Record Created', 'success');
        setIsAdding(false);
        mutate();
      }
    } catch (err) {
      showToast('Creation failed', 'error');
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('Permanently delete this loan and all associated payment records?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/planning/p2p/loans/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      showToast('Loan Deleted', 'success');
      mutate();
    } catch (err) {
      showToast('Deletion failed', 'error');
    }
  };

  const handleLogPayment = async (loanId: string) => {
    const amountStr = prompt('Enter payment amount (e.g. 50.00):');
    if (!amountStr) return;
    const amountCents = Math.round(parseFloat(amountStr) * 100);
    const email = prompt('Enter recipient email for receipt (optional):') || '';

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/planning/p2p/loans/${loanId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ amountCents, email, method: 'Manual Entry' })
      });
      if (res.ok) {
        showToast('Payment Logged Successfully', 'success');
        mutate();
      }
    } catch (err) {
      showToast('Payment log failed', 'error');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-12 px-4 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <HandCoins size={20} />
               </div>
               <p className="text-xs font-black uppercase tracking-[0.4em] text-secondary">Asset Management</p>
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase underline decoration-amber-500/50 underline-offset-8">Private Loan Ledger</h1>
            <p className="mt-4 text-slate-400 font-medium max-w-xl">Track personal lending, IOU balances, and payment history with automated receipting.</p>
          </div>

          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-8 py-4 bg-amber-500 text-black font-black uppercase text-sm rounded-2xl hover:scale-105 transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2"
          >
            <Plus size={18} /> {isAdding ? 'Cancel' : 'Register New Loan'}
          </button>
        </header>

        {isAdding && (
          <form onSubmit={handleCreateLoan} className="card p-8 bg-deep/40 backdrop-blur-3xl border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Borrower Name</label>
              <div className="relative">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary opacity-40" />
                <input 
                  required
                  value={newLoan.borrowerName}
                  onChange={e => setNewLoan({...newLoan, borrowerName: e.target.value})}
                  className="w-full bg-black/40 border border-glass-border rounded-xl py-4 pl-12 pr-4 text-sm font-bold focus:border-amber-500 transition-all"
                  placeholder="Full name..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Contact Details</label>
              <div className="relative">
                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary opacity-40" />
                <input 
                  value={newLoan.borrowerContact}
                  onChange={e => setNewLoan({...newLoan, borrowerContact: e.target.value})}
                  className="w-full bg-black/40 border border-glass-border rounded-xl py-4 pl-12 pr-4 text-sm font-bold focus:border-amber-500 transition-all"
                  placeholder="+1 (555) 000-0000 / email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Principal Amount</label>
              <div className="relative">
                <BadgeDollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary opacity-40" />
                <input 
                  type="number"
                  required
                  value={newLoan.total_amountCents / 100}
                  onChange={e => setNewLoan({...newLoan, total_amountCents: Math.round(parseFloat(e.target.value) * 100)})}
                  className="w-full bg-black/40 border border-glass-border rounded-xl py-4 pl-12 pr-4 text-sm font-bold focus:border-amber-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Interest Rate (APY %)</label>
               <input 
                  type="number"
                  step="0.01"
                  value={newLoan.interestRateApy}
                  onChange={e => setNewLoan({...newLoan, interestRateApy: parseFloat(e.target.value)})}
                  className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-amber-500 transition-all"
                />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Term (Months)</label>
               <input 
                  type="number"
                  value={newLoan.termMonths}
                  onChange={e => setNewLoan({...newLoan, termMonths: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-amber-500 transition-all"
                />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-amber-500 hover:text-white transition-all">Establish Loan</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loans && loans.length > 0 ? (
            loans.map((loan: any) => (
              <div key={loan.id} className="card p-6 bg-deep/40 border-glass-border group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl group-hover:scale-110 transition-transform"><HandCoins /></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">{loan.borrowerName}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{loan.borrowerContact || 'No contact provided'}</p>
                  </div>
                  <button onClick={() => handleDeleteLoan(loan.id)} className="p-2 text-red-500/20 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                   <div className="flex justify-between items-end border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Outstanding</span>
                      <Price amountCents={loan.remainingBalanceCents} className="text-2xl font-black italic text-white" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary mb-1">Original</p>
                        <Price amountCents={loan.total_amountCents} className="text-sm font-bold opacity-60" />
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary mb-1">Interest</p>
                        <p className="text-sm font-bold text-emerald-500">{loan.interestRateApy}% APY</p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleLogPayment(loan.id)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <Receipt size={14} /> Log Payment
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-secondary transition-all">
                    <Calendar size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center card bg-white/5 border-dashed border-white/10">
               <HandCoins size={48} className="mx-auto text-secondary opacity-20 mb-4" />
               <h3 className="text-xl font-black uppercase italic tracking-tighter opacity-40 italic">No Loans Found</h3>
               <p className="text-sm text-secondary font-medium opacity-60">Establish your first private loan record to begin tracking.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default LoanManagerPage;
