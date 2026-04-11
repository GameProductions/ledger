import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { ArrowLeft, Palette, Layout } from 'lucide-react'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { MainLayout } from '../components/layout/MainLayout'
import InviteManager from '../components/InviteManager'
import DeveloperSettings from '../components/DeveloperSettings'
import { ShieldCheck, Terminal } from 'lucide-react'

const PreferencesPage: React.FC = () => {
  const { token, householdId } = useAuth()
  const { data: profile } = useApi('/api/user/profile')
  const settings = JSON.parse(profile?.settings_json || '{}')

  const updateSettings = async (newSettings: any) => {
    if (!token) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ settings_json: JSON.stringify(newSettings) })
    })
    window.location.reload()
  }

  const toggleWidget = (widgetId: string) => {
    const layout = settings.dashboard_layout || {}
    const newSettings = {
      ...settings,
      dashboard_layout: {
        ...layout,
        [widgetId]: !layout[widgetId]
      }
    }
    updateSettings(newSettings)
  }

  const setUiStyle = (style: string) => {
    updateSettings({ ...settings, ui_style: style })
  }

  const widgets = [
    { id: 'healthScore', name: 'Financial Insights', desc: 'Health score and spending trends' },
    { id: 'recentTransactions', name: 'Recent Transactions', desc: 'Live feed of your latest activity' },
    { id: 'calendar', name: 'Financial Calendar', desc: 'Monthly view of upcoming bills and income' },
    { id: 'savingsBuckets', name: 'Savings Buckets', desc: 'Progress towards your financial goals' },
    { id: 'smartInsights', name: 'AI Smart Insights', desc: 'Personalized advice from the AI Coach' }
  ]

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
            <p className="text-secondary uppercase tracking-widest text-xs font-bold opacity-60">Customize your visual and functional experience</p>
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
                    className={`p-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest ${settings.ui_style === style ? 'border-primary bg-primary/10 text-primary' : 'border-glass-border bg-white/5 text-secondary hover:border-white/20'}`}
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
                    className={`p-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest ${settings.currency === c.id || (!settings.currency && c.id === 'USD') ? 'border-primary bg-primary/10 text-primary' : 'border-glass-border bg-white/5 text-secondary hover:border-white/20'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Layout size={20} className="text-secondary" />
                <h3 className="text-lg font-bold">Dashboard Layout</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Toggle which features are visible on your command center.</p>
              <div className="space-y-3">
                {widgets.map(w => (
                  <div 
                    key={w.id} 
                    onClick={() => toggleWidget(w.id)}
                    className="flex items-center justify-between p-4 bg-white/5 border border-glass-border rounded-2xl cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <div>
                      <div className="text-sm font-bold">{w.name}</div>
                      <div className="text-xs text-secondary">{w.desc}</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-all relative ${settings.dashboard_layout?.[w.id] !== false ? 'bg-primary' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.dashboard_layout?.[w.id] !== false ? 'right-1' : 'left-1'}`} />
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
              <p className="text-sm text-secondary mb-6">Configure webhooks and personal access tokens for API integrations.</p>
              <DeveloperSettings />
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default PreferencesPage
