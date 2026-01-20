import React, { createContext, useContext, useEffect, useState } from 'react';

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
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'light';
  });
  
  const [color, setColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('themeColor') as ThemeColor) || 'purple';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', mode);
    localStorage.setItem('theme', mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-color', color);
    localStorage.setItem('themeColor', color);
  }, [color]);

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  const setColor = (newColor: ThemeColor) => {
    setColorState(newColor);
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
