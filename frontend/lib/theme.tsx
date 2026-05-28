'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = ['crimson', 'obsidian', 'terminal', 'ocean', 'ember', 'paper'] as const;
export type Theme = typeof THEMES[number];

export const THEME_META: Record<Theme, { label: string; dot: string; description: string }> = {
  crimson:  { label: 'Crimson',  dot: '#ef4444', description: 'Black & blood red (default)' },
  obsidian: { label: 'Obsidian', dot: '#f59e0b', description: 'Charcoal & amber gold' },
  terminal: { label: 'Terminal', dot: '#39ff14', description: 'Phosphor green on black' },
  ocean:    { label: 'Ocean',    dot: '#38bdf8', description: 'Deep navy & sky blue' },
  ember:    { label: 'Ember',    dot: '#f97316', description: 'Warm dark & orange glow' },
  paper:    { label: 'Paper',    dot: '#c2410c', description: 'Warm cream light mode' },
};

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'crimson', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('crimson');

  useEffect(() => {
    const saved = (localStorage.getItem('cc-theme') ?? 'crimson') as Theme;
    const valid = THEMES.includes(saved) ? saved : 'crimson';
    setThemeState(valid);
    document.documentElement.setAttribute('data-theme', valid);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('cc-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
