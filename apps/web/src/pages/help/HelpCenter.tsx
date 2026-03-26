import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Book, HelpCircle, PlayCircle, MessageSquare, AlertTriangle, ArrowRight } from 'lucide-react';

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
      topics: ['Variable Recurrences', 'Subscription Detection', 'Trial Alerts', 'Budget Rollovers']
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
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-4 opacity-70">Support Ecosystem</div>
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
                {React.cloneElement(cat.icon as React.ReactElement, { size: 28 })}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{cat.title}</h3>
              <p className="text-secondary text-sm leading-relaxed mb-6">{cat.description}</p>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary group-hover:gap-4 transition-all">
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
            className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-primary hover:text-white transition-all transform hover:scale-105 relative z-10 flex items-center gap-3"
          >
            <AlertTriangle size={16} />
            Report Issue
          </a>
        </section>

        <footer className="text-center pt-12 border-t border-white/5">
          <p className="text-secondary text-sm font-medium">
            LEDGER Documentation v1.31.0 &bull; Built for total financial sovereignty.
          </p>
        </footer>
      </div>
    </MainLayout>
  );
};
