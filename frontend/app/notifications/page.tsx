'use client';
import { useEffect, useState } from 'react';
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
  return n.body ?? 'New notification';
}

function notifHref(n: NotificationItem) {
  if (n.type === 'follow' && n.actor_username) return `/u/${n.actor_username}`;
  if (n.type === 'comment' && n.calc_id) return `/calculators/${n.calc_id}`;
  return '#';
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.notifications.list()
      .then(data => {
        setItems(data.notifications);
        // Mark all read
        api.notifications.markRead().catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const dismiss = async (id: string) => {
    setDismissing(id);
    try {
      await api.notifications.dismiss(id);
      setItems(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
    finally { setDismissing(null); }
  };

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-mono text-amber-400">Notifications</h1>
        {items.length > 0 && (
          <button
            onClick={async () => {
              await api.notifications.markRead().catch(() => {});
              setItems(prev => prev.map(n => ({ ...n, read: true })));
            }}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-zinc-500 font-mono text-sm">No notifications yet</p>
          <p className="text-zinc-700 font-mono text-xs mt-2">Follow collectors and comment on calculators to get notified.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map(n => (
            <div key={n.id} className={`group flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${!n.read ? 'bg-amber-400/5 border border-amber-400/10' : 'bg-zinc-900/40 border border-zinc-800/60'}`}>
              <Link href={notifHref(n)} className="flex-1 flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-amber-900/40 border border-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                  {n.actor_avatar_url
                    ? <img src={n.actor_avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-amber-400 font-mono">
                        {(n.actor_display_name ?? n.actor_username ?? '?').charAt(0).toUpperCase()}
                      </span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-zinc-200">{notifLabel(n)}</p>
                  {n.body && n.type === 'comment' && (
                    <p className="text-xs font-mono text-zinc-500 mt-0.5 truncate italic">"{n.body}"</p>
                  )}
                  <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />}
              </Link>
              <button
                onClick={() => dismiss(n.id)}
                disabled={dismissing === n.id}
                className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-zinc-400 transition-all text-base px-1 flex-shrink-0 disabled:opacity-30"
                title="Dismiss"
              >
                {dismissing === n.id ? '…' : '×'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
