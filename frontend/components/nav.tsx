'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme, THEMES, THEME_META, type Theme } from '@/lib/theme';
import { api, type NotificationItem as Notification } from '@/lib/api';

// ── Message badge ─────────────────────────────────────────────────────────────

function MessagesBadge() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetch = () =>
      api.messages.unreadCount()
        .then(r => { if (!cancelled) setUnread(r.count); })
        .catch(() => {});
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <Link href="/messages" className="relative text-zinc-500 hover:text-zinc-200 transition-colors p-1" aria-label="Messages">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-green-400 text-zinc-950 text-[9px] font-bold font-mono rounded-full flex items-center justify-center leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}

// ── Notification bell ────────────────────────────────────────────────────────

function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Poll unread count every 60 s
  useEffect(() => {
    let cancelled = false;
    const fetch = () =>
      api.notifications.unreadCount()
        .then(n => { if (!cancelled) setUnread(n); })
        .catch(() => {});
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openPanel = async () => {
    setOpen(v => !v);
    if (!loaded) {
      const data = await api.notifications.list().catch(() => ({ unread: 0, notifications: [] }));
      setItems(data.notifications);
      setUnread(data.unread);
      setLoaded(true);
    }
    // mark read after short delay so user sees the badge before it clears
    setTimeout(() => {
      api.notifications.markRead().then(() => setUnread(0)).catch(() => {});
    }, 1500);
  };

  const notifLabel = (n: Notification) => {
    const actor = n.actor_display_name ?? n.actor_username ?? 'Someone';
    if (n.type === 'follow') return `${actor} followed you`;
    if (n.type === 'comment') return `${actor} commented on ${n.calc_make} ${n.calc_model}`;
    return n.body ?? '';
  };

  const notifHref = (n: Notification) => {
    if (n.type === 'follow' && n.actor_username) return `/u/${n.actor_username}`;
    if (n.type === 'comment' && n.calc_id) return `/calculators/${n.calc_id}`;
    return '#';
  };

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPanel}
        className="relative text-zinc-500 hover:text-zinc-200 transition-colors p-1"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-amber-400 text-zinc-950 text-[9px] font-bold font-mono rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-mono font-bold text-zinc-300 hover:text-amber-400 transition-colors">
              Notifications
            </Link>
            {items.length > 0 && (
              <button
                onClick={() => { api.notifications.markRead().catch(() => {}); setUnread(0); setItems(i => i.map(n => ({ ...n, read: true }))); }}
                className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                mark all read
              </button>
            )}
          </div>
          {!loaded ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-zinc-600 font-mono text-xs">No notifications yet</p>
          ) : (
            <>
              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/60">
                {items.map(n => (
                  <Link
                    key={n.id}
                    href={notifHref(n)}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors ${!n.read ? 'bg-amber-400/5' : ''}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-900/40 border border-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                      {n.actor_avatar_url
                        ? <img src={n.actor_avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[11px] font-bold text-amber-400 font-mono">
                            {(n.actor_display_name ?? n.actor_username ?? '?').charAt(0).toUpperCase()}
                          </span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-zinc-300 leading-snug">
                        {notifLabel(n)}
                      </p>
                      {n.body && n.type === 'comment' && (
                        <p className="text-[10px] font-mono text-zinc-600 mt-0.5 truncate italic">"{n.body}"</p>
                      )}
                      <p className="text-[10px] font-mono text-zinc-700 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />}
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-zinc-800">
                <Link href="/notifications" onClick={() => setOpen(false)}
                  className="text-[11px] font-mono text-zinc-500 hover:text-amber-400 transition-colors">
                  View all notifications →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Theme picker dropdown ─────────────────────────────────────────────────────

const DARK_THEMES:  Theme[] = ['obsidian', 'crimson', 'terminal', 'ocean', 'ember'];
const LIGHT_THEMES: Theme[] = ['paper', 'linen', 'slate'];

function ThemePickerDropdown({ current, onPick }: { current: Theme; onPick: (t: Theme) => void }) {
  return (
    <div className="absolute right-0 top-8 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2.5 w-52 z-50">
      {/* Dark group */}
      <p className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest px-1 pb-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        Dark
      </p>
      <div className="space-y-0.5">
        {DARK_THEMES.map(t => <ThemeRow key={t} t={t} active={current === t} onPick={onPick} />)}
      </div>

      <div className="my-2 border-t border-zinc-800" />

      {/* Light group */}
      <p className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest px-1 pb-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        Light
      </p>
      <div className="space-y-0.5">
        {LIGHT_THEMES.map(t => <ThemeRow key={t} t={t} active={current === t} onPick={onPick} />)}
      </div>
    </div>
  );
}

function ThemeRow({ t, active, onPick }: { t: Theme; active: boolean; onPick: (t: Theme) => void }) {
  const meta = THEME_META[t];
  const isLight = meta.mode === 'light';
  return (
    <button
      onClick={() => onPick(t)}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
        active ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
      }`}
    >
      <span
        className={`w-8 h-5 rounded flex-shrink-0 overflow-hidden relative ${isLight ? 'border border-zinc-700/60' : ''}`}
        style={{ background: meta.bg }}
      >
        <span className="absolute bottom-0 left-0 right-0 h-[6px]" style={{ background: meta.dot }} />
      </span>
      <span className={`text-xs font-mono flex-1 ${active ? 'text-zinc-100' : 'text-zinc-400'}`}>
        {meta.label}
      </span>
      {active && <span className="text-[10px] text-zinc-500">✓</span>}
    </button>
  );
}

// ── Bottom tab bar (mobile only) ─────────────────────────────────────────────

function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const cls = (href: string) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2 ${
      isActive(href) ? 'text-amber-400' : 'text-zinc-500 active:text-zinc-300'
    }`;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-14">
        <Link href="/" className={cls('/')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[10px] font-mono">Browse</span>
        </Link>
        <Link href="/trade" className={cls('/trade')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          <span className="text-[10px] font-mono">Trade</span>
        </Link>
        <Link href="/collection" className={cls('/collection')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          <span className="text-[10px] font-mono">Collection</span>
        </Link>
        <Link href={user ? `/u/${user.username}` : '/login'} className={cls(user ? `/u/${user.username}` : '/login')}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-zinc-700" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          )}
          <span className="text-[10px] font-mono">{user ? (user.display_name ?? user.username).split(' ')[0].slice(0, 8) : 'Sign in'}</span>
        </Link>
      </div>
    </nav>
  );
}

// ── Main nav ─────────────────────────────────────────────────────────────────

export function Nav() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [showPicker, setShowPicker] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pickTheme = (t: (typeof THEMES)[number]) => {
    setTheme(t);
    setShowPicker(false);
    if (user) {
      api.users.updateMe({ theme: t }).catch(() => {});
    }
  };
  const pickerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click — use data attr so both desktop + mobile divs are covered
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-theme-picker]')) setShowPicker(false);
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Close menus on navigation
  useEffect(() => { setMenuOpen(false); setUserMenuOpen(false); }, [pathname]);

  const isActive = useCallback((href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href), [pathname]);

  const linkCls = (href: string) =>
    `text-sm font-mono transition-colors ${isActive(href) ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'}`;

  const mobileLinkCls = (href: string) =>
    `block px-4 py-3 font-mono text-sm transition-colors border-b border-zinc-800/60 ${isActive(href) ? 'text-amber-400 bg-amber-400/5' : 'text-zinc-300 hover:bg-zinc-800/50'}`;

  const primaryLinks = [
    { href: '/', label: 'Browse' },
    { href: '/brands', label: 'Brands' },
    { href: '/trending', label: 'Trending' },
    { href: '/trade', label: 'Trade' },
  ];

  const moreLinks = [
    { href: '/timeline', label: 'Timeline' },
    { href: '/top', label: 'Top collectors' },
    { href: '/compare', label: 'Compare' },
    { href: '/collector-compare', label: 'Compare collectors' },
    { href: '/contribute', label: 'Contribute' },
  ];

  // Mobile drawer only shows secondary/utility links — primary nav is in bottom tab bar
  const mobileDiscoverLinks = [
    { href: '/brands', label: 'Brands' },
    { href: '/trending', label: 'Trending' },
    { href: '/timeline', label: 'Timeline' },
    { href: '/top', label: 'Top collectors' },
    { href: '/compare', label: 'Compare calcs' },
    { href: '/collector-compare', label: 'Compare collectors' },
    { href: '/contribute', label: 'Contribute' },
  ];

  return (
    <>
      <nav className="nav-safe-top border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0">
            <span className="text-lg">🧮</span>
            <span>CurioCalc</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-5">
            {primaryLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={linkCls(href)}>{label}</Link>
            ))}

            {user ? (
              <>
                <MessagesBadge />
                <NotificationBell />
                {/* User dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className={`flex items-center gap-1 text-sm font-mono transition-colors ${
                      userMenuOpen ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    @{user.username}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-50">
                      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-9 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                      <Link href={`/u/${user.username}`} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                        Profile
                      </Link>
                      <Link href="/collection" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                        Collection
                      </Link>
                      <Link href="/feed" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                        Feed
                      </Link>
                      <Link href="/messages" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                        ✉ Messages
                      </Link>
                      <div className="border-t border-zinc-800 my-1" />
                      <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                        Settings
                      </Link>
                      {(user.is_superuser || user.is_curator) && (
                        <Link href="/calculators/new" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                          + Add calculator
                        </Link>
                      )}
                      {user.is_superuser && (
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                          Admin
                        </Link>
                      )}
                      <div className="border-t border-zinc-800 my-1" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-mono text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className={linkCls('/login')}>Sign in</Link>
                <Link href="/register" className="text-sm font-mono bg-amber-400 text-zinc-950 px-3 py-1.5 rounded-md font-bold hover:bg-amber-300 transition-colors">
                  Join
                </Link>
              </>
            )}

            {/* Theme dot */}
            <div className="relative" ref={pickerRef} data-theme-picker>
              <button
                onClick={() => setShowPicker(v => !v)}
                title="Change theme"
                className="w-5 h-5 rounded-full border-2 border-zinc-700 hover:border-zinc-400 transition-colors flex-shrink-0"
                style={{ backgroundColor: THEME_META[theme].dot }}
              />
              {showPicker && <ThemePickerDropdown current={theme} onPick={pickTheme} />}
            </div>
          </div>

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-3">
            {user && <NotificationBell />}
            {/* Theme dot */}
            <div className="relative" ref={pickerRef} data-theme-picker>
              <button
                onClick={() => setShowPicker(v => !v)}
                title="Change theme"
                className="w-5 h-5 rounded-full border-2 border-zinc-700 hover:border-zinc-400 transition-colors"
                style={{ backgroundColor: THEME_META[theme].dot }}
              />
              {showPicker && <ThemePickerDropdown current={theme} onPick={pickTheme} />}
            </div>
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="text-zinc-400 hover:text-zinc-100 transition-colors p-1"
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      <BottomTabBar />

      {/* Mobile drawer — secondary links only (primary nav is in bottom tab bar) */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-zinc-950 overflow-y-auto"
          style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
          <div className="pt-1 pb-6">
            <p className="px-4 pt-3 pb-1 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Discover</p>
            {mobileDiscoverLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={mobileLinkCls(href)}>{label}</Link>
            ))}

            {user ? (
              <>
                <p className="px-4 pt-4 pb-1 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Account</p>
                <Link href="/feed" className={mobileLinkCls('/feed')}>Feed</Link>
                <Link href="/messages" className={mobileLinkCls('/messages')}>Messages</Link>
                <Link href="/settings" className={mobileLinkCls('/settings')}>Settings</Link>
                {(user.is_superuser || user.is_curator) && <Link href="/calculators/new" className={mobileLinkCls('/calculators/new')}>+ Add calculator</Link>}
                {user.is_superuser && <Link href="/admin" className={mobileLinkCls('/admin')}>Admin</Link>}
                <div className="px-4 pt-4">
                  <button onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full text-left font-mono text-sm text-zinc-500 hover:text-red-400 transition-colors py-2">
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="px-4 pt-4 pb-1 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Account</p>
                <Link href="/login" className={mobileLinkCls('/login')}>Sign in</Link>
                <Link href="/register" className="block px-4 py-3 font-mono text-sm text-amber-400 font-bold border-b border-zinc-800/60">
                  Join CurioCalc
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
