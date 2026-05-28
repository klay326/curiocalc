'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type FeedItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const STATUS_LABEL: Record<string, string> = {
  owned:    'added to collection',
  wanted:   'added to wishlist',
  for_sale: 'listed for sale',
};

const STATUS_COLOR: Record<string, string> = {
  owned:    'text-amber-400',
  wanted:   'text-blue-400',
  for_sale: 'text-green-400',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)  return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ user }: { user: FeedItem['user'] }) {
  const initial = (user.display_name ?? user.username).charAt(0).toUpperCase();
  if (user.avatar_url) {
    return (
      <img src={user.avatar_url} alt={user.username}
        className="w-9 h-9 rounded-full border border-zinc-700 object-cover flex-shrink-0" />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-amber-900/40 border border-amber-900/50 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-amber-400 font-mono">{initial}</span>
    </div>
  );
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    api.users.feed()
      .then(data => {
        setItems(data);
        setEmpty(data.length === 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <h1 className="text-3xl font-bold font-mono text-zinc-100 mt-3">Feed</h1>
        <p className="text-zinc-500 font-mono text-xs mt-1">Recent activity from people you follow</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-2/3" />
                <div className="h-16 bg-zinc-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="text-center py-24 text-zinc-600">
          <div className="text-5xl mb-4">📡</div>
          <p className="font-mono text-sm mb-2">Nothing here yet</p>
          <p className="font-mono text-xs text-zinc-700 mb-6">Follow some collectors to see their activity</p>
          <Link href="/"
            className="text-amber-400 font-mono text-xs hover:text-amber-300 border border-amber-900/40 px-4 py-2 rounded-lg transition-colors">
            Browse calculators
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex gap-3">
              <Link href={`/u/${item.user.username}`}>
                <Avatar user={item.user} />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-zinc-300 mb-1.5">
                  <Link href={`/u/${item.user.username}`}
                    className="font-bold text-zinc-100 hover:text-amber-400 transition-colors">
                    {item.user.display_name ?? item.user.username}
                  </Link>
                  {' '}
                  <span className={STATUS_COLOR[item.status] ?? 'text-zinc-400'}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                  {' '}
                  <span className="text-zinc-600 text-xs">{timeAgo(item.created_at)}</span>
                </p>

                <Link href={`/calculators/${item.calculator.id}`}
                  className="flex gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-600 transition-colors">
                  {item.calculator.images[0] ? (
                    <img src={item.calculator.images[0]} alt={item.calculator.model}
                      className="w-14 h-14 object-contain rounded-lg bg-zinc-800 flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🧮</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-zinc-500">{item.calculator.make}</p>
                    <p className="font-mono font-bold text-zinc-100 text-sm leading-tight">{item.calculator.model}</p>
                    {item.calculator.year_introduced && (
                      <p className="font-mono text-xs text-zinc-600 mt-0.5">{item.calculator.year_introduced}</p>
                    )}
                    {item.condition && (
                      <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded border border-zinc-700 capitalize">
                        {item.condition}
                      </span>
                    )}
                  </div>
                </Link>

                {item.notes && (
                  <p className="mt-1.5 text-xs font-mono text-zinc-500 italic line-clamp-2 pl-1">
                    "{item.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
