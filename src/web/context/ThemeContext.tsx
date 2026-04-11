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
  layoutVariant: 'standard' | 'luxury' | 'business';
  colors: ThemeColors;
  logoUrl: string;
  iconUrl: string;
}

export const ThemeRegistry: Theme[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    category: 'Classic',
    layoutVariant: 'standard',
    colors: { primary: '#10b981', secondary: '#3b82f6', gradient: 'radial-gradient(circle at 0% 0%, #1e293b 0%, #0f172a 50%, #020617 100%)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    category: 'Classic',
    layoutVariant: 'standard',
    colors: { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'radial-gradient(circle at top left, #1e1b4b, #030617)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  },
  {
    id: 'ruby',
    name: 'Ruby',
    category: 'Classic',
    layoutVariant: 'standard',
    colors: { primary: '#ef4444', secondary: '#f97316', gradient: 'radial-gradient(circle at top left, #450a0a, #0a0a0b)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  },
  {
    id: 'luxury',
    name: 'Luxury',
    category: 'Premium',
    layoutVariant: 'luxury',
    colors: { primary: '#d4af37', secondary: '#fcd34d', gradient: 'radial-gradient(circle at top right, #1a1a1a, #000000)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  },
  {
    id: 'professional',
    name: 'Professional',
    category: 'Classic',
    layoutVariant: 'business',
    colors: { primary: '#64748b', secondary: '#3b82f6', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  },
  {
    id: 'carbon',
    name: 'Carbon',
    category: 'Premium',
    layoutVariant: 'business',
    colors: { primary: '#ffffff', secondary: '#475569', gradient: 'linear-gradient(to bottom, #111827, #000000)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  },
  {
    id: 'ember',
    name: 'Ember',
    category: 'Experimental',
    layoutVariant: 'luxury',
    colors: { primary: '#f97316', secondary: '#fbbf24', gradient: 'radial-gradient(circle at 50% 120%, #451a03, #0c0a09)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  },
  {
    id: 'blood',
    name: 'Blood',
    category: 'Experimental',
    layoutVariant: 'luxury',
    colors: { primary: '#ff0000', secondary: '#991b1b', gradient: 'radial-gradient(circle at 50% 50%, #1a0505, #000000)' },
    logoUrl: '/assets/icon-512.png',
    iconUrl: '/assets/icon-512.png'
  }
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
  broadcastThemeId: string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [activeThemeId, setActiveThemeId] = useState<string>(localStorage.getItem('ledger_theme') || 'emerald');
  const [broadcastThemeId, setBroadcastThemeId] = useState<string | null>(null);

  // Fetch broadcast theme
  useEffect(() => {
    const fetchBroadcast = async () => {
      try {
        const res = await fetch(`/api/theme/broadcast`);
        const data = await res.json();
        if (data.themeId) setBroadcastThemeId(data.themeId);
      } catch (e) {}
    };
    fetchBroadcast();
    const interval = setInterval(fetchBroadcast, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const finalThemeId = broadcastThemeId || activeThemeId;
  const theme = ThemeRegistry.find(t => t.id === finalThemeId) || ThemeRegistry[0];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.id);
    document.documentElement.setAttribute('data-layout', theme.layoutVariant);
    localStorage.setItem('ledger_theme', activeThemeId);
    
    // Sync to server if user is logged in and not overridden by broadcast
    if (token && user && !broadcastThemeId) {
       const currentSettings = JSON.parse(user.settings_json || '{}');
       if (currentSettings.theme !== activeThemeId) {
          fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ settings_json: JSON.stringify({ ...currentSettings, theme: activeThemeId }) })
          }).catch(() => {});
       }
    }
  }, [theme.id, activeThemeId, broadcastThemeId, token, user, theme.layoutVariant]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setActiveThemeId, broadcastThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
