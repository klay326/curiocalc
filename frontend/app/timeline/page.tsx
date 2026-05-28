'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Calculator, type SiteStats } from '@/lib/api';

const TYPE_COLORS: Record<string, string> = {
  scientific:   'bg-blue-900/60 border-blue-700/50',
  graphing:     'bg-purple-900/60 border-purple-700/50',
  financial:    'bg-green-900/60 border-green-700/50',
  databank:     'bg-cyan-900/60 border-cyan-700/50',
  novelty:      'bg-pink-900/60 border-pink-700/50',
  printing:     'bg-orange-900/60 border-orange-700/50',
  programmable: 'bg-indigo-900/60 border-indigo-700/50',
  other:        'bg-zinc-800/60 border-zinc-700/50',
};

const TYPE_DOT: Record<string, string> = {
  scientific:   'bg-blue-400',
  graphing:     'bg-purple-400',
  financial:    'bg-green-400',
  databank:     'bg-cyan-400',
  novelty:      'bg-pink-400',
  printing:     'bg-orange-400',
  programmable: 'bg-indigo-400',
  other:        'bg-zinc-500',
};

const DECADE_LABELS: Record<number, string> = {
  1960: '60s — The Dawn',
  1970: '70s — The Revolution',
  1980: '80s — The Golden Age',
  1990: '90s — Graphing Era',
  2000: '2000s — Digital Age',
  2010: '2010s — Smartphones Shadow',
  2020: '2020s — Niche Renaissance',
};

