import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CreditCard, Shield, Plus, Trash2, Link, Mail, Calendar, ExternalLink, Globe, Zap, Settings, ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { MainLayout } from '../components/layout/MainLayout';
import { getApiUrl } from '../utils/api';

const PaymentCentralPage: React.FC = () => {
  const { token, householdId } = useAuth();
  const { showToast } = useToast();
  
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showLinkAccount, setShowLinkAccount] = useState(false);
  
  const [newMethod, setNewMethod] = useState({
    name: '',
    type: 'credit_card',
    last_four: '',
    branding_url: ''
  });
  
  const [newAccount, setNewAccount] = useState({
    provider_id: '',
    paymentMethodId: '',
    emailAttached: '',
    membershipStartDate: '',
    membershipEndDate: '',
    subscriptionId: '',
    notes: '',
    status: 'active'
  });

  const fetchData = async () => {
    try {
      const apiUrl = getApiUrl();
      const headers = { 'Authorization': `Bearer ${token}`, 'x-household-id': householdId || '' };
      
      const [methodsRes, accountsRes, providersRes, subsRes] = await Promise.all([
        fetch(`${apiUrl}/api/user/payment-methods`, { headers }),
        fetch(`${apiUrl}/api/user/linked-accounts`, { headers }),
        fetch(`${apiUrl}/api/data/providers`, { headers }),
        fetch(`${apiUrl}/api/planning/subscriptions`, { headers })
      ]);
      
      const [methodsData, accountsData, providersData, subsData] = await Promise.all([
        methodsRes.json(),
        accountsRes.json(),
        providersRes.json(),
        subsRes.json()
      ]);
      
      setPaymentMethods(Array.isArray(methodsData) ? methodsData : []);
      setLinkedAccounts(Array.isArray(accountsData) ? accountsData : []);
      setProviders(Array.isArray(providersData) ? providersData : []);
      setSubscriptions(Array.isArray(subsData) ? subsData : []);
    } catch (err) {
      console.error('Failed to fetch payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/user/payment-methods`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json',
        'x-household-id': householdId || ''
      },
      body: JSON.stringify(newMethod)
    });
    if (res.ok) {
      showToast('Payment method added!', 'success');
      setShowAddMethod(false);
      setNewMethod({ name: '', type: 'credit_card', last_four: '', branding_url: '' });
      fetchData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to add method', 'error');
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = getApiUrl();
    
    // Map camelCase state to snake_case payload
    const payload = {
      provider_id: newAccount.provider_id,
      payment_method_id: newAccount.paymentMethodId || null,
      email_attached: newAccount.emailAttached || null,
      membership_start_date: newAccount.membershipStartDate || null,
      membership_end_date: newAccount.membershipEndDate || null,
      subscription_id: newAccount.subscriptionId || null,
      notes: newAccount.notes || '',
      status: newAccount.status
    };

    const res = await fetch(`${apiUrl}/api/user/linked-accounts`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json',
        'x-household-id': householdId || ''
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Account linked successfully!', 'success');
      setShowLinkAccount(false);
      setNewAccount({ provider_id: '', paymentMethodId: '', emailAttached: '', membershipStartDate: '', membershipEndDate: '', subscriptionId: '', notes: '', status: 'active' });
      fetchData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to link account', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse lg:pt-32">Securing Payment Channel...</div>;

  return (
    <MainLayout>
      <div className="max-w-[1400px] mx-auto p-4 lg:p-12 pb-32 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.location.hash = '#/'}
              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-secondary hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                    <Shield size={16} />
                 </div>
                 <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Security Area</p>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase underline decoration-amber-500/50 underline-offset-8">Payment Central</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAddMethod(!showAddMethod)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black uppercase text-sm rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2"
            >
              {showAddMethod ? 'Cancel' : <><Plus size={16} /> Add Method</>}
            </button>
            <button 
              onClick={() => setShowLinkAccount(!showLinkAccount)}
              className="px-6 py-3 bg-amber-500 text-black font-black uppercase text-sm rounded-2xl hover:scale-[1.05] transition-all flex items-center gap-2"
            >
              {showLinkAccount ? 'Cancel' : <><Link size={16} /> Link Provider</>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          
          {/* Left Column: Forms and Summaries */}
          <div className="xl:col-span-1 space-y-8">
            
            {/* Add Payment Method Form */}
            {showAddMethod && (
              <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                 <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><CreditCard className="text-amber-500" /> New Payment Method</h3>
                 <form onSubmit={handleAddMethod} className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Method Label</label>
                      <input 
                        type="text" 
                        value={newMethod.name} 
                        onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                        placeholder="e.g. Personal Visa, Corporate PayPal"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-amber-500/50"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Type</label>
                        <select 
                          value={newMethod.type} 
                          onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm appearance-none"
                        >
                          <option value="credit_card">Credit Card</option>
                          <option value="debit_card">Debit Card</option>
                          <option value="paypal">PayPal</option>
                          <option value="bank_account">Bank Account</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Last 4 (Optional)</label>
                        <input 
                          type="text" 
                          maxLength={4}
                          value={newMethod.last_four} 
                          onChange={(e) => setNewMethod({ ...newMethod, last_four: e.target.value })}
                          placeholder="1234"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-white text-black font-black uppercase text-sm rounded-xl hover:scale-[1.02] transition-all">Save Method</button>
                 </form>
              </div>
            )}

            {/* Link Provider Form */}
            {showLinkAccount && (
              <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 animate-in fade-in slide-in-from-top-4 duration-500">
                 <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-amber-500"><Link /> Link Provider Portal</h3>
                 <form onSubmit={handleLinkAccount} className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-amber-500/50 mb-2 block">Select Provider</label>
                      <SearchableSelect 
                        options={(providers || []).map(p => ({ 
                          value: p.id, 
                          label: p.name, 
                          icon: p.icon_url ? <img src={p.icon_url} className="w-5 h-5" alt="" /> : null
                        }))}
                        value={newAccount.provider_id}
                        onChange={(val) => setNewAccount({ ...newAccount, provider_id: val })}
                        placeholder="Choose Provider..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-amber-500/50 mb-2 block">Attached Email</label>
                      <input 
                        type="email" 
                        value={newAccount.emailAttached} 
                        onChange={(e) => setNewAccount({ ...newAccount, emailAttached: e.target.value })}
                        placeholder="account@email.com"
                        className="w-full bg-black/40 border border-amber-500/20 rounded-xl px-4 py-3 text-sm focus:border-amber-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-amber-500/50 mb-2 block">Account Settings</label>
                        <SearchableSelect 
                          options={(paymentMethods || []).map(m => ({ 
                            value: m.id, 
                            label: m.name, 
                            metadata: { subtext: (m.type || '').replace('_', ' ') }
                          }))}
                          value={newAccount.paymentMethodId}
                          onChange={(val) => setNewAccount({ ...newAccount, paymentMethodId: val })}
                          placeholder="Choose Method..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-amber-500/50 mb-2 block">Link to Plan</label>
                        <SearchableSelect 
                          options={(subscriptions || []).map(s => ({ 
                            value: s.id, 
                            label: s.name, 
                            metadata: { subtext: `$${((s.amount_cents || 0)/100).toFixed(2)}` }
                          }))}
                          value={newAccount.subscriptionId}
                          onChange={(val) => setNewAccount({ ...newAccount, subscriptionId: val })}
                          placeholder="Choose Plan..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-amber-500/50 mb-2 block">Member Since</label>
                        <input 
                          type="date" 
                          value={newAccount.membershipStartDate} 
                          onChange={(e) => setNewAccount({ ...newAccount, membershipStartDate: e.target.value })}
                          className="w-full bg-black/40 border border-amber-500/20 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-amber-500/50 mb-2 block">Plan End Date</label>
                        <input 
                          type="date" 
                          value={newAccount.membershipEndDate} 
                          onChange={(e) => setNewAccount({ ...newAccount, membershipEndDate: e.target.value })}
                          className="w-full bg-black/40 border border-amber-500/20 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-amber-500 text-black font-black uppercase text-sm rounded-xl hover:scale-[1.02] transition-all">Connect Account</button>
                 </form>
              </div>
            )}

            {/* Payment Methods List */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Secure Methods</h3>
                  <span className="text-xs font-black text-amber-500 uppercase italic px-2 py-0.5 bg-amber-500/10 rounded">{(paymentMethods || []).length}</span>
               </div>
               {(paymentMethods || []).map(method => (
                 <div key={method.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-amber-500 border border-white/5">
                      <CreditCard size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm tracking-tight">{method.name}</p>
                      <p className="text-xs uppercase font-black text-slate-500 tracking-widest">{(method.type || '').replace('_', ' ')} {method.last_four && `**** ${method.last_four}`}</p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                 </div>
               ))}
               {paymentMethods.length === 0 && <p className="px-5 text-sm text-slate-600 italic">No payment methods stored.</p>}
            </div>

          </div>

          {/* Right Column: Linked Provider Accounts */}
          <div className="xl:col-span-2 space-y-6">
             <div className="flex items-center justify-between px-6 mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Active Provider Links</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Cross-Platform Verification Active</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {(linkedAccounts || []).map(account => (
                 <div key={account.id} className="p-6 rounded-[2.5rem] bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all"></div>
                    
                     <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center overflow-hidden">
                         {account.provider_branding ? (
                           <img src={account.provider_branding} alt="" className="w-8 h-8 object-contain" />
                         ) : (
                           <Globe size={24} className="text-slate-600" />
                         )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                         <button className="p-2 text-slate-500 hover:text-white"><Settings size={16} /></button>
                         <button className="p-2 text-slate-500 hover:text-amber-500"><ExternalLink size={16} /></button>
                      </div>
                    </div>

                    <h4 className="text-xl font-black tracking-tighter uppercase italic">{account.provider_name}</h4>
                    
                    <div className="mt-6 space-y-4">
                      {account.email_attached && (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                          <Mail size={14} className="text-amber-500/60" />
                          <span>{account.email_attached}</span>
                        </div>
                      )}
                      {account.payment_method_name && (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                          <Zap size={14} className="text-cyan-500/60" />
                          <span>Charged to: <span className="text-white">{account.payment_method_name}</span></span>
                        </div>
                      )}
                      {(account.membership_start_date || account.membership_end_date) && (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                          <Calendar size={14} className="text-purple-500/60" />
                          <span>Period: {account.membership_start_date || 'N/A'} — {account.membership_end_date || 'Active'}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase">Provider Status</p>
                        <p className={`text-xs font-black uppercase flex items-center gap-1.5 ${account.status === 'active' ? 'text-emerald-500' : 'text-slate-500'}`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${account.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span> {account.status}
                        </p>
                      </div>
                      {account.subscription_id && (
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-600 uppercase">Linked Subscription</p>
                            <p className="text-xs font-black text-blue-400 uppercase italic">{account.subscription_name || 'Linked'}</p>
                         </div>
                      )}
                    </div>
                 </div>
               ))}
               
               {linkedAccounts.length === 0 && (
                 <div className="col-span-full py-40 text-center rounded-[3.5rem] border border-dashed border-white/5 bg-white/2">
                    <h4 className="text-xl font-black text-slate-700 uppercase tracking-widest">No Accounts Connected</h4>
                    <p className="text-sm text-slate-700 mt-2 font-medium">Connect your providers to manage detailed transaction history.</p>
                 </div>
               )}
             </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentCentralPage;
