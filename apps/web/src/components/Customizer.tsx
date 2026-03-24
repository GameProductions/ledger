import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface CustomizerProps {
  settings: any
  onUpdate: (newSettings: any) => void
}

const Customizer: React.FC<CustomizerProps> = ({ settings, onUpdate }) => {
  const { token } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const toggleWidget = (widgetId: string) => {
    const layout = settings.dashboard_layout || {}
    const newSettings = {
      ...settings,
      dashboard_layout: {
        ...layout,
        [widgetId]: !layout[widgetId]
      }
    }
    onUpdate(newSettings)
  }

  const widgets = [
    { id: 'healthScore', name: 'Financial Intelligence' },
    { id: 'recentTransactions', name: 'Recent Transactions' },
    { id: 'calendar', name: 'Financial Calendar' },
    { id: 'savingsBuckets', name: 'Savings Buckets' },
    { id: 'smartInsights', name: 'AI Smart Insights' }
  ]

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '50px', height: '50px', borderRadius: '50%', 
          background: 'var(--primary)', border: 'none', color: 'white', 
          fontSize: '1.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' 
        }}
      >
        {isOpen ? '✕' : '⚙️'}
      </button>

      {isOpen && (
        <div className="card reveal" style={{ 
          position: 'absolute', bottom: '60px', right: 0, 
          width: '300px', padding: '1.5rem', background: 'var(--bg-card)', 
          border: '1px solid var(--glass-border)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' 
        }}>
          <h3 style={{ marginBottom: '1rem' }}>Personalize Dashboard</h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <section>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Visible Widgets</h4>
              {widgets.map(w => (
                <label key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.3rem 0' }}>
                  <span style={{ fontSize: '0.9rem' }}>{w.name}</span>
                  <input 
                    type="checkbox" 
                    checked={settings.dashboard_layout?.[w.id] !== false} 
                    onChange={() => toggleWidget(w.id)}
                  />
                </label>
              ))}
            </section>

            <section>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Visual Overrides</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['default', 'glass', 'minimal'].map(style => (
                  <button 
                    key={style}
                    onClick={() => onUpdate({ ...settings, ui_style: style })}
                    style={{ 
                      flex: 1, padding: '0.4rem', fontSize: '0.7rem', 
                      background: settings.ui_style === style ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--glass-border)', borderRadius: '0.4rem'
                    }}
                  >
                    {style.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <button 
            className="primary" 
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={() => setIsOpen(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

export default Customizer
