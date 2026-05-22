'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, type Calculator } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';

const TYPES = ['scientific', 'graphing', 'financial', 'databank', 'novelty', 'printing', 'programmable', 'other'];

export default function HomePage() {
  const [calculators, setCalculators] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const fetchCalcs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.calculators.list({
        q: query || undefined,
        calc_type: selectedType || undefined,
        limit: 40,
      });
      setCalculators(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, selectedType]);

  useEffect(() => {
    const t = setTimeout(fetchCalcs, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchCalcs, query]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold font-mono text-amber-400 mb-2 tracking-tight">CurioCalc</h1>
        <p className="text-zinc-500 font-mono text-sm">The open-source calculator collection community</p>
      </div>

      <div className="mb-5">
        <input
          type="text"
          placeholder="Search make or model..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedType(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
            !selectedType ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
          }`}
        >all</button>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setSelectedType(t === selectedType ? null : t)}
            className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              selectedType === t ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >{t}</button>
        ))}
      </div>

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
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-amber-400 hover:text-amber-300 mt-2">
              clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-600 font-mono mb-4">{calculators.length} calculator{calculators.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {calculators.map(calc => <CalculatorCard key={calc.id} calc={calc} />)}
          </div>
        </>
      )}
    </div>
  );
}
