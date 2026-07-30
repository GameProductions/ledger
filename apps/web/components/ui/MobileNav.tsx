import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, MoreHorizontal, X, Wallet, Calendar, Zap, LogOut } from 'lucide-react';
import { navItems, SETTINGS_ITEM } from '../../lib/navigation';
import { useNavVisibility } from '../../hooks/useNavVisibility';

interface BarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  hash?: string;
}

const dashboardBarTabs: BarItem[] = [
  { id: 'overview', label: 'Wallet', icon: Wallet, hash: '#/' },
  { id: 'planning', label: 'Lifecycle', icon: Calendar, hash: '#/' },
  { id: 'insights', label: 'Advisor', icon: Zap, hash: '#/' },
];

const MobileNav: React.FC = () => {
  const [showMore, setShowMore] = useState(false);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview');
  const { isVisible } = useNavVisibility();

  useEffect(() => {
    const onHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);

    const handleTabChanged = (e: Event) => {
      const tabId = (e as CustomEvent).detail;
      if (tabId) setActiveDashboardTab(tabId);
    };
    window.addEventListener('dashboard-tab-changed', handleTabChanged);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('dashboard-tab-changed', handleTabChanged);
    };
  }, []);

  const isActive = (hash: string) => currentHash === hash;

  const navigate = (hash: string) => {
    window.location.hash = hash;
  };

  const handleTabClick = (id: string, hash?: string) => {
    if (hash) {
      navigate(hash);
      if (id === 'overview' || id === 'planning' || id === 'insights') {
        const event = new CustomEvent('set-dashboard-tab', { detail: id });
        window.dispatchEvent(event);
      }
    } else {
      setShowMore(true);
    }
  };

  const isOnDashboard = currentHash === '' || currentHash === '#/';

  // Visible nav items (excluding Settings which is always on the bar)
  const visibleItems = navItems.filter(i => isVisible(i.id));

  // Build the bottom bar dynamically
  const barTabs: BarItem[] = isOnDashboard
    ? [...dashboardBarTabs, SETTINGS_ITEM, { id: 'more', label: 'More', icon: MoreHorizontal }]
    : [
        { id: 'home', label: 'Home', icon: LayoutDashboard, hash: '#/' },
        ...visibleItems.slice(0, 2).map(i => ({ id: i.id, label: i.label, icon: i.icon, hash: i.hash })),
        SETTINGS_ITEM,
        { id: 'more', label: 'More', icon: MoreHorizontal },
      ];

  // Items for the overflow sheet: visible items not on the bar + Sign Out
  const onBarIds = new Set(barTabs.map(t => t.id));
  const overflowItems = [
    ...visibleItems.filter(i => !onBarIds.has(i.id) && i.id !== 'settings').map(i => ({
      id: i.id, label: i.label, icon: i.icon, hash: i.hash,
    })),
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-2 pb-3 sm:hidden">
        <nav
          className="card flex items-center justify-around py-2 px-1 bg-[#0f172a]/90 backdrop-blur-2xl border border-glass-border rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.4)]"
          style={{ justifyContent: barTabs.length <= 3 ? 'center' : undefined }}
        >
          {barTabs.map((item) => {
            const Icon = item.icon;
            const active = item.hash
              ? (item.id === 'overview' || item.id === 'planning' || item.id === 'insights'
                  ? isOnDashboard && activeDashboardTab === item.id
                  : isActive(item.hash))
              : false;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.hash)}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-all min-w-0 cursor-pointer ${
                  active
                    ? 'text-primary scale-110'
                    : 'text-secondary opacity-60 hover:opacity-100'
                } ${item.id === 'settings' ? 'min-w-0 flex-1' : barTabs.length > 4 ? 'flex-1' : ''}`}
              >
                <Icon size={18} />
                <span className="text-[9px] font-bold tracking-widest">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {showMore && (
        <div className="fixed inset-0 z-[60] sm:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#0f172a] border-t border-glass-border rounded-t-3xl p-6 pb-12 slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black tracking-widest text-secondary">More</h3>
              <button onClick={() => setShowMore(false)} className="p-2 hover:bg-white/5 rounded-xl text-secondary transition-all cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.hash!);
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.hash!); setShowMore(false); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer ${
                      active
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-white/5 text-secondary border border-transparent'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-[10px] font-bold tracking-widest">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t border-glass-border">
              <button
                onClick={() => { navigate('#/settings'); setShowMore(false); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl hover:bg-white/5 text-sm text-secondary transition-all cursor-pointer"
              >
                <Settings size={18} />
                <span className="font-bold tracking-widest">Settings</span>
              </button>
              <button
                onClick={() => { setShowMore(false); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl hover:bg-red-500/10 text-sm text-red-400 transition-all cursor-pointer mt-2"
              >
                <LogOut size={18} />
                <span className="font-bold tracking-widest">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
