import React, { useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { Send, CheckCircle, Info } from 'lucide-react';

export const SupportPortal: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'issue',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/ledger/api/support/issues`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });
      if (res.ok) setSubmitted(true);
    } catch (err) {
      console.error('Support submission failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-32 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle size={40} />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter">Issue Received</h1>
          <p className="text-secondary font-medium">Your report has been logged in the system vault. Our team will review the diagnostic data and respond to your linked email.</p>
          <button 
            onClick={() => window.location.hash = '#/help'}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Back to Help Center
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-12 space-y-12">
        <header className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Internal Comms</div>
          <h1 className="text-4xl font-black italic tracking-tighter">Support Portal</h1>
          <p className="text-secondary font-medium">Submit bug reports or feature requests directly to the ledger maintenance team.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary px-1">Subject</label>
              <input 
                required
                value={form.subject}
                onChange={e => setForm({...form, subject: e.target.value})}
                placeholder="Brief summary of the issue..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary px-1">Category</label>
              <select 
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
              >
                <option value="issue">Technical Bug / Issue</option>
                <option value="feature">Feature Request</option>
                <option value="billing">Billing & Access</option>
                <option value="other">General Inquiry</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary px-1">Detailed Message</label>
              <textarea 
                required
                rows={6}
                value={form.message}
                onChange={e => setForm({...form, message: e.target.value})}
                placeholder="Please describe exactly what happened..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? 'Submitting...' : 'Send Report'}
              <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </form>

          <aside className="space-y-8">
            <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Info size={16} className="text-primary" />
                Guidelines
              </h3>
              <ul className="text-xs text-secondary space-y-4 font-medium leading-relaxed">
                <li className="flex gap-3">
                  <span className="text-primary mt-0.5">&bull;</span>
                  Be as descriptive as possible when reporting bugs.
                </li>
                <li className="flex gap-3">
                  <span className="text-primary mt-0.5">&bull;</span>
                  Include steps to reproduce if applicable.
                </li>
                <li className="flex gap-3">
                  <span className="text-primary mt-0.5">&bull;</span>
                  Do NOT include sensitive financial passwords in this form.
                </li>
              </ul>
            </div>

            <div className="p-8 bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-[2rem]">
              <h4 className="font-bold text-white mb-2">Priority Response</h4>
              <p className="text-xs text-secondary font-medium leading-relaxed">
                Super Admin accounts receive expedited review for critical service interruptions.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
};
