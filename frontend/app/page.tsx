'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api, type Calculator, type SiteStats } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';
import { useAuth } from '@/lib/auth';

const TYPES = ['scientific', 'graphing', 'financial', 'programmable', 'databank', 'novelty', 'printing', 'other'];
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
const SORTS = [
  { value: 'make',             label: 'A–Z' },
  { value: 'year_introduced',  label: 'Year ↑' },
  { value: '-year_introduced', label: 'Year ↓' },
  { value: '-rarity_score',    label: 'Rarest' },
  { value: '-weirdness_score', label: 'Weirdest' },
  { value: '-created_at',      label: 'Newest' },
];
const PAGE_SIZE = 40;

export default function HomePage() {
  const { user } = useAuth();
  const [calculators, setCalculators] = useState<Calculator[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [skip, setSkip]               = useState(0);
  const [stats, setStats]             = useState<SiteStats | null>(null);
  const [featured, setFeatured]       = useState<Calculator | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [query, setQuery]             = useState('');
  const [inputVal, setInputVal]       = useState('');
  const [selectedType, setSelectedType]   = useState<string | null>(null);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [selectedMake, setSelectedMake]   = useState<string | null>(null);
  const [sort, setSort]               = useState('make');

  const [makes, setMakes]     = useState<string[]>([]);
  const [showMakes, setShowMakes] = useState(false);
  const makesRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isFiltered = !!(query || selectedType || selectedDecade || selectedMake);

  // Load static data once
  useEffect(() => {
    api.calculators.makes().then(setMakes).catch(() => {});
    api.stats.get().then(setStats).catch(() => {});
    api.calculators.random()
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (makesRef.current && !makesRef.current.contains(e.target as Node)) setShowMakes(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sortKey   = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';

  const buildParams = useCallback((sk: number) => ({
    q: query || undefined,
    calc_type: selectedType || undefined,
    make: selectedMake || undefined,
    decade: selectedDecade ?? undefined,
    sort: sortKey,
    order: sortOrder,
    skip: sk,
    limit: PAGE_SIZE,
  }), [query, selectedType, selectedMake, selectedDecade, sortKey, sortOrder]);

  const load = useCallback(async (reset: boolean) => {
    const sk = reset ? 0 : skip;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const data = await api.calculators.list(buildParams(sk));
      setCalculators(prev => reset ? data : [...prev, ...data]);
      setSkip(sk + data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [buildParams, skip]);

  useEffect(() => {
    setSkip(0); setCalculators([]); setHasMore(true); load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedType, selectedMake, selectedDecade, sort]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(inputVal), 300);
    return () => clearTimeout(t);
  }, [inputVal]);

  // Infinite scroll — fire load(false) when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          load(false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, load]);

  const activeFilterCount = [selectedType, selectedDecade, selectedMake].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* ── Hero title (always shown when not filtered) ── */}
      {!isFiltered && (
        <div className="text-center mb-5">
          <h1 className="text-5xl font-bold font-mono text-amber-400 mb-2 tracking-tight">CurioCalc</h1>
          <p className="text-zinc-500 font-mono text-sm">The open-source calculator collection community</p>
        </div>
      )}

      {/* ── Search + filters ── */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none select-none">🔍</span>
          <input
            type="text"
            placeholder="Search make, model, display type, tags…"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3.5 text-zinc-100 placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-colors"
          />
          {inputVal && (
            <button onClick={() => setInputVal('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none">
              ✕
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-3.5 text-zinc-300 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
        >
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* ── Hero lower content (stats, featured, links, recent) ── */}
      {!isFiltered && (
        <div className="mb-8">
          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
              {[
                { label: 'Calculators', value: stats.total_calcs.toLocaleString() },
                { label: 'Brands',      value: stats.total_brands.toLocaleString() },
                { label: 'Members',     value: stats.total_users.toLocaleString() },
                { label: 'In Collections', value: stats.total_owned.toLocaleString() },
                { label: 'With Photos', value: stats.with_images.toLocaleString() },
                { label: 'Described',   value: stats.with_descriptions.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold font-mono text-amber-400">{value}</p>
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Featured calc + quick links */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Featured / random */}
            <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">🎲 Random pick</p>
                <button
                  onClick={() => {
                    setFeaturedLoading(true);
                    api.calculators.random().then(setFeatured).catch(() => {}).finally(() => setFeaturedLoading(false));
                  }}
                  className="text-[10px] font-mono text-zinc-600 hover:text-amber-400 transition-colors"
                >
                  shuffle ↺
                </button>
              </div>
              {featuredLoading ? (
                <div className="flex-1 animate-pulse space-y-2">
                  <div className="aspect-video bg-zinc-800 rounded-lg" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                </div>
              ) : featured ? (
                <Link href={`/calculators/${featured.id}`} className="group flex-1 flex flex-col">
                  <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                    {featured.images[0] ? (
                      <img src={featured.images[0]} alt={featured.model}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-4xl opacity-20">🧮</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">{featured.make}</p>
                  <p className="font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors leading-tight">
                    {featured.model}
                  </p>
                  {featured.year_introduced && (
                    <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{featured.year_introduced}</p>
                  )}
                </Link>
              ) : null}
            </div>

            {/* Quick links */}
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <Link href="/brands"
                className="group bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 rounded-xl p-4 transition-colors">
                <div className="text-2xl mb-2">🏭</div>
                <p className="font-bold font-mono text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">Browse Brands</p>
                <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{stats?.total_brands ?? '…'} manufacturers</p>
              </Link>
              <Link href="/timeline"
                className="group bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 rounded-xl p-4 transition-colors">
                <div className="text-2xl mb-2">📅</div>
                <p className="font-bold font-mono text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">Timeline</p>
                <p className="text-[11px] text-zinc-600 font-mono mt-0.5">History by decade</p>
              </Link>
              <Link href="/compare"
                className="group bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 rounded-xl p-4 transition-colors">
                <div className="text-2xl mb-2">⚖️</div>
                <p className="font-bold font-mono text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">Compare</p>
                <p className="text-[11px] text-zinc-600 font-mono mt-0.5">Side-by-side specs</p>
              </Link>
              <Link href="/calculators/new"
                className="group bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 rounded-xl p-4 transition-colors">
                <div className="text-2xl mb-2">➕</div>
                <p className="font-bold font-mono text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">Add a Calc</p>
                <p className="text-[11px] text-zinc-600 font-mono mt-0.5">Grow the database</p>
              </Link>
            </div>
          </div>

          {/* Recent additions */}
          {stats && stats.recent.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Recently added</h2>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {stats.recent.map(c => (
                  <Link key={c.id} href={`/calculators/${c.id}`}
                    className="group bg-zinc-900 border border-zinc-800 hover:border-amber-400/30 rounded-lg overflow-hidden transition-colors">
                    <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {c.images[0]
                        ? <img src={c.images[0]} alt={c.model} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                        : <span className="text-xl opacity-20">🧮</span>
                      }
                    </div>
                    <div className="p-1.5">
                      <p className="text-[9px] text-zinc-600 font-mono truncate">{c.make}</p>
                      <p className="text-[10px] font-bold text-zinc-300 group-hover:text-amber-400 transition-colors truncate">{c.model}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Type filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => setSelectedType(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
            !selectedType ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
          }`}>all</button>
        {TYPES.map(t => (
          <button key={t} onClick={() => setSelectedType(t === selectedType ? null : t)}
            className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              selectedType === t ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
            }`}>{t}</button>
        ))}
      </div>

      {/* Decade + make row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-[10px] text-zinc-600 font-mono self-center uppercase tracking-wider">decade:</span>
        {DECADES.map(d => (
          <button key={d} onClick={() => setSelectedDecade(d === selectedDecade ? null : d)}
            className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              selectedDecade === d ? 'bg-zinc-700 text-zinc-100 border-zinc-500 font-bold' : 'text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
            }`}>{d}s</button>
        ))}

        <div className="relative ml-2" ref={makesRef}>
          <button onClick={() => setShowMakes(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              selectedMake ? 'bg-zinc-700 text-zinc-100 border-zinc-500 font-bold' : 'text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
            }`}>
            {selectedMake ?? 'brand ▾'}
          </button>
          {showMakes && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 min-w-[180px] max-h-72 overflow-y-auto">
              <button onClick={() => { setSelectedMake(null); setShowMakes(false); }}
                className="w-full text-left text-xs px-3 py-1.5 rounded font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                All brands
              </button>
              {makes.map(m => (
                <button key={m} onClick={() => { setSelectedMake(m); setShowMakes(false); }}
                  className={`w-full text-left text-xs px-3 py-1.5 rounded font-mono transition-colors ${
                    selectedMake === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}>{m}</button>
              ))}
            </div>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button onClick={() => { setSelectedType(null); setSelectedDecade(null); setSelectedMake(null); }}
            className="text-xs px-3 py-1.5 rounded-full font-mono border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors ml-auto">
            ✕ clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse">
              <div className="aspect-[4/3] bg-zinc-800 rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
                <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : calculators.length === 0 ? (
        <div className="text-center py-24 text-zinc-600 font-mono">
          <div className="text-5xl mb-4">🧮</div>
          <p className="text-sm">No calculators found.</p>
          {isFiltered && (
            <button onClick={() => { setInputVal(''); setSelectedType(null); setSelectedDecade(null); setSelectedMake(null); }}
              className="text-xs text-amber-400 hover:text-amber-300 mt-2">clear all filters</button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-600 font-mono mb-4">
            {calculators.length}{hasMore ? '+' : ''} calculator{calculators.length !== 1 ? 's' : ''}
            {isFiltered ? ' (filtered)' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {calculators.map(calc => (
              <CalculatorCard
                key={calc.id}
                calc={calc}
                isAdmin={!!user?.is_superuser}
                onRemoveImage={user?.is_superuser ? async () => {
                  const newImages = calc.images.slice(1);
                  const updated = await api.calculators.update(calc.id, { images: newImages } as Partial<Calculator>);
                  setCalculators(prev => prev.map(c => c.id === updated.id ? updated : c));
                } : undefined}
              />
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-10 mt-6 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-zinc-600 font-mono text-xs">
                <span className="animate-spin">⟳</span> loading more…
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
