import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Play, Star, Shield, Compass } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ToursPage: React.FC = () => {
  const { showToast } = useToast();
  const tours = [
    {
      title: 'Full Platform Walkthrough',
      description: 'The standard 5-minute onboarding experience for new users.',
      icon: <Compass className="text-blue-400" />,
      action: 'Restart Tour'
    },
    {
      title: 'The Backup Hub Experience',
      description: 'Master multi-cloud redundancy and atomic restoration.',
      icon: <Shield className="text-purple-400" />,
      action: 'Start Experience'
    },
    {
      title: 'Admin Command Protocols',
      description: 'Administrator guide for global search and system config.',
      icon: <Star className="text-orange-400" />,
      action: 'Launch Protocol'
    }
  ];

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto py-12 space-y-12">
        <header className="space-y-4">
          <div className="text-xs font-black uppercase tracking-[0.4em] text-primary mb-2">Show Me How</div>
          <h1 className="text-4xl font-black italic tracking-tighter">Guided Tours</h1>
          <p className="text-secondary font-medium">Interactive overlay experiences that show you exactly where to click.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(tours || []).map((tour, i) => (
            <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {React.cloneElement(tour.icon as any, { size: 28 })}
                </div>
                <h3 className="text-xl font-bold tracking-tight">{tour.title}</h3>
                <p className="text-sm text-secondary font-medium leading-relaxed">{tour.description}</p>
              </div>
              
              <button 
                onClick={() => showToast(`Starting "${tour.title}"... Coming Soon!`, 'info')}
                className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white text-secondary hover:text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <Play size={14} fill="currentColor" />
                {tour.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};
