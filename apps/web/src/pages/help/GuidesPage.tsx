import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { ChevronRight, ArrowRight, Zap, Shield, RefreshCw, Fingerprint } from 'lucide-react';

export const GuidesPage: React.FC = () => {
  const guides = [
    {
      title: 'Getting Started with LEDGER',
      duration: '5 min read',
      icon: <Zap size={20} className="text-yellow-400" />,
      topics: ['First Login', 'Households', 'Syncing your first bank']
    },
    {
      title: 'Tabbed Dashboard Strategy',
      duration: '3 min read',
      icon: <ChevronRight size={20} className="text-primary" />,
      topics: ['Overview vs Activity', 'Planning Workspace', 'Insights & Health']
    },
    {
      title: 'Biometric Identity & Passkeys',
      duration: '6 min read',
      icon: <Fingerprint size={20} className="text-primary" />,
      topics: ['Enrolling Biometrics', 'Multi-Passkey Governance', 'Hardware Security Keys']
    },
    {
      title: 'Cross-Platform Identity Sync',
      duration: '4 min read',
      icon: <RefreshCw size={20} className="text-blue-400" />,
      topics: ['Discord/Google Linking', 'Avatar Sync', 'Asset Persistence on Unlink']
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
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none underline decoration-primary/40 underline-offset-8">Knowledge Base</h1>
          <p className="text-secondary font-medium mt-4">In-depth documentation for the ledger-savvy professional.</p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {guides.map((guide, i) => (
            <div key={i} className="group p-8 bg-black/40 hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent border border-white/5 rounded-[2.5rem] transition-all cursor-pointer relative overflow-hidden">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-2xl">
                    {guide.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tighter uppercase italic text-white group-hover:text-primary transition-colors">{guide.title}</h3>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-4">
                      <span>{guide.duration}</span>
                      <span className="opacity-30">|</span>
                      <span>{guide.topics.length} Sections</span>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                   <ChevronRight size={18} />
                </div>
              </div>
              
              <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                {guide.topics.map((t, j) => (
                  <span key={j} className="px-4 py-1.5 bg-white/5 rounded-xl text-[10px] font-black text-secondary uppercase tracking-widest border border-white/5">
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
      q: "What if I lose my biometric device?",
      a: "If your primary passkey is unavailable, you can use your forensic recovery protocol (Forgot Password) to receive a secure token via email. Alternatively, we recommend enrolling multiple passkeys (e.g., iPhone FaceID and a Yubikey) for redundancy."
    },
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
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">Common Questions</h1>
        </header>

        <div className="space-y-10">
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-4 group p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-6">
                <span className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-xs font-black border border-primary/20 shadow-2xl">Q</span>
                {faq.q}
              </h3>
              <p className="text-secondary font-medium leading-relaxed pl-16 opacity-80">
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        <div className="p-12 bg-primary/5 border border-dashed border-primary/20 rounded-[3rem] text-center space-y-6">
          <p className="text-secondary text-sm font-bold uppercase tracking-widest">Still have questions? Our support portal is active 24/7.</p>
          <button 
            onClick={() => window.location.hash = '#/help/support'}
            className="px-10 py-4 bg-primary text-black text-xs font-black uppercase tracking-[0.3em] rounded-full hover:scale-105 transition-all shadow-2xl shadow-primary/20 flex items-center gap-4 mx-auto"
          >
            Visit Support Portal <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </MainLayout>
  );
};
