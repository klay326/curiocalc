'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api, type Calculator } from '@/lib/api';

export default function ComparePage() {
  const [leftCalc, setLeftCalc]   = useState<Calculator | null>(null);
  const [rightCalc, setRightCalc] = useState<Calculator | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <h1 className="text-3xl font-bold font-mono text-amber-400 mt-3">Compare</h1>
        <p className="text-zinc-500 font-mono text-xs mt-1">Side-by-side calculator specs</p>
      </div>

      {/* Picker row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <CalcPicker label="Calculator A" selected={leftCalc} onSelect={setLeftCalc}
          exclude={rightCalc?.id} />
        <CalcPicker label="Calculator B" selected={rightCalc} onSelect={setRightCalc}
          exclude={leftCalc?.id} />
      </div>

      {leftCalc && rightCalc ? (
        <CompareTable left={leftCalc} right={rightCalc} />
      ) : (
        <div className="text-center py-20 text-zinc-600 font-mono">
          <div className="text-5xl mb-4">⚖️</div>
          <p className="text-sm">Pick two calculators above to compare</p>
        </div>
      )}
    </div>
  );
}

/* ── Search picker ── */
function CalcPicker({ label, selected, onSelect, exclude }: {
  label: string;
  selected: Calculator | null;
  onSelect: (c: Calculator) => void;
  exclude?: string;
}) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Calculator[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim() || selected) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.calculators.list({ q: query, limit: 6 });
        setResults(data.filter(c => c.id !== exclude));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [query, selected, exclude]);

  const clear = () => { setQuery(''); setResults([]); onSelect(null as unknown as Calculator); };

  return (
    <div ref={ref}>
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
      {selected ? (
        <div className="bg-zinc-900 border border-amber-400/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-14 h-14 flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
            {selected.images[0]
              ? <img src={selected.images[0]} alt={selected.model} className="w-full h-full object-contain" />
              : <span className="text-2xl opacity-20">🧮</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 font-mono">{selected.make}</p>
            <p className="font-bold font-mono text-zinc-100 truncate">{selected.model}</p>
            {selected.year_introduced && (
              <p className="text-[10px] text-zinc-600 font-mono">{selected.year_introduced}</p>
            )}
          </div>
          <button onClick={clear} className="text-zinc-600 hover:text-zinc-300 transition-colors font-mono text-sm flex-shrink-0">✕</button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search make or model…"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs animate-pulse">…</span>
          )}
          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
              {results.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { onSelect(r); setQuery(''); setResults([]); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-700 transition-colors text-left">
                  {r.images[0] && (
                    <img src={r.images[0]} alt="" className="w-8 h-8 rounded object-contain bg-zinc-900 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-mono text-zinc-200">{r.make} {r.model}</p>
                    <p className="text-[10px] font-mono text-zinc-500">{r.year_introduced ?? '?'} · {r.calc_type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Comparison table ── */
function CompareTable({ left, right }: { left: Calculator; right: Calculator }) {
  const rows: { label: string; key: keyof Calculator; format?: (v: unknown) => string }[] = [
    { label: 'Year introduced',  key: 'year_introduced' },
    { label: 'Year discontinued',key: 'year_discontinued' },
    { label: 'Type',             key: 'calc_type' },
    { label: 'Display',          key: 'display_type' },
    { label: 'Power source',     key: 'power_source' },
    { label: 'Keys',             key: 'num_keys' },
    { label: 'Country',          key: 'country_of_origin' },
    { label: 'Rarity',           key: 'rarity_score', format: v => v != null ? `${(v as number).toFixed(1)}/10` : '—' },
    { label: 'Weirdness',        key: 'weirdness_score', format: v => v != null ? `${(v as number).toFixed(1)}/10` : '—' },
    { label: 'Owners',           key: 'owner_count' },
    { label: 'Want it',          key: 'want_count' },
    { label: 'Variants',         key: 'variant_count' },
  ];

  const fmt = (val: unknown, format?: (v: unknown) => string): string => {
    if (format) return format(val);
    if (val == null || val === '') return '—';
    return String(val);
  };

  const winner = (key: keyof Calculator): 'left' | 'right' | 'tie' => {
    const numericHigher: (keyof Calculator)[] = ['rarity_score', 'weirdness_score', 'owner_count', 'want_count', 'variant_count', 'num_keys'];
    if (!numericHigher.includes(key)) return 'tie';
    const l = left[key] as number | null;
    const r = right[key] as number | null;
    if (l == null && r == null) return 'tie';
    if (l == null) return 'right';
    if (r == null) return 'left';
    if (l > r) return 'left';
    if (r > l) return 'right';
    return 'tie';
  };

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-6">
        {[left, right].map((calc, i) => (
          <div key={calc.id} className={i === 1 ? 'text-right' : ''}>
            <Link href={`/calculators/${calc.id}`} className="group">
              <div className="aspect-video bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-2 flex items-center justify-center">
                {calc.images[0]
                  ? <img src={calc.images[0]} alt={calc.model} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  : <span className="text-5xl opacity-20">🧮</span>
                }
              </div>
              <p className="text-xs text-zinc-500 font-mono">{calc.make}</p>
              <p className="font-bold font-mono text-zinc-100 group-hover:text-amber-400 transition-colors">{calc.model}</p>
            </Link>
          </div>
        ))}
        <div className="flex items-center justify-center">
          <span className="text-2xl text-zinc-700">vs</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {rows.map(({ label, key, format }, i) => {
          const lv = fmt(left[key], format);
          const rv = fmt(right[key], format);
          const w = winner(key);
          return (
            <div key={key} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 ${
              i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/50'
            }`}>
              <span className={`font-mono text-sm truncate ${w === 'left' ? 'text-amber-400 font-bold' : 'text-zinc-300'}`}>
                {lv}
              </span>
              <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider text-center w-28 flex-shrink-0">
                {label}
              </span>
              <span className={`font-mono text-sm truncate text-right ${w === 'right' ? 'text-amber-400 font-bold' : 'text-zinc-300'}`}>
                {rv}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tags row */}
      {(left.tags.length > 0 || right.tags.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {[left, right].map(calc => (
            <div key={calc.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {calc.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded font-mono border border-zinc-700">
                    #{t}
                  </span>
                ))}
                {calc.tags.length === 0 && <span className="text-xs text-zinc-700 font-mono">no tags</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
