import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Send, Github, MessageSquare, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Price } from './Price';

const SupportPortal: React.FC = () => {
  const { token, householdId } = useAuth();
  const { showToast } = useToast();
  const { data: issues, mutate } = useApi('/api/support/issues');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/support/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({
          ...formData,
          metadata: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });
      
      if (res.ok) {
        showToast('Support Request Sent', 'success');
        setFormData({ title: '', description: '', category: 'General', priority: 'medium' });
        mutate();
      } else {
        throw new Error('Failed to send request');
      }
    } catch (err) {
      showToast('Error sending support request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2">Forensic Support</h2>
          <p className="text-secondary text-sm uppercase tracking-widest font-bold opacity-60">Report issues or request system enhancements</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-white/5 border border-glass-border rounded-xl flex items-center gap-2">
             <Github size={16} className="text-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest opacity-60">GitHub Synced</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submission Form */}
        <section className="lg:col-span-2 card p-6 bg-deep/40 backdrop-blur-3xl border-glass-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
          
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-glass-border pb-4 uppercase tracking-tight">
            <MessageSquare size={18} className="text-primary" />
            New Service Ticket
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Subject / Headline</label>
              <input 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Briefly describe the issue..."
                className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-primary transition-all"
                required
                minLength={5}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Classification</label>
                <select 
                   value={formData.category}
                   onChange={e => setFormData({...formData, category: e.target.value})}
                   className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-primary transition-all appearance-none"
                >
                  <option value="General">General Inquiry</option>
                  <option value="Bug">Bug Report</option>
                  <option value="Feature">Feature Request</option>
                  <option value="Billing">Billing Issue</option>
                  <option value="Account">Account Security</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Priority Intake</label>
                <select 
                   value={formData.priority}
                   onChange={e => setFormData({...formData, priority: e.target.value})}
                   className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-primary transition-all appearance-none"
                >
                  <option value="low">Low - Future Polish</option>
                  <option value="medium">Medium - Standard Request</option>
                  <option value="high">High - Urgent Issue</option>
                  <option value="critical">Critical - System Blocker</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Detailed Dossier</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={6}
                placeholder="What happened? Steps to reproduce?"
                className="w-full bg-black/40 border border-glass-border rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-primary transition-all resize-none"
                required
                minLength={10}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg hover:shadow-primary/25 hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {isSubmitting ? 'Dispatching...' : 'Dispatch Support Ticket'}
            </button>
          </form>
        </section>

        {/* Previous Tickets */}
        <section className="space-y-6">
          <h3 className="text-secondary uppercase tracking-widest text-xs font-black px-2 mt-2 flex items-center justify-between">
            Active Tickets
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px]">{issues?.length || 0}</span>
          </h3>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {issues && issues.length > 0 ? (
              issues.map((issue: any) => (
                <div key={issue.id} className="card p-4 border-l-4 border-l-primary hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm truncate pr-2">{issue.title}</h4>
                    {issue.status === 'open' ? (
                      <Clock size={14} className="text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest opacity-40 mb-3">
                    <span className="text-primary">{issue.category}</span>
                    <span className="text-secondary">•</span>
                    <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                  {issue.github_issue_url && (
                    <a 
                      href={issue.github_issue_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                    >
                      <Github size={12} />
                      View on GitHub
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 card bg-white/5 border-dashed">
                <AlertCircle size={32} className="mx-auto text-secondary opacity-20 mb-3" />
                <p className="text-xs text-secondary italic opacity-40 uppercase tracking-widest">No active tickets</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SupportPortal;
