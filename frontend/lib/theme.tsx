'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = ['obsidian', 'crimson', 'terminal', 'ocean', 'ember', 'paper', 'linen', 'slate'] as const;
export type Theme = typeof THEMES[number];

export const THEME_META: Record<Theme, {
  label: string;
  dot: string;
  description: string;
  bg: string;
  mode: 'dark' | 'light';
}> = {
  obsidian: { label: 'Obsidian', dot: '#f59e0b', description: 'Charcoal & amber',      bg: '#141414', mode: 'dark'  },
  crimson:  { label: 'Crimson',  dot: '#ef2222', description: 'Dark & red',             bg: '#141414', mode: 'dark'  },
  terminal: { label: 'Terminal', dot: '#22c55e', description: 'Phosphor green',         bg: '#061006', mode: 'dark'  },
  ocean:    { label: 'Ocean',    dot: '#38bdf8', description: 'Navy & sky blue',        bg: '#05101e', mode: 'dark'  },
  ember:    { label: 'Ember',    dot: '#f97316', description: 'Warm & copper',          bg: '#180e08', mode: 'dark'  },
  paper:    { label: 'Paper',    dot: '#b45309', description: 'Warm ivory',             bg: '#f5ede0', mode: 'light' },
  linen:    { label: 'Linen',    dot: '#4f46e5', description: 'Soft white & indigo',   bg: '#fafaf8', mode: 'light' },
  slate:    { label: 'Slate',    dot: '#0284c7', description: 'Cool white & blue',     bg: '#f8fafc', mode: 'light' },
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
