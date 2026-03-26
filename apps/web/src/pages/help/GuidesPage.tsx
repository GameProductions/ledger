import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { ChevronRight, ExternalLink, Zap, Shield, RefreshCw } from 'lucide-react';

export const GuidesPage: React.FC = () => {
  const guides = [
    {
      title: 'Getting Started with LEDGER',
      duration: '5 min read',
      icon: <Zap size={20} className="text-yellow-400" />,
      topics: ['First Login', 'Households', 'Syncing your first bank']
    },
    {
      title: 'Multi-Cloud Security Architecture',
      duration: '8 min read',
      icon: <Shield size={20} className="text-blue-400" />,
      topics: ['OAuth Scopes', 'Encrypted Backups', 'Token Shredding']
    },
    {
      title: 'Advanced Scheduling & Automation',
      duration: '10 min read',
      icon: <RefreshCw size={20} className="text-emerald-400" />,
      topics: ['Variable Recurrences', 'Subscription Detection', 'Cron Patterns']
    }
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-12 space-y-12">
        <header className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Mastery Guides</div>
          <h1 className="text-4xl font-black italic tracking-tighter">Knowledge Base</h1>
          <p className="text-secondary font-medium">In-depth documentation for the ledger-savvy professional.</p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {guides.map((guide, i) => (
            <div key={i} className="group p-8 bg-white/5 hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent border border-white/5 rounded-[2rem] transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    {guide.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">{guide.title}</h3>
                    <div className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-4">
                      <span>{guide.duration}</span>
                      <span className="opacity-30">|</span>
                      <span>{guide.topics.length} Sections</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="opacity-0 group-hover:opacity-50 transition-all group-hover:translate-x-2" />
              </div>
              
              <div className="mt-8 flex flex-wrap gap-3">
                {guide.topics.map((t, j) => (
                  <span key={j} className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-bold text-secondary uppercase tracking-widest">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export const FAQPage: React.FC = () => {
  const faqs = [
    {
      q: "Where is my data stored physically?",
      a: "Your data is stored in Cloudflare's D1 distributed SQL database, while your cloud backups are pushed directly to your personal GDrive, Dropbox, or OneDrive storage. LEDGER does not maintain a copy outside of your household territory."
    },
    {
      q: "Can I use LEDGER without a bank sync?",
      a: "Absolutely. You can use the 'manual ledger' mode by creating manual accounts and importing CSV/JSON/QIF files directly via the Data Interop workstation."
    },
    {
      q: "How secure is my bank connection?",
      a: "We use AES-GCM 256-bit encryption for all external tokens. We never store your bank passwords; we only hold revocable OAuth access tokens granted by providers like Plaid or Akoya."
    }
  ];

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto py-12 space-y-12">
        <header className="space-y-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">FAQ Engine</div>
          <h1 className="text-4xl font-black italic tracking-tighter">Common Questions</h1>
        </header>

        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-black">Q</span>
                {faq.q}
              </h3>
              <p className="text-secondary font-medium leading-relaxed pl-12">
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        <div className="p-8 bg-white/5 border border-dashed border-white/20 rounded-3xl text-center">
          <p className="text-secondary text-sm mb-4 font-medium">Still have questions? Our support portal is active 24/7.</p>
          <button 
            onClick={() => window.location.hash = '#/help/support'}
            className="text-xs font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2 mx-auto"
          >
            Visit Support Portal <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </MainLayout>
  );
};
