'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme, THEMES, THEME_META } from '@/lib/theme';
import { api, type NotificationItem as Notification } from '@/lib/api';

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
            <p className="text-xs font-mono font-bold text-zinc-300">Notifications</p>
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
            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
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
          )}
        </div>
      )}
    </div>
  );
}

// ── Main nav ─────────────────────────────────────────────────────────────────

export function Nav() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [showPicker, setShowPicker] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  // Close mobile menu on navigation
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = useCallback((href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href), [pathname]);

  const linkCls = (href: string) =>
    `text-sm font-mono transition-colors ${isActive(href) ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'}`;

  const mobileLinkCls = (href: string) =>
    `block px-4 py-3 font-mono text-sm transition-colors border-b border-zinc-800/60 ${isActive(href) ? 'text-amber-400 bg-amber-400/5' : 'text-zinc-300 hover:bg-zinc-800/50'}`;

  const publicLinks = [
    { href: '/', label: 'Browse' },
    { href: '/brands', label: 'Brands' },
    { href: '/trending', label: 'Trending' },
    { href: '/trade', label: 'Trade' },
    { href: '/top', label: 'Top' },
    { href: '/compare', label: 'Compare' },
    { href: '/contribute', label: 'Contribute' },
  ];

  return (
    <>
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0">
            <span className="text-lg">🧮</span>
            <span>CurioCalc</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-5">
            {publicLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={linkCls(href)}>{label}</Link>
            ))}

            {user ? (
              <>
                <Link href="/feed" className={linkCls('/feed')}>Feed</Link>
                <Link href="/collection" className={linkCls('/collection')}>Collection</Link>
                {user.is_superuser && <Link href="/calculators/new" className={linkCls('/calculators/new')}>+ Add</Link>}
                {user.is_superuser && <Link href="/admin" className={linkCls('/admin')}>Admin</Link>}
                <Link href={`/u/${user.username}`} className={linkCls(`/u/${user.username}`)}>
                  @{user.username}
                </Link>
                <NotificationBell />
                <Link href="/settings" className={linkCls('/settings')}>⚙</Link>
                <button onClick={logout} className="text-sm font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
                  Sign out
                </button>
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
                      <button key={t} onClick={() => { setTheme(t); setShowPicker(false); }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${theme === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}>
                        <span className="w-3 h-3 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: THEME_META[t].dot }} />
                        <span className="text-xs font-mono">{THEME_META[t].label}</span>
                        {theme === t && <span className="ml-auto text-[10px] text-zinc-500">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-3">
            {user && <NotificationBell />}
            {/* Theme dot */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowPicker(v => !v)}
                title="Change theme"
                className="w-5 h-5 rounded-full border-2 border-zinc-700 hover:border-zinc-400 transition-colors"
                style={{ backgroundColor: THEME_META[theme].dot }}
              />
              {showPicker && (
                <div className="absolute right-0 top-8 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 w-44 z-50">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2 px-1">Theme</p>
                  <div className="space-y-0.5">
                    {THEMES.map(t => (
                      <button key={t} onClick={() => { setTheme(t); setShowPicker(false); }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${theme === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}>
                        <span className="w-3 h-3 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: THEME_META[t].dot }} />
                        <span className="text-xs font-mono">{THEME_META[t].label}</span>
                        {theme === t && <span className="ml-auto text-[10px] text-zinc-500">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-zinc-950/95 backdrop-blur-sm overflow-y-auto">
          <div className="pb-8">
            {publicLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={mobileLinkCls(href)}>{label}</Link>
            ))}

            {user ? (
              <>
                <div className="border-t border-zinc-800 mt-1 pt-1">
                  <Link href="/feed" className={mobileLinkCls('/feed')}>Feed</Link>
                  <Link href="/collection" className={mobileLinkCls('/collection')}>Collection</Link>
                  <Link href={`/u/${user.username}`} className={mobileLinkCls(`/u/${user.username}`)}>
                    @{user.username}
                  </Link>
                  <Link href="/settings" className={mobileLinkCls('/settings')}>Settings</Link>
                  {user.is_superuser && <Link href="/calculators/new" className={mobileLinkCls('/calculators/new')}>+ Add calculator</Link>}
                  {user.is_superuser && <Link href="/admin" className={mobileLinkCls('/admin')}>Admin</Link>}
                </div>
                <div className="px-4 pt-4">
                  <button onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full text-left font-mono text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2">
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="border-t border-zinc-800 mt-1 pt-1">
                <Link href="/login" className={mobileLinkCls('/login')}>Sign in</Link>
                <Link href="/register" className="block px-4 py-3 font-mono text-sm text-amber-400 font-bold border-b border-zinc-800/60">
                  Join CurioCalc
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
