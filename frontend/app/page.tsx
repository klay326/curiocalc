'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api, type Calculator, type SiteStats, getRecentlyViewedIds } from '@/lib/api';
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
  const [recentlyViewed, setRecentlyViewed] = useState<Calculator[]>([]);
  const [suggestions, setSuggestions] = useState<Calculator[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [query, setQuery]             = useState('');
  const [inputVal, setInputVal]       = useState('');
  const [selectedType, setSelectedType]   = useState<string | null>(null);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [selectedMake, setSelectedMake]   = useState<string | null>(null);
  const [sort, setSort]               = useState('make');

  const [makes, setMakes]     = useState<string[]>([]);
  const [showMakes, setShowMakes] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const makesRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isFiltered = !!(query || selectedType || selectedDecade || selectedMake);

  // Press "/" anywhere to focus the search box
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Load static data once
  useEffect(() => {
    api.calculators.makes().then(setMakes).catch(() => {});
    api.stats.get().then(setStats).catch(() => {});
    api.calculators.daily()
      .then(setFeatured)
      .catch(() => api.calculators.random().then(setFeatured).catch(() => {}))
      .finally(() => setFeaturedLoading(false));
    // Load recently viewed from localStorage
    const ids = getRecentlyViewedIds();
    if (ids.length > 0) {
      api.calculators.batch(ids).then(calcs => {
        // Preserve localStorage order
        const map = Object.fromEntries(calcs.map(c => [c.id, c]));
        setRecentlyViewed(ids.map(id => map[id]).filter(Boolean));
      }).catch(() => {});
    }
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

  // Autocomplete suggestions (only shown before committing the full search)
  useEffect(() => {
    if (inputVal.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.calculators.list({ q: inputVal, limit: 6 }).then(setSuggestions).catch(() => {});
    }, 150);
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
            ref={searchRef}
            type="text"
            placeholder="Search make, model, display type, tags… (press / to focus)"
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3.5 text-zinc-100 placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-colors"
          />
          {inputVal && (
            <button onClick={() => { setInputVal(''); setSuggestions([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none">
              ✕
            </button>
          )}
          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-30 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
              {suggestions.map(s => (
                <Link key={s.id} href={`/calculators/${s.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors group">
                  <div className="w-8 h-8 flex-shrink-0 bg-zinc-800 rounded overflow-hidden flex items-center justify-center">
                    {s.images[0]
                      ? <img src={s.images[0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                      : <span className="text-base opacity-30">🧮</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-zinc-500">{s.make}</p>
                    <p className="text-sm font-mono font-bold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">{s.model}</p>
                  </div>
                  {s.year_introduced && <span className="ml-auto text-[10px] font-mono text-zinc-600 flex-shrink-0">{s.year_introduced}</span>}
                </Link>
              ))}
            </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Calculators',    value: stats.total_calcs.toLocaleString() },
                { label: 'Brands',         value: stats.total_brands.toLocaleString() },
                { label: 'Members',        value: stats.total_users.toLocaleString() },
                { label: 'In collections', value: stats.total_owned.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold font-mono text-amber-400">{value}</p>
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Featured / random — compact strip */}
          {featured && !featuredLoading && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 mb-8">
              <Link href={`/calculators/${featured.id}`} className="flex-shrink-0">
                <div className="w-20 h-20 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                  {featured.images[0] ? (
                    <img src={featured.images[0]} alt={featured.model} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-3xl opacity-20">🧮</span>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">🗓 Calculator of the day</p>
                <Link href={`/calculators/${featured.id}`} className="group">
                  <p className="text-[10px] text-zinc-500 font-mono">{featured.make}</p>
                  <p className="font-bold font-mono text-zinc-100 group-hover:text-amber-400 transition-colors leading-tight">
                    {featured.model}
                  </p>
                  {featured.year_introduced && (
                    <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{featured.year_introduced}</p>
                  )}
                </Link>
              </div>
              <button
                onClick={() => {
                  setFeaturedLoading(true);
                  api.calculators.random().then(setFeatured).catch(() => {}).finally(() => setFeaturedLoading(false));
                }}
                className="text-[10px] font-mono text-zinc-600 hover:text-amber-400 transition-colors flex-shrink-0 px-2 py-1"
              >
                shuffle ↺
              </button>
            </div>
          )}
          {featuredLoading && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 mb-8 animate-pulse">
              <div className="w-20 h-20 bg-zinc-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-zinc-800 rounded w-1/4" />
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
                <div className="h-2 bg-zinc-800 rounded w-1/5" />
              </div>
            </div>
          )}

          {/* Recently viewed */}
          {recentlyViewed.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Recently viewed</h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentlyViewed.map(c => (
                  <Link key={c.id} href={`/calculators/${c.id}`}
                    className="group flex-shrink-0 w-20 bg-zinc-900 border border-zinc-800 hover:border-amber-400/30 rounded-lg overflow-hidden transition-colors">
                    <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {c.images[0]
                        ? <img src={c.images[0]} alt={c.model} loading="lazy" decoding="async" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
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
                        ? <img src={c.images[0]} alt={c.model} loading="lazy" decoding="async" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
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

      {/* Filters toggle */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
              activeFilterCount > 0
                ? 'border-amber-400/40 text-amber-400 bg-amber-400/5'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >
            {filtersOpen ? '▲' : '▼'} Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          {/* Active filter chips */}
          {selectedType && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center gap-1">
              {selectedType}
              <button onClick={() => setSelectedType(null)} className="hover:text-amber-200 leading-none">✕</button>
            </span>
          )}
          {selectedDecade && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-zinc-700/50 border border-zinc-600 text-zinc-300 flex items-center gap-1">
              {selectedDecade}s
              <button onClick={() => setSelectedDecade(null)} className="hover:text-zinc-100 leading-none">✕</button>
            </span>
          )}
          {selectedMake && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-zinc-700/50 border border-zinc-600 text-zinc-300 flex items-center gap-1">
              {selectedMake}
              <button onClick={() => setSelectedMake(null)} className="hover:text-zinc-100 leading-none">✕</button>
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSelectedType(null); setSelectedDecade(null); setSelectedMake(null); }}
              className="text-xs font-mono text-zinc-600 hover:text-red-400 transition-colors ml-auto"
            >
              clear all
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            {/* Type */}
            <div>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Type</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setSelectedType(null)}
                  className={`text-xs px-3 py-1 rounded-full font-mono border transition-colors ${
                    !selectedType ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                  }`}>all</button>
                {TYPES.map(t => (
                  <button key={t} onClick={() => setSelectedType(t === selectedType ? null : t)}
                    className={`text-xs px-3 py-1 rounded-full font-mono border transition-colors ${
                      selectedType === t ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                    }`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Decade */}
            <div>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Decade</p>
              <div className="flex flex-wrap gap-1.5">
                {DECADES.map(d => (
                  <button key={d} onClick={() => setSelectedDecade(d === selectedDecade ? null : d)}
                    className={`text-xs px-3 py-1 rounded-full font-mono border transition-colors ${
                      selectedDecade === d ? 'bg-zinc-700 text-zinc-100 border-zinc-500 font-bold' : 'text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                    }`}>{d}s</button>
                ))}
              </div>
            </div>

            {/* Brand */}
            <div ref={makesRef}>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Brand</p>
              <div className="relative">
                <button onClick={() => setShowMakes(v => !v)}
                  className={`text-xs px-3 py-1 rounded-full font-mono border transition-colors ${
                    selectedMake ? 'bg-zinc-700 text-zinc-100 border-zinc-500 font-bold' : 'text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                  }`}>
                  {selectedMake ?? 'Select brand ▾'}
                </button>
                {showMakes && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 min-w-[180px] max-h-60 overflow-y-auto">
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
            </div>
          </div>
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

      {/* Staff FAB */}
      {(user?.is_superuser || user?.is_curator) && (
        <Link
          href="/calculators/new"
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition-colors"
          title="Add calculator"
        >
          +
        </Link>
      )}
    </div>
  );
}
