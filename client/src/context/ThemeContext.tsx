import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'slate';

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  toggleMode: () => void;
  setColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'light';
  });
  
  const [color, setColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('themeColor') as ThemeColor) || 'purple';
  });

  // Load preferences from server when user logs in
  useEffect(() => {
    if (user) {
      axios.get('/api/user/preferences')
        .then(res => {
          const { mode: serverMode, color: serverColor } = res.data;
          if (serverMode) setMode(serverMode);
          if (serverColor) setColorState(serverColor);
        })
        .catch(err => console.error('Failed to load preferences:', err));
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', mode);
    localStorage.setItem('theme', mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-color', color);
    localStorage.setItem('themeColor', color);
  }, [color]);

  const saveToApi = (newMode: ThemeMode, newColor: ThemeColor) => {
    if (user) {
      axios.put('/api/user/preferences', { mode: newMode, color: newColor })
        .catch(err => console.error('Failed to save preferences:', err));
    }
  };

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    saveToApi(newMode, color);
  };

  const setColor = (newColor: ThemeColor) => {
    setColorState(newColor);
    saveToApi(mode, newColor);
  };

  return (
    <ThemeContext.Provider value={{ mode, color, toggleMode, setColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
