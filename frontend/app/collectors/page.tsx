'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type UserSearchEntry } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function CollectorCard({ entry, onToggleFollow }: { entry: UserSearchEntry; onToggleFollow: (username: string, nowFollowing: boolean) => void }) {
  const { user: me } = useAuth();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!me) return;
    setLoading(true);
    try {
      if (entry.is_following) await api.users.unfollow(entry.username);
      else await api.users.follow(entry.username);
      onToggleFollow(entry.username, !entry.is_following);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 hover:border-zinc-700 transition-colors">
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
          <p className="text-[10px] text-zinc-600 font-mono">@{entry.username} · {entry.owned_count} owned · {entry.follower_count} followers</p>
        </div>
      </Link>
      {me && me.username !== entry.username && (
        <button
          onClick={toggle}
          disabled={loading}
          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 flex-shrink-0 ${
            entry.is_following
              ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/50'
              : 'bg-amber-400 text-zinc-950 border-amber-400 hover:bg-amber-300 font-bold'
          }`}>
          {loading ? '…' : entry.is_following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}

export default function CollectorsPage() {
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggested, setSuggested] = useState<UserSearchEntry[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(true);

  useEffect(() => {
    document.title = 'Discover Collectors — CurioCalc';
  }, []);

  useEffect(() => {
    if (!me) { setLoadingSuggested(false); return; }
    api.users.suggested(12)
      .then(setSuggested)
      .catch(() => {})
      .finally(() => setLoadingSuggested(false));
  }, [me]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      api.users.search(query.trim())
        .then(setResults)
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const updateFollow = (list: UserSearchEntry[], setList: (l: UserSearchEntry[]) => void, username: string, nowFollowing: boolean) => {
    setList(list.map(e => e.username === username ? { ...e, is_following: nowFollowing } : e));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono text-amber-400">Discover Collectors</h1>
        <p className="text-zinc-500 text-sm font-mono mt-1">Find and follow other vintage calculator collectors</p>
      </div>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by username or name…"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors mb-6"
      />

      {query.trim().length >= 2 ? (
        <div>
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
            {searching ? 'Searching…' : `Results (${results.length})`}
          </h2>
          {!searching && results.length === 0 ? (
            <p className="text-zinc-700 font-mono text-sm italic text-center py-10">No collectors found.</p>
          ) : (
            <div className="space-y-2">
              {results.map(r => (
                <CollectorCard key={r.id} entry={r} onToggleFollow={(u, f) => updateFollow(results, setResults, u, f)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Suggested collectors</h2>
          {!me ? (
            <p className="text-zinc-700 font-mono text-sm italic text-center py-10">
              <Link href="/login" className="text-amber-400 hover:text-amber-300">Sign in</Link> to see suggested collectors
            </p>
          ) : loadingSuggested ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[68px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
            </div>
          ) : suggested.length === 0 ? (
            <p className="text-zinc-700 font-mono text-sm italic text-center py-10">No suggestions yet — check back once more collectors join.</p>
          ) : (
            <div className="space-y-2">
              {suggested.map(s => (
                <CollectorCard key={s.id} entry={s} onToggleFollow={(u, f) => updateFollow(suggested, setSuggested, u, f)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
