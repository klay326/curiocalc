'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type UserSearchEntry, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Step = 'collect' | 'follow';

function CalcTile({ calc, added, busy, onToggle }: {
  calc: Calculator; added: boolean; busy: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      className={`relative text-left bg-zinc-900 border rounded-xl overflow-hidden transition-colors disabled:opacity-60 ${
        added ? 'border-amber-400/70 ring-1 ring-amber-400/40' : 'border-zinc-800 hover:border-zinc-600'
      }`}
    >
      <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
        {calc.images[0]
          ? <img src={calc.images[0]} alt={calc.model} loading="lazy" className="w-full h-full object-contain" />
          : <span className="text-2xl opacity-20">🧮</span>}
      </div>
      <div className="p-2">
        <p className="text-[9px] font-mono text-zinc-600 truncate">{calc.make}</p>
        <p className="text-[11px] font-bold font-mono text-zinc-200 truncate">{calc.model}</p>
      </div>
      <span className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
        added ? 'bg-amber-400 text-zinc-950 border-amber-400' : 'bg-zinc-950/80 text-zinc-400 border-zinc-700'
      }`}>
        {busy ? '…' : added ? '✓' : '+'}
      </span>
    </button>
  );
}

export default function WelcomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('collect');

  // Step 1 — collection
  const [popular, setPopular] = useState<Calculator[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Calculator[]>([]);
  const [searching, setSearching] = useState(false);
  const [added, setAdded] = useState<Map<string, string>>(new Map()); // calc id -> collection entry id
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // Step 2 — people
  const [suggested, setSuggested] = useState<UserSearchEntry[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.stats.trending().then(t => {
      const seen = new Set<string>();
      const picks = [...t.trending_owned, ...t.trending_wanted, ...t.new_this_week]
        .filter(c => (seen.has(c.id) ? false : (seen.add(c.id), true)))
        .slice(0, 12);
      setPopular(picks);
    }).catch(() => {});
    api.users.suggested(8).then(setSuggested).catch(() => {});
    // Pre-mark anything already in their collection
    api.collection.mine().then(entries => {
      setAdded(new Map(entries.filter(e => e.status === 'owned').map(e => [e.calculator_id, e.id])));
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.calculators.list({ q: query.trim(), limit: 12 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const toggleOwned = async (calc: Calculator) => {
    if (busy.has(calc.id)) return;
    setBusy(prev => new Set(prev).add(calc.id));
    try {
      const entryId = added.get(calc.id);
      if (entryId) {
        await api.collection.remove(entryId);
        setAdded(prev => { const n = new Map(prev); n.delete(calc.id); return n; });
      } else {
        const entry = await api.collection.add({ calculator_id: calc.id, status: 'owned' });
        setAdded(prev => new Map(prev).set(calc.id, entry.id));
      }
    } catch { /* already owned or network error — leave state as is */ }
    finally { setBusy(prev => { const n = new Set(prev); n.delete(calc.id); return n; }); }
  };

  const toggleFollow = async (entry: UserSearchEntry) => {
    const willFollow = !followedIds.has(entry.id);
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (willFollow) next.add(entry.id); else next.delete(entry.id);
      return next;
    });
    try {
      if (willFollow) await api.users.follow(entry.username);
      else await api.users.unfollow(entry.username);
    } catch { /* ignore */ }
  };

  if (authLoading || !user) return null;

  const grid = query.trim().length >= 2 ? results : popular;
  const ownedCount = added.size;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {(['collect', 'follow'] as const).map((s, i) => (
          <div key={s} className={`h-1.5 w-12 rounded-full ${step === s || (s === 'collect' && step === 'follow') ? 'bg-amber-400' : 'bg-zinc-800'}`}
            aria-label={`Step ${i + 1}`} />
        ))}
      </div>

      {step === 'collect' ? (
        <>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-mono text-amber-400">Welcome, @{user.username} 👋</h1>
            <p className="text-zinc-400 text-sm font-mono mt-2">Which calculators do you own? Tap to add them.</p>
          </div>

          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">🔍</span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search — e.g. ti84, casio fx-82, hp 12c"
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3.5 text-zinc-100 placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
            {query.trim().length >= 2 ? (searching ? 'Searching…' : `${results.length} results`) : 'Popular with collectors'}
          </p>

          {grid.length === 0 && !searching ? (
            <p className="text-center text-zinc-600 font-mono text-xs py-10">
              {query.trim().length >= 2 ? 'No matches — try a shorter search.' : 'Search above to find your calculators.'}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-24">
              {grid.map(c => (
                <CalcTile key={c.id} calc={c} added={added.has(c.id)} busy={busy.has(c.id)} onToggle={() => toggleOwned(c)} />
              ))}
            </div>
          )}

          {/* Sticky footer */}
          <div className="fixed inset-x-0 bottom-0 z-30 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 px-4 pt-3"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <p className="text-xs font-mono text-zinc-400 flex-1">
                {ownedCount > 0 ? <><span className="text-amber-400 font-bold">{ownedCount}</span> in your collection</> : 'Nothing added yet'}
              </p>
              {ownedCount === 0 && (
                <button onClick={() => { setStep('follow'); window.scrollTo(0, 0); }}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-300 px-2 py-2">
                  skip
                </button>
              )}
              <button onClick={() => { setStep('follow'); window.scrollTo(0, 0); }}
                className="px-5 py-2.5 bg-amber-400 text-zinc-950 rounded-lg font-mono font-bold text-sm hover:bg-amber-300 transition-colors">
                Next →
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-mono text-amber-400">Follow some collectors</h1>
            <p className="text-zinc-400 text-sm font-mono mt-2">See what they add and get trade matches.</p>
          </div>

          {suggested.length === 0 ? (
            <p className="text-center text-zinc-600 font-mono text-xs py-10">No suggestions right now.</p>
          ) : (
            <div className="space-y-2 mb-8">
              {suggested.map(entry => {
                const following = followedIds.has(entry.id);
                return (
                  <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3">
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
          )}

          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setStep('collect')}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 px-2 py-2">
              ← back
            </button>
            <Link href="/collection"
              className="px-6 py-3 bg-amber-400 text-zinc-950 rounded-lg font-mono font-bold text-sm hover:bg-amber-300 transition-colors">
              {ownedCount > 0 ? `See my ${ownedCount} calc${ownedCount === 1 ? '' : 's'} →` : 'Done →'}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
