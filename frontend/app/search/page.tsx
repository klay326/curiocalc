'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator, type UserSearchEntry } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [pending, setPending] = useState(initialQ);
  const [calcs, setCalcs] = useState<Calculator[]>([]);
  const [people, setPeople] = useState<UserSearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!q.trim()) { setCalcs([]); setPeople([]); return; }
    setLoading(true);
    Promise.all([
      api.calculators.list({ q: q.trim(), limit: 12 }).catch(() => [] as Calculator[]),
      api.users.search(q.trim()).catch(() => [] as UserSearchEntry[]),
    ]).then(([c, p]) => {
      setCalcs(c);
      setPeople(p.slice(0, 6));
    }).finally(() => setLoading(false));
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pending.trim();
    if (!trimmed) return;
    setQ(trimmed);
    router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  const hasResults = calcs.length > 0 || people.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <form onSubmit={submit} className="mb-8">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={pending}
            onChange={e => setPending(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit(e as unknown as React.FormEvent)}
            placeholder="Search calculators, brands, collectors…"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3.5 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {pending && (
            <button type="button" onClick={() => { setPending(''); setQ(''); router.replace('/search', { scroll: false }); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors font-mono text-lg leading-none">
              ✕
            </button>
          )}
        </div>
      </form>

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-24" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-zinc-800 rounded-xl" />)}
          </div>
        </div>
      )}

      {!loading && q && !hasResults && (
        <p className="text-center text-zinc-600 font-mono text-sm py-16">
          No results for &ldquo;{q}&rdquo;
        </p>
      )}

      {!loading && !q && (
        <p className="text-center text-zinc-700 font-mono text-sm py-16">
          Type something to search calculators and collectors
        </p>
      )}

      {!loading && people.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Collectors</h2>
          <div className="space-y-2">
            {people.map(p => (
              <Link key={p.id} href={`/u/${p.username}`}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-900/40 border border-amber-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-amber-400 font-mono">
                        {(p.display_name ?? p.username).charAt(0).toUpperCase()}
                      </span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-bold font-mono text-zinc-100 text-sm truncate">{p.display_name ?? p.username}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">@{p.username} · {p.owned_count} owned</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && calcs.length > 0 && (
        <div>
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
            Calculators {calcs.length === 12 && <span className="text-zinc-700">· showing first 12</span>}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {calcs.map(c => <CalculatorCard key={c.id} calc={c} compact />)}
          </div>
          {calcs.length === 12 && (
            <div className="mt-4 text-center">
              <Link href={`/?q=${encodeURIComponent(q)}`}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors">
                See all results in browse →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
