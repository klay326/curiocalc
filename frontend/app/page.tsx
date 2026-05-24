'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api, type Calculator } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';

const TYPES = ['scientific', 'graphing', 'financial', 'programmable', 'databank', 'novelty', 'printing', 'other'];
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
const SORTS = [
  { value: 'make',            label: 'A–Z' },
  { value: 'year_introduced', label: 'Year ↑' },
  { value: '-year_introduced',label: 'Year ↓' },
  { value: '-rarity_score',   label: 'Rarest' },
  { value: '-weirdness_score',label: 'Weirdest' },
  { value: '-created_at',     label: 'Newest' },
];
const PAGE_SIZE = 40;

export default function HomePage() {
  const [calculators, setCalculators] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const [query, setQuery] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [sort, setSort] = useState('make');

  const [makes, setMakes] = useState<string[]>([]);
  const [showMakes, setShowMakes] = useState(false);
  const makesRef = useRef<HTMLDivElement>(null);

  // Load makes once
  useEffect(() => {
    api.calculators.makes().then(setMakes).catch(() => {});
  }, []);

  // Close makes dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (makesRef.current && !makesRef.current.contains(e.target as Node)) {
        setShowMakes(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sortKey = sort.startsWith('-') ? sort.slice(1) : sort;
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildParams, skip]);

  // Reset on filter change
  useEffect(() => {
    setSkip(0);
    setCalculators([]);
    setHasMore(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedType, selectedMake, selectedDecade, sort]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQuery(inputVal), 300);
    return () => clearTimeout(t);
  }, [inputVal]);

  const activeFilters = [selectedType, selectedDecade ? `${selectedDecade}s` : null, selectedMake]
    .filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-mono text-amber-400 mb-2 tracking-tight">CurioCalc</h1>
        <p className="text-zinc-500 font-mono text-sm">The open-source calculator collection community</p>
      </div>

      {/* Search + sort row */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search make or model…"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-3 text-zinc-300 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
        >
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Type filters */}
        <button
          onClick={() => setSelectedType(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
            !selectedType ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
          }`}
        >all</button>
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

        {/* Make picker */}
        <div className="relative ml-2" ref={makesRef}>
          <button
            onClick={() => setShowMakes(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              selectedMake ? 'bg-zinc-700 text-zinc-100 border-zinc-500 font-bold' : 'text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
            }`}
          >
            {selectedMake ?? 'brand ▾'}
          </button>
          {showMakes && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 min-w-[180px] max-h-72 overflow-y-auto">
              <button
                onClick={() => { setSelectedMake(null); setShowMakes(false); }}
                className="w-full text-left text-xs px-3 py-1.5 rounded font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >All brands</button>
              {makes.map(m => (
                <button key={m}
                  onClick={() => { setSelectedMake(m); setShowMakes(false); }}
                  className={`w-full text-left text-xs px-3 py-1.5 rounded font-mono transition-colors ${
                    selectedMake === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >{m}</button>
              ))}
            </div>
          )}
        </div>

        {/* Clear all */}
        {activeFilters > 0 && (
          <button
            onClick={() => { setSelectedType(null); setSelectedDecade(null); setSelectedMake(null); }}
            className="text-xs px-3 py-1.5 rounded-full font-mono border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors ml-auto"
          >✕ clear filters</button>
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
          {(query || activeFilters > 0) && (
            <button onClick={() => { setInputVal(''); setSelectedType(null); setSelectedDecade(null); setSelectedMake(null); }}
              className="text-xs text-amber-400 hover:text-amber-300 mt-2">
              clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-600 font-mono mb-4">
            {calculators.length} calculator{calculators.length !== 1 ? 's' : ''}
            {activeFilters > 0 || query ? ' (filtered)' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {calculators.map(calc => <CalculatorCard key={calc.id} calc={calc} />)}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl font-mono text-sm text-zinc-300 transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'loading…' : 'load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
