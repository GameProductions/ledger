import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface ThemeColors {
  primary: string;
  secondary: string;
  gradient: string;
}

export interface Theme {
  id: string;
  name: string;
  category: 'Classic' | 'Premium' | 'Experimental';
  colors: ThemeColors;
  logoUrl: string;
  iconUrl: string;
}

export const ThemeRegistry: Theme[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    category: 'Classic',
    colors: { primary: '#10b981', secondary: '#3b82f6', gradient: 'radial-gradient(circle at 0% 0%, #1e293b 0%, #0f172a 50%, #020617 100%)' },
    logoUrl: '/assets/icon.png',
    iconUrl: '/assets/icon.png'
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    category: 'Classic',
    colors: { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'radial-gradient(circle at top left, #1e1b4b, #030617)' },
    logoUrl: '/assets/icon.png',
    iconUrl: '/assets/icon.png'
  },
  {
    id: 'ruby',
    name: 'Ruby',
    category: 'Classic',
    colors: { primary: '#ef4444', secondary: '#f97316', gradient: 'radial-gradient(circle at top left, #450a0a, #0a0a0b)' },
    logoUrl: '/assets/icon.png',
    iconUrl: '/assets/icon.png'
  },
  {
    id: 'luxury',
    name: 'Luxury',
    category: 'Premium',
    colors: { primary: '#d4af37', secondary: '#fcd34d', gradient: 'radial-gradient(circle at top right, #1a1a1a, #000000)' },
    logoUrl: '/assets/icon.png',
    iconUrl: '/assets/icon.png'
  },
  {
    id: 'professional',
    name: 'Professional',
    category: 'Classic',
    colors: { primary: '#64748b', secondary: '#3b82f6', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
    logoUrl: '/assets/icon.png',
    iconUrl: '/assets/icon.png'
  },
  {
    id: 'carbon',
    name: 'Carbon',
    category: 'Premium',
    colors: { primary: '#ffffff', secondary: '#475569', gradient: 'linear-gradient(to bottom, #111827, #000000)' },
    logoUrl: '/assets/icon.png',
    iconUrl: '/assets/icon.png'
  },
  {
    id: 'ember',
    name: 'Ember',
    category: 'Experimental',
    colors: { primary: '#f97316', secondary: '#fbbf24', gradient: 'radial-gradient(circle at 50% 120%, #451a03, #0c0a09)' },
    logoUrl: '/assets/icon.png',
    iconUrl: '/assets/icon.png'
  }
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [activeThemeId, setActiveThemeId] = useState<string>(localStorage.getItem('ledger_theme') || 'emerald');

  const theme = ThemeRegistry.find(t => t.id === activeThemeId) || ThemeRegistry[0];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.id);
    localStorage.setItem('ledger_theme', theme.id);
    
    // Sync to server if user is logged in
    if (token && user) {
       const currentSettings = JSON.parse(user.settings_json || '{}');
       if (currentSettings.theme !== theme.id) {
          fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ settings_json: JSON.stringify({ ...currentSettings, theme: theme.id }) })
          }).catch(() => {});
       }
    }
  }, [theme.id, token, user]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setActiveThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
