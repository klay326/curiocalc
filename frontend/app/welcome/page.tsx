'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type UserSearchEntry, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CalculatorCard } from '@/components/calculator-card';

export default function WelcomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [suggested, setSuggested] = useState<UserSearchEntry[]>([]);
  const [starterCalcs, setStarterCalcs] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.users.suggested(8).catch(() => []),
      api.stats.trending().catch(() => null),
    ]).then(([people, trending]) => {
      setSuggested(people);
      if (trending) setStarterCalcs(trending.trending_owned.slice(0, 6));
    }).finally(() => setLoading(false));
  }, [user]);

  const toggleFollow = async (entry: UserSearchEntry) => {
    const willFollow = !followedIds.has(entry.id);
    setFollowedIds(prev => {
      const next = new Set(prev);
      willFollow ? next.add(entry.id) : next.delete(entry.id);
      return next;
    });
    try {
      if (willFollow) await api.users.follow(entry.username);
      else await api.users.unfollow(entry.username);
    } catch {}
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="text-4xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold font-mono text-amber-400">Welcome to CurioCalc, @{user.username}</h1>
        <p className="text-zinc-500 text-sm font-mono mt-2">A couple of things to get you started</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Suggested collectors */}
          {suggested.length > 0 && (
            <div className="mb-10">
              <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Follow some collectors</h2>
              <div className="space-y-2">
                {suggested.map(entry => {
                  const following = followedIds.has(entry.id);
                  return (
                    <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                      <Link href={`/u/${entry.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-amber-900/40 border border-amber-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {entry.avatar_url ? (
                            <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-base font-bold text-amber-400 font-mono">
                              {(entry.display_name ?? entry.username).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold font-mono text-zinc-100 text-sm truncate">{entry.display_name ?? entry.username}</p>
                          <p className="text-[10px] text-zinc-600 font-mono">@{entry.username} · {entry.owned_count} owned</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => toggleFollow(entry)}
                        className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                          following
                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            : 'bg-amber-400 text-zinc-950 border-amber-400 hover:bg-amber-300 font-bold'
                        }`}>
                        {following ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Starter calcs */}
          {starterCalcs.length > 0 && (
            <div className="mb-10">
              <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Popular calculators — start your collection</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {starterCalcs.map(c => <CalculatorCard key={c.id} calc={c} compact />)}
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-center">
        <Link href="/collection"
          className="inline-block px-6 py-3 bg-amber-400 text-zinc-950 rounded-lg font-mono font-bold text-sm hover:bg-amber-300 transition-colors">
          Go to my collection →
        </Link>
      </div>
    </div>
  );
}
