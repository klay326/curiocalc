'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type NotificationItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function notifLabel(n: NotificationItem) {
  const actor = n.actor_display_name ?? n.actor_username ?? 'Someone';
  if (n.type === 'follow') return `${actor} followed you`;
  if (n.type === 'comment') return `${actor} commented on ${n.calc_make} ${n.calc_model}`;
  if (n.type === 'trade_offer') return `${actor} sent you a trade offer`;
  if (n.type === 'trade_accepted') return `${actor} accepted your trade offer`;
  return n.body ?? 'New notification';
}

function notifHref(n: NotificationItem) {
  if (n.type === 'follow' && n.actor_username) return `/u/${n.actor_username}`;
  if (n.type === 'comment' && n.calc_id) return `/calculators/${n.calc_id}`;
  if (n.type === 'trade_offer' || n.type === 'trade_accepted') return '/trade';
  return '#';
}

function notifIcon(type: string) {
  if (type === 'follow') return '👤';
  if (type === 'comment') return '💬';
  if (type === 'trade_offer') return '🔄';
  if (type === 'trade_accepted') return '✅';
  return '🔔';
}

function dayKey(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  if (diffDays < 30) return 'This month';
  return 'Older';
}

const TABS = [
  { key: 'all',   label: 'All' },
  { key: 'follow', label: 'Follows' },
  { key: 'comment', label: 'Comments' },
  { key: 'trade', label: 'Trades' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TabKey>('all');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.notifications.list()
      .then(data => {
        setItems(data.notifications);
        api.notifications.markRead().catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const dismiss = async (id: string) => {
    setDismissing(prev => new Set(prev).add(id));
    try {
      await api.notifications.dismiss(id);
      setItems(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
    finally { setDismissing(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const clearAll = async () => {
    await Promise.all(items.map(n => api.notifications.dismiss(n.id).catch(() => {})));
    setItems([]);
  };

  const filtered = useMemo(() => {
    if (tab === 'all') return items;
    if (tab === 'trade') return items.filter(n => n.type === 'trade_offer' || n.type === 'trade_accepted');
    return items.filter(n => n.type === tab);
  }, [items, tab]);

  const grouped = useMemo(() => {
    const groups: [string, NotificationItem[]][] = [];
    const order = ['Today', 'Yesterday', 'This week', 'This month', 'Older'];
    const map = new Map<string, NotificationItem[]>();
    for (const n of filtered) {
      const key = dayKey(n.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    for (const key of order) {
      if (map.has(key)) groups.push([key, map.get(key)!]);
    }
    return groups;
  }, [filtered]);

  const unreadCount = items.filter(n => !n.read).length;

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold font-mono text-amber-400">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {items.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                api.notifications.markRead().catch(() => {});
                setItems(prev => prev.map(n => ({ ...n, read: true })));
              }}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              mark all read
            </button>
            <button
              onClick={clearAll}
              className="text-xs font-mono text-zinc-600 hover:text-red-400 transition-colors"
            >
              clear all
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      {items.length > 0 && (
        <div className="flex gap-1.5 mb-5">
          {TABS.map(t => {
            const count = t.key === 'all' ? items.length
              : t.key === 'trade' ? items.filter(n => n.type === 'trade_offer' || n.type === 'trade_accepted').length
              : items.filter(n => n.type === t.key).length;
            if (t.key !== 'all' && count === 0) return null;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
                  tab === t.key
                    ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold'
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                }`}>
                {t.label}{t.key !== 'all' ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-zinc-500 font-mono text-sm">
            {items.length === 0 ? 'No notifications yet' : `No ${tab} notifications`}
          </p>
          {items.length === 0 && (
            <p className="text-zinc-700 font-mono text-xs mt-2">Follow collectors and comment on calculators to get notified.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, group]) => (
            <div key={label}>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2 px-1">{label}</p>
              <div className="space-y-1">
                {group.map(n => (
                  <div key={n.id} className={`group flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${!n.read ? 'bg-amber-400/5 border border-amber-400/10' : 'bg-zinc-900/40 border border-zinc-800/60'}`}>
                    <Link href={notifHref(n)} className="flex-1 flex items-start gap-3 min-w-0">
                      {/* Avatar or icon */}
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                        {n.actor_avatar_url ? (
                          <img src={n.actor_avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : n.actor_username ? (
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            {(n.actor_display_name ?? n.actor_username).charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-base">{notifIcon(n.type)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-zinc-200 leading-snug">{notifLabel(n)}</p>
                        {n.body && n.type === 'comment' && (
                          <p className="text-xs font-mono text-zinc-500 mt-0.5 truncate italic">"{n.body}"</p>
                        )}
                        {n.body && n.type === 'trade_offer' && (
                          <p className="text-xs font-mono text-zinc-500 mt-0.5 truncate italic">"{n.body}"</p>
                        )}
                        <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-2" />}
                    </Link>
                    <button
                      onClick={() => dismiss(n.id)}
                      disabled={dismissing.has(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-zinc-400 transition-all text-lg px-1 flex-shrink-0 leading-none disabled:opacity-30 mt-0.5"
                      title="Dismiss"
                    >
                      {dismissing.has(n.id) ? '…' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