export default function TimelinePage() {
  const [stats, setStats]     = useState<SiteStats | null>(null);
  const [calcs, setCalcs]     = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [selectedType, setSelectedType]     = useState<string | null>(null);

  useEffect(() => {
    // Load all calcs in two batches to cover full 865+ database
    const loadAll = async () => {
      const [s, first, second, third] = await Promise.all([
        api.stats.get(),
        api.calculators.list({ sort: 'year_introduced', order: 'asc', limit: 200, skip: 0 }),
        api.calculators.list({ sort: 'year_introduced', order: 'asc', limit: 200, skip: 200 }),
        api.calculators.list({ sort: 'year_introduced', order: 'asc', limit: 200, skip: 400 }),
      ]);
      const fourth = await api.calculators.list({ sort: 'year_introduced', order: 'asc', limit: 200, skip: 600 });
      const fifth  = await api.calculators.list({ sort: 'year_introduced', order: 'asc', limit: 200, skip: 800 });
      return [s, [...first, ...second, ...third, ...fourth, ...fifth]] as [typeof s, Calculator[]];
    };
    loadAll()
      .then(([s, c]) => { setStats(s); setCalcs(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line

  const decades = stats?.decades ?? [];
  const maxCount = Math.max(...decades.map(d => d.count), 1);

  // Group calcs by decade for the detail view
  const byDecade = calcs.reduce<Record<number, Calculator[]>>((acc, c) => {
    if (!c.year_introduced) return acc;
    const d = Math.floor(c.year_introduced / 10) * 10;
    if (!acc[d]) acc[d] = [];
    acc[d].push(c);
    return acc;
  }, {});

  const displayCalcs = calcs.filter(c => {
    if (!c.year_introduced) return false;
    const d = Math.floor(c.year_introduced / 10) * 10;
    if (selectedDecade && d !== selectedDecade) return false;
    if (selectedType && c.calc_type !== selectedType) return false;
    return true;
  });

  const types = [...new Set(calcs.map(c => c.calc_type))].sort();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <h1 className="text-3xl font-bold font-mono text-amber-400 mt-3">Timeline</h1>
        <p className="text-zinc-500 font-mono text-xs mt-1">Calculator history by decade</p>
      </div>

      {/* Decade bar chart */}
      {!loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Models by decade</p>
          <div className="flex items-end gap-2 h-28">
            {decades.map(({ decade, count }) => {
              const pct = (count / maxCount) * 100;
              const active = selectedDecade === decade;
              return (
                <button
                  key={decade}
                  onClick={() => setSelectedDecade(active ? null : decade)}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-[9px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    {count}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      active ? 'bg-amber-400' : 'bg-zinc-700 group-hover:bg-zinc-500'
                    }`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className={`text-[9px] font-mono transition-colors ${
                    active ? 'text-amber-400 font-bold' : 'text-zinc-600 group-hover:text-zinc-400'
                  }`}>{decade}s</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Type legend + filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setSelectedType(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
            !selectedType ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
          }`}>all types</button>
        {types.map(t => (
          <button key={t} onClick={() => setSelectedType(t === selectedType ? null : t)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              selectedType === t ? 'bg-zinc-700 text-zinc-100 border-zinc-500 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
            }`}>
            <span className={`w-2 h-2 rounded-full ${TYPE_DOT[t] ?? TYPE_DOT.other}`} />
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-8">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-32 mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({length: 6}).map((_, j) => (
                  <div key={j} className="bg-zinc-900 border border-zinc-800 rounded-xl">
                    <div className="aspect-square bg-zinc-800 rounded-t-xl" />
                    <div className="p-2 space-y-1">
                      <div className="h-2 bg-zinc-800 rounded w-2/3" />
                      <div className="h-2.5 bg-zinc-800 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : selectedDecade ? (
        /* Filtered single decade */
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold font-mono text-amber-400">{selectedDecade}s</h2>
            <p className="text-zinc-500 font-mono text-xs">{DECADE_LABELS[selectedDecade] ?? ''}</p>
            <span className="text-zinc-600 font-mono text-xs">
              {displayCalcs.length} model{displayCalcs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayCalcs.map(c => <TimelineCard key={c.id} calc={c} />)}
          </div>
        </div>
      ) : (
        /* All decades */
        <div className="space-y-12">
          {Object.keys(byDecade).map(Number).sort().map(decade => {
            const group = (byDecade[decade] ?? []).filter(c =>
              !selectedType || c.calc_type === selectedType
            );
            if (!group.length) return null;
            return (
              <div key={decade}>
                <div className="flex items-baseline gap-3 mb-4">
                  <button onClick={() => setSelectedDecade(decade)}
                    className="text-xl font-bold font-mono text-amber-400 hover:text-amber-300 transition-colors">
                    {decade}s
                  </button>
                  {DECADE_LABELS[decade] && (
                    <span className="text-zinc-600 font-mono text-xs">{DECADE_LABELS[decade]}</span>
                  )}
                  <span className="text-zinc-700 font-mono text-xs ml-auto">{group.length} models</span>
                </div>

                {/* Horizontal scrolling row */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {group.slice(0, 20).map(c => <TimelineCard key={c.id} calc={c} compact />)}
                  {group.length > 20 && (
                    <button onClick={() => setSelectedDecade(decade)}
                      className="flex-shrink-0 w-28 bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 rounded-xl flex flex-col items-center justify-center gap-1 p-3 transition-colors group">
                      <span className="text-xl font-bold text-amber-400">+{group.length - 20}</span>
                      <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400">more</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Undated */}
          {(() => {
            const undated = calcs.filter(c => !c.year_introduced && (!selectedType || c.calc_type === selectedType));
            if (!undated.length) return null;
            return (
              <div>
                <h2 className="text-xl font-bold font-mono text-zinc-600 mb-4">Undated</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {undated.slice(0, 10).map(c => <TimelineCard key={c.id} calc={c} />)}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function TimelineCard({ calc, compact = false }: { calc: Calculator; compact?: boolean }) {
  const color = TYPE_COLORS[calc.calc_type] ?? TYPE_COLORS.other;
  return (
    <Link href={`/calculators/${calc.id}`}
      className={`group flex-shrink-0 bg-zinc-900 border ${color} hover:border-amber-400/50 hover:-translate-y-0.5 rounded-xl overflow-hidden transition-all duration-200 ${
        compact ? 'w-28' : ''
      }`}>
      <div className={`bg-zinc-800 flex items-center justify-center overflow-hidden ${compact ? 'aspect-square' : 'aspect-[4/3]'}`}>
        {calc.images[0] ? (
          <img src={calc.images[0]} alt={calc.model}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <span className={`opacity-20 select-none ${compact ? 'text-2xl' : 'text-4xl'}`}>🧮</span>
        )}
      </div>
      <div className={compact ? 'p-1.5' : 'p-2'}>
        {!compact && <p className="text-[9px] text-zinc-600 font-mono truncate">{calc.make}</p>}
        <p className={`font-bold text-zinc-200 group-hover:text-amber-400 transition-colors truncate leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {compact ? calc.model : `${calc.make} ${calc.model}`}
        </p>
        {calc.year_introduced && !compact && (
          <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{calc.year_introduced}</p>
        )}
      </div>
    </Link>
  );
}
