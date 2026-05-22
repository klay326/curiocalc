'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CalculatorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [calc, setCalc] = useState<Calculator | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<'owned' | 'wanted' | null>(null);

  useEffect(() => {
    api.calculators.get(id)
      .then(setCalc)
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const addToCollection = async (status: 'owned' | 'wanted') => {
    if (!user) { router.push('/login'); return; }
    setAdding(true);
    try {
      await api.collection.add({ calculator_id: id, status });
      setAddStatus(status);
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-4">
      <div className="h-6 bg-zinc-800 rounded w-1/4" />
      <div className="h-8 bg-zinc-800 rounded w-1/2" />
      <div className="grid md:grid-cols-2 gap-8 mt-6">
        <div className="aspect-square bg-zinc-800 rounded-xl" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-zinc-800 rounded-lg" />)}
        </div>
      </div>
    </div>
  );

  if (!calc) return null;

  const yearRange = calc.year_introduced
    ? calc.year_discontinued
      ? `${calc.year_introduced}–${calc.year_discontinued}`
      : `${calc.year_introduced}–present`
    : null;

  const stats = [
    { label: 'Type',    value: calc.calc_type },
    { label: 'Display', value: calc.display_type || '—' },
    { label: 'Power',   value: calc.power_source || '—' },
    { label: 'Keys',    value: calc.num_keys != null ? String(calc.num_keys) : '—' },
    { label: 'Country', value: calc.country_of_origin || '—' },
    { label: 'Owners',  value: String(calc.owner_count) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/" className="text-xs text-zinc-500 font-mono hover:text-zinc-300 transition-colors mb-6 inline-block">
        ← Back to catalog
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden">
          {calc.images[0] ? (
            <img src={calc.images[0]} alt={`${calc.make} ${calc.model}`} className="w-full h-full object-contain" />
          ) : (
            <span className="text-8xl opacity-10 select-none">🧮</span>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-zinc-500 font-mono text-xs mb-1">{calc.make}</p>
          <h1 className="text-3xl font-bold text-amber-400 font-mono mb-1 leading-tight">{calc.model}</h1>
          {yearRange && <p className="text-zinc-500 font-mono text-sm mb-5">{yearRange}</p>}

          {/* Add to collection */}
          <div className="flex gap-2 mb-6">
            {addStatus ? (
              <div className="px-4 py-2.5 bg-amber-400/10 text-amber-400 rounded-lg font-mono text-sm border border-amber-400/20">
                ✓ Added to {addStatus === 'owned' ? 'collection' : 'wishlist'}
              </div>
            ) : (
              <>
                <button
                  onClick={() => addToCollection('owned')}
                  disabled={adding}
                  className="px-4 py-2.5 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50"
                >
                  I own this
                </button>
                <button
                  onClick={() => addToCollection('wanted')}
                  disabled={adding}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-100 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50 border border-zinc-700"
                >
                  I want this
                </button>
              </>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{label}</p>
                <p className="text-sm font-mono text-zinc-200 mt-0.5 capitalize">{value}</p>
              </div>
            ))}
          </div>

          {/* Scores */}
          {(calc.rarity_score || calc.weirdness_score) && (
            <div className="flex gap-2 mb-5">
              {calc.rarity_score != null && (
                <div className="flex-1 bg-zinc-900 border border-amber-900/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Rarity</p>
                  <p className="text-2xl font-bold text-amber-400 font-mono">{calc.rarity_score.toFixed(1)}</p>
                </div>
              )}
              {calc.weirdness_score != null && (
                <div className="flex-1 bg-zinc-900 border border-pink-900/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Weirdness</p>
                  <p className="text-2xl font-bold text-pink-400 font-mono">{calc.weirdness_score.toFixed(1)}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {calc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {calc.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded font-mono border border-zinc-700">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {calc.description && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-[10px] font-mono text-zinc-600 mb-3 uppercase tracking-widest">About</h2>
          <p className="text-zinc-300 leading-relaxed text-sm">{calc.description}</p>
        </div>
      )}

      {/* Fun facts */}
      {calc.fun_facts && (
        <div className="mt-3 bg-pink-950/20 border border-pink-900/30 rounded-xl p-6">
          <h2 className="text-[10px] font-mono text-pink-500 mb-3 uppercase tracking-widest">🌀 Fun Facts</h2>
          <p className="text-zinc-300 leading-relaxed text-sm">{calc.fun_facts}</p>
        </div>
      )}

      {/* External refs */}
      {Object.keys(calc.external_refs).length > 0 && (
        <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-[10px] font-mono text-zinc-600 mb-3 uppercase tracking-widest">External links</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(calc.external_refs).map(([key, url]) => (
              url && <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono text-amber-400 hover:text-amber-300 underline underline-offset-2">
                {key.replace(/_/g, ' ')} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
