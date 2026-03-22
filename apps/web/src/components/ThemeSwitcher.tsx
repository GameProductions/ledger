import React, { useEffect, useState } from 'react'

const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('cash_theme') || 'emerald')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cash_theme', theme)
  }, [theme])

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <button 
        onClick={() => setTheme('emerald')}
        style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#10b981', padding: 0, border: theme === 'emerald' ? '2px solid white' : 'none' }}
      />
      <button 
        onClick={() => setTheme('sapphire')}
        style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3b82f6', padding: 0, border: theme === 'sapphire' ? '2px solid white' : 'none' }}
      />
      <button 
        onClick={() => setTheme('ruby')}
        style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', padding: 0, border: theme === 'ruby' ? '2px solid white' : 'none' }}
      />
    </div>
  )
}

export default ThemeSwitcher
