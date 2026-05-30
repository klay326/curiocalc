'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = ['obsidian', 'crimson', 'terminal', 'ocean', 'ember', 'paper'] as const;
export type Theme = typeof THEMES[number];

export const THEME_META: Record<Theme, { label: string; dot: string; description: string }> = {
  obsidian: { label: 'Obsidian', dot: '#f59e0b', description: 'Charcoal & amber gold' },
  crimson:  { label: 'Crimson',  dot: '#ef2222', description: 'Dark with red accent' },
  terminal: { label: 'Terminal', dot: '#22c55e', description: 'Phosphor green on black' },
  ocean:    { label: 'Ocean',    dot: '#38bdf8', description: 'Deep navy & sky blue' },
  ember:    { label: 'Ember',    dot: '#f97316', description: 'Warm dark & copper glow' },
  paper:    { label: 'Paper',    dot: '#b45309', description: 'Warm ivory light mode' },
};

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'obsidian', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('obsidian');

  useEffect(() => {
    const saved = (localStorage.getItem('cc-theme') ?? 'obsidian') as Theme;
    const valid = THEMES.includes(saved) ? saved : 'obsidian';
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
