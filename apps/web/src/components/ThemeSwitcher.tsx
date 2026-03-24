import React, { useEffect, useState } from 'react'

const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('ledger_theme') || 'emerald')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ledger_theme', theme)
    
    // Attempt to sync with server-side settings
    const token = localStorage.getItem('ledger_token')
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings_json: JSON.stringify({ theme }) })
      }).catch(() => {}) // Silently fail for theme sync
    }
  }, [theme])

  return (
    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 1rem', borderRadius: '2rem', border: '1px solid var(--glass-border)' }}>
      <span style={{ fontSize: '0.7rem', opacity: 0.6, marginRight: '0.4rem' }}>THEME</span>
      <button 
        onClick={() => setTheme('emerald')}
        title="Emerald (Default)"
        style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10b981', padding: 0, border: theme === 'emerald' ? '2px solid white' : 'none', cursor: 'pointer' }}
      />
      <button 
        onClick={() => setTheme('sapphire')}
        title="Sapphire"
        style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6', padding: 0, border: theme === 'sapphire' ? '2px solid white' : 'none', cursor: 'pointer' }}
      />
      <button 
        onClick={() => setTheme('ruby')}
        title="Ruby"
        style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#ef4444', padding: 0, border: theme === 'ruby' ? '2px solid white' : 'none', cursor: 'pointer' }}
      />
      <button 
        onClick={() => setTheme('luxury')}
        title="Luxury (Gold & Black)"
        style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#d4af37', padding: 0, border: theme === 'luxury' ? '2px solid white' : 'none', cursor: 'pointer' }}
      />
      <button 
        onClick={() => setTheme('professional')}
        title="Professional (Slate)"
        style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#64748b', padding: 0, border: theme === 'professional' ? '2px solid white' : 'none', cursor: 'pointer' }}
      />
    </div>
  )
}

export default ThemeSwitcher
