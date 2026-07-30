import React from 'react'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'
import { useApi } from '../hooks/useApi'
import { ArrowLeft, Palette, Layout, ShieldCheck, Terminal, Settings as SettingsIcon } from 'lucide-react'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { MainLayout } from '../components/layout/MainLayout'
import InviteManager from '../components/InviteManager'
import DeveloperSettings from '../components/DeveloperSettings'
import { DASHBOARD_TABS, toggleWidgetInLayout } from '../lib/dashboardWidgets'
import { navItems, adminNavItems } from '../lib/navigation'
import type { NavVisibility } from '../lib/navigation'

const PreferencesPage: React.FC = () => {
  const { token, householdId, globalRole } = useAuth()
  const { data: profile } = (useApi('/api/user/profile') as any)
  const settings = JSON.parse(profile?.settingsJson || '{}')

  const isOwnerOrAdmin = globalRole === 'owner' || globalRole === 'super_admin' || profile?.globalRole === 'owner'

  const updateSettings = async (newSettings: any) => {
    if (!token) return
    const apiUrl = getApiUrl()
    await fetch(`${apiUrl}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ settingsJson: JSON.stringify(newSettings) })
    })
    window.location.reload()
  }

  const toggleWidget = (widgetId: string) => {
    const newLayout = toggleWidgetInLayout(settings.dashboardLayout, widgetId)
    updateSettings({ ...settings, dashboardLayout: newLayout })
  }

  const toggleNavItem = (id: string) => {
    const navVis: NavVisibility = settings.navigationVisibility || {}
    updateSettings({ ...settings, navigationVisibility: { ...navVis, [id]: !navVis[id] } })
  }

  const setUiStyle = (style: string) => {
    updateSettings({ ...settings, uiStyle: style })
  }

  const isWidgetVisible = (widgetId: string): boolean => {
    const layout = settings.dashboardLayout
    if (!layout) return true
    for (const tab of DASHBOARD_TABS) {
      const tabWidgets = layout[tab.tabId]
      if (tabWidgets) {
        const w = tabWidgets.find((w: any) => w.id === widgetId)
        if (w) return w.visible !== false
      }
    }
    return true
  }

  const isNavVisible = (id: string): boolean => {
    const navVis: NavVisibility = settings.navigationVisibility || {}
    return navVis[id] !== false
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => window.location.hash = '#/'}
            className="p-2 rounded-full hover:bg-white/10 text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Palette className="text-primary" size={32} />
              Preferences
            </h1>
            <p className="text-secondary tracking-widest text-xs font-bold opacity-60">Customize your visual and functional experience</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <section className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Palette size={20} className="text-primary" />
                <h3 className="text-lg font-bold">Theme & Branding</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Select a color palette that suits your style. This synchronizes across all your devices.</p>
              <ThemeSwitcher />
            </section>

            <section className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Layout size={20} className="text-primary" />
                <h3 className="text-lg font-bold">Interface Style</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Choose the visual aesthetic of the platform's components.</p>
              <div className="grid grid-cols-3 gap-3">
                {['default', 'glass', 'minimal'].map(style => (
                  <button 
                    key={style}
                    onClick={() => setUiStyle(style)}
                    className={`p-3 rounded-xl border-2 transition-all text-xs font-black tracking-widest ${settings.uiStyle === style ? 'border-primary bg-primary/10 text-primary' : 'border-glass-border bg-white/5 text-secondary hover:border-white/20'}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </section>

            <section className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Palette size={20} className="text-primary" />
                <h3 className="text-lg font-bold">Currency Configuration</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Choose your primary display currency. This affects all price formatting across the platform.</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'USD', name: 'US Dollar ($)' },
                  { id: 'EUR', name: 'Euro (€)' },
                  { id: 'GBP', name: 'British Pound (£)' }
                ].map(c => (
                  <button 
                    key={c.id}
                    onClick={() => updateSettings({ ...settings, currency: c.id })}
                    className={`p-3 rounded-xl border-2 transition-all text-xs font-black tracking-widest ${settings.currency === c.id || (!settings.currency && c.id === 'USD') ? 'border-primary bg-primary/10 text-primary' : 'border-glass-border bg-white/5 text-secondary hover:border-white/20'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Layout size={20} className="text-primary" />
                <h3 className="text-lg font-bold">Menu Navigation</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Toggle which pages appear in the dropdown menu and mobile navigation.</p>
              <div className="space-y-3">
                {navItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleNavItem(item.id)}
                    className="flex items-center justify-between p-4 bg-white/5 border border-glass-border rounded-2xl cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className="text-secondary" />
                      <div>
                        <div className="text-sm font-bold">{item.label}</div>
                      </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-all relative ${isNavVisible(item.id) ? 'bg-primary' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isNavVisible(item.id) ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-4 bg-white/5 border border-glass-border rounded-2xl opacity-50">
                  <div className="flex items-center gap-3">
                    <SettingsIcon size={18} className="text-secondary" />
                    <div>
                      <div className="text-sm font-bold">My Settings</div>
                      <div className="text-[10px] text-secondary">Always visible</div>
                    </div>
                  </div>
                </div>
              </div>
              {isOwnerOrAdmin && (
                <div className="mt-4 pt-4 border-t border-glass-border">
                  <p className="text-xs text-secondary font-bold tracking-widest mb-3">Admin Portal</p>
                  <div className="space-y-3">
                    {adminNavItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleNavItem(item.id)}
                        className="flex items-center justify-between p-4 bg-white/5 border border-glass-border rounded-2xl cursor-pointer hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={18} className="text-secondary" />
                          <div>
                            <div className="text-sm font-bold">{item.label}</div>
                          </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-all relative ${isNavVisible(item.id) ? 'bg-primary' : 'bg-white/10'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isNavVisible(item.id) ? 'right-1' : 'left-1'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <section className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Layout size={20} className="text-secondary" />
                <h3 className="text-lg font-bold">Dashboard Layout</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Toggle which widgets are visible on each dashboard tab.</p>
              <div className="space-y-6">
                {DASHBOARD_TABS.map(tab => (
                  <div key={tab.tabId}>
                    <h4 className="text-xs font-black tracking-widest text-secondary uppercase mb-3">{tab.tabLabel}</h4>
                    <div className="space-y-2">
                      {tab.widgets.map(w => (
                        <div
                          key={w.id}
                          onClick={() => toggleWidget(w.id)}
                          className="flex items-center justify-between p-3 bg-white/5 border border-glass-border rounded-xl cursor-pointer hover:bg-white/10 transition-all"
                        >
                          <div>
                            <div className="text-sm font-bold">{w.name}</div>
                            <div className="text-[10px] text-secondary">{w.desc}</div>
                          </div>
                          <div className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ml-3 ${isWidgetVisible(w.id) ? 'bg-primary' : 'bg-white/10'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isWidgetVisible(w.id) ? 'right-1' : 'left-1'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck size={20} className="text-secondary" />
                <h3 className="text-lg font-bold">Household Management</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Manage roles and invite partners to collaborate on your household finances.</p>
              <InviteManager />
            </section>

            <section className="card p-8 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <Terminal size={20} className="text-primary" />
                <h3 className="text-lg font-bold text-primary">Advanced Developer Tools</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Configure webhooks and personal access tokens for service connections.</p>
              <DeveloperSettings />
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default PreferencesPage
