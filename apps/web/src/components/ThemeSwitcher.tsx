import React from 'react'
import { useTheme, ThemeRegistry } from '../context/ThemeContext'

const ThemeSwitcher: React.FC = () => {
  const { theme: activeTheme, setTheme } = useTheme()

  const categories = ['Classic', 'Premium', 'Experimental'] as const

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-glass-border" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary opacity-60">
              {category} Range
            </span>
            <div className="h-px flex-1 bg-glass-border" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ThemeRegistry.filter(t => t.category === category).map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${activeTheme.id === t.id ? 'border-primary bg-primary/5' : 'border-glass-border bg-white/5 hover:border-white/20'}`}
              >
                <div className="flex justify-between items-start z-10">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${activeTheme.id === t.id ? 'text-primary' : 'text-secondary'}`}>
                    {t.name}
                  </span>
                  {activeTheme.id === t.id && (
                    <span className="text-primary text-xs">✓</span>
                  )}
                </div>
                
                <div className="flex gap-1.5 z-10">
                  <div className="w-4 h-4 rounded-full shadow-lg" style={{ background: t.colors.primary }} />
                  <div className="w-4 h-4 rounded-full shadow-lg" style={{ background: t.colors.secondary }} />
                </div>

                {/* Theme Preview Background */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                  style={{ background: t.colors.gradient }}
                />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ThemeSwitcher
