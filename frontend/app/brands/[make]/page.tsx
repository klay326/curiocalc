'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CalculatorCard } from '@/components/calculator-card';

const SORTS = [
  { value: 'year_introduced', label: 'Year ↑' },
  { value: '-year_introduced', label: 'Year ↓' },
  { value: 'make', label: 'A–Z' },
  { value: '-rarity_score', label: 'Rarest' },
];

export default function BrandPage() {
  const { make } = useParams<{ make: string }>();
  const { user } = useAuth();
  const decodedMake = decodeURIComponent(make);

  const [calcs, setCalcs]   = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort]     = useState('year_introduced');

  const sortKey   = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';

  useEffect(() => {
    setLoading(true);
    api.calculators.list({ make: decodedMake, sort: sortKey, order: sortOrder, limit: 200 })
      .then(setCalcs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [decodedMake, sortKey, sortOrder]);

  const removeFirstImage = async (calcId: string) => {
    const calc = calcs.find(c => c.id === calcId);
    if (!calc || calc.images.length === 0) return;
    const newImages = calc.images.slice(1);
    try {
      const updated = await api.calculators.update(calcId, { images: newImages } as Partial<Calculator>);
      setCalcs(prev => prev.map(c => c.id === calcId ? updated : c));
    } catch (e) { console.error(e); }
  };

  const decades = [...new Set(calcs.map(c => c.year_introduced ? Math.floor(c.year_introduced / 10) * 10 : null).filter(Boolean) as number[])].sort();
  const earliest = calcs.reduce((a, c) => c.year_introduced && c.year_introduced < (a || 9999) ? c.year_introduced : a, null as number | null);
  const latest   = calcs.reduce((a, c) => c.year_introduced && c.year_introduced > (a || 0) ? c.year_introduced : a, null as number | null);
  const withImages = calcs.filter(c => c.images.length > 0).length;

  const renderGrid = (group: Calculator[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {group.map(c => (
        <CalculatorCard
          key={c.id}
          calc={c}
          isAdmin={user?.is_superuser}
          onRemoveImage={user?.is_superuser && c.images.length > 0 ? () => removeFirstImage(c.id) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/brands" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← brands</Link>
        <div className="flex items-end gap-4 mt-3">
          <h1 className="text-4xl font-bold font-mono text-amber-400">{decodedMake}</h1>
          <p className="text-zinc-500 font-mono text-sm pb-1">{calcs.length} model{calcs.length !== 1 ? 's' : ''}</p>
        </div>
        {(earliest || latest) && (
          <p className="text-zinc-600 font-mono text-xs mt-1">
            {earliest && latest ? `${earliest}–${latest}` : earliest ?? latest}
          </p>
        )}
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { label: 'Models', value: calcs.length },
          { label: 'With photos', value: withImages },
          { label: 'Decades', value: decades.length },
          { label: 'Collectors own', value: calcs.reduce((a, c) => a + c.owner_count, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-center">
            <p className="text-lg font-bold font-mono text-amber-400">{value}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Sort:</span>
        {SORTS.map(s => (
          <button key={s.value} onClick={() => setSort(s.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              sort === s.value ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
            }`}>{s.label}</button>
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
      ) : sortKey === 'year_introduced' && decades.length > 1 ? (
        <div className="space-y-10">
          {(() => {
            const undated = calcs.filter(c => !c.year_introduced);
            if (!undated.length) return null;
            return (
              <div>
                <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Unknown year</h2>
                {renderGrid(undated)}
              </div>
            );
          })()}
          {decades.map(decade => {
            const group = calcs.filter(c => c.year_introduced && Math.floor(c.year_introduced / 10) * 10 === decade);
            if (!group.length) return null;
            return (
              <div key={decade}>
                <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">
                  {decade}s
                  <span className="text-zinc-700 ml-2 normal-case">({group.length})</span>
                </h2>
                {renderGrid(group)}
              </div>
            );
          })}
        </div>
      ) : (
        renderGrid(calcs)
      )}

      {!loading && calcs.length === 0 && (
        <div className="text-center py-20 text-zinc-600 font-mono">
          <div className="text-5xl mb-4">🧮</div>
          <p>No calculators found for {decodedMake}.</p>
        </div>
      )}
    </div>
  );
}
