import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Book, HelpCircle, PlayCircle, MessageSquare, AlertTriangle, ArrowRight, Search } from 'lucide-react';
import { HelpCenter as FoundationHelp } from '../../components/foundation/help/HelpCenter';

export const HelpCenter: React.FC = () => {
  const categories = [
    {
      id: 'guides',
      title: 'Knowledge Base',
      description: 'Step-by-step guides for mastering your financial ledger.',
      icon: <Book className="text-blue-400" />,
      hash: '#/help/guides'
    },
    {
      id: 'faqs',
      title: 'Frequently Asked Questions',
      description: 'Quick answers to common questions about security and sync.',
      icon: <HelpCircle className="text-purple-400" />,
      hash: '#/help/faq',
      topics: ['Flexible bill dates', 'Automatic bill tracking', 'Trial Alerts', 'Monthly carryover']
    },
    {
      id: 'tours',
      title: 'Guided Tours',
      description: 'Interactive walkthroughs of complex platform features.',
      icon: <PlayCircle className="text-emerald-400" />,
      hash: '#/help/tours'
    },
    {
      id: 'support',
      title: 'Support Portal',
      description: 'Contact our team or report technical issues directly.',
      icon: <MessageSquare className="text-orange-400" />,
      hash: '#/help/support'
    }
  ];

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-16 py-12">
        <header className="text-center space-y-4">
          <div className="text-xs font-black uppercase tracking-[0.4em] text-primary mb-4 opacity-70">Support Center</div>
          <h1 className="text-5xl font-black italic tracking-tighter text-white">How can we help you?</h1>
          <p className="text-secondary text-lg max-w-2xl mx-auto font-medium">
            Master the LEDGER platform with our comprehensive documentation and direct support channels.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <a 
              key={cat.id}
              href={cat.hash}
              className="group p-8 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-3xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-3xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {React.cloneElement(cat.icon as any, { size: 28 })}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{cat.title}</h3>
              <p className="text-secondary text-sm leading-relaxed mb-6">{cat.description}</p>
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary group-hover:gap-4 transition-all">
                Explore Module <ArrowRight size={14} />
              </div>
            </a>
          ))}
        </div>

        <section className="p-12 bg-primary/10 border border-primary/20 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] -mr-48 -mt-48 group-hover:bg-primary/30 transition-colors" />
          <div className="space-y-4 relative z-10">
            <h2 className="text-3xl font-black italic tracking-tighter text-white">Report an Emergency</h2>
            <p className="text-secondary max-w-md font-medium">
              Experiencing a critical sync error or security concern? Our priority response team is standing by.
            </p>
          </div>
          <a 
            href="#/help/support?emergency=true"
            className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-primary hover:text-white transition-all transform hover:scale-105 relative z-10 flex items-center gap-3"
          >
            <AlertTriangle size={16} />
            Report Issue
          </a>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <Search className="text-primary" size={24} />
            <h2 className="text-2xl font-black italic tracking-tighter text-white">Universal Search</h2>
          </div>
          <div className="glass-card p-1">
            <FoundationHelp items={[
              { id: '1', category: 'Basics', title: 'Wallet & Safe-to-Spend', content: 'Master your real-time spendable balance. LEDGER calculates exactly how much you can spend after accounting for upcoming bills and goals.' },
              { id: '2', category: 'Planning', title: 'Spending Forecast', content: 'See your future balance. Our 6-month forecast predicts your balance based on your bills and past spending.' },
              { id: '3', category: 'Automation', title: 'Smart Matching', content: 'Connect bank entries automatically. We find patterns between your bank data and manual entries to keep your records perfectly balanced.' },
              { id: '4', category: 'Security', title: 'High-Level Protection', content: 'Your privacy is paramount. LEDGER uses high-level security protection, ensuring your financial data never leaves your device unencrypted. We have moved away from traditional passwords to more secure biometric login methods.' },
              { id: '5', category: 'Lifecycle', title: 'Flexible Paydays', content: 'Manage unusual income. Set up paydays that don’t happen on the same day every month to keep your records accurate.' },
              { id: '6', category: 'Advanced', title: 'Budget Folders', content: 'Organize every dollar. Set aside money for specific needs and track how much you have left to spend each month.' },
              { id: '7', category: 'Security', title: 'Identity Verification', content: 'Protect your sensitive actions. Important settings and data changes require a quick identity check using your phone or a secure physical key (FaceID, TouchID, or Security Key).' },
              { id: '8', category: 'Admin', title: 'Security Health Monitoring', content: 'Universal management. Administrators can review security records and monitor overall system safety without ever seeing your private information.' },
              { id: '9', category: 'System', title: 'Instant Data Updates', content: 'Always stay current. When you add or delete a transaction, your entire ledger and dashboard update immediately without needing to refresh the page.' },
              { id: '10', category: 'System', title: 'Automatic Recovery', content: 'Always up to date. If the app detects a newer version is available, it automatically updates itself to ensure you have the latest features and security.' }
            ]} />
          </div>
        </section>


      </div>
    </MainLayout>
  );
};
