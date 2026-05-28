'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme, THEMES, THEME_META } from '@/lib/theme';

export function Nav() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-mono transition-colors ${
        pathname === href ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span className="text-lg">🧮</span>
          <span>CurioCalc</span>
        </Link>

        <div className="flex items-center gap-5">
          {link('/', 'Browse')}
          {link('/brands', 'Brands')}
          {link('/trending', 'Trending')}
          {link('/trade', 'Trade')}
          {link('/top', 'Top')}
          {link('/contribute', 'Contribute')}
          {link('/compare', 'Compare')}
          {user ? (
            <>
              {link('/feed', 'Feed')}
              {link('/collection', 'Collection')}
              {link('/calculators/new', '+ Add')}
              {user.is_superuser && link('/admin', 'Admin')}
              <Link
                href={`/u/${user.username}`}
                className={`text-sm font-mono transition-colors ${
                  pathname.startsWith('/u/') ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                @{user.username}
              </Link>
              {link('/settings', '⚙')}
              <button
                onClick={logout}
                className="text-sm font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {link('/login', 'Sign in')}
              <Link
                href="/register"
                className="text-sm font-mono bg-amber-400 text-zinc-950 px-3 py-1.5 rounded-md font-bold hover:bg-amber-300 transition-colors"
              >
                Join
              </Link>
            </>
          )}

          {/* Theme picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker(v => !v)}
              title="Change theme"
              className="w-5 h-5 rounded-full border-2 border-zinc-700 hover:border-zinc-400 transition-colors flex-shrink-0"
              style={{ backgroundColor: THEME_META[theme].dot }}
            />

            {showPicker && (
              <div className="absolute right-0 top-8 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 w-44 z-50">
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2 px-1">Theme</p>
                <div className="space-y-0.5">
                  {THEMES.map(t => (
                    <button
                      key={t}
                      onClick={() => { setTheme(t); setShowPicker(false); }}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                        theme === t
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-white/10"
                        style={{ backgroundColor: THEME_META[t].dot }}
                      />
                      <span className="text-xs font-mono">{THEME_META[t].label}</span>
                      {theme === t && <span className="ml-auto text-[10px] text-zinc-500">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
