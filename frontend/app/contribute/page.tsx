'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function CalcCard({ calc }: { calc: Calculator }) {
  const missing: string[] = [];
  if (calc.images.length === 0) missing.push('image');
  if (!calc.description) missing.push('description');

  return (
    <Link
      href={`/calculators/${calc.id}`}
      className="bg-zinc-900 border border-zinc-800 hover:border-amber-700/60 rounded-xl p-4 flex items-center gap-4 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
        {calc.images[0] ? (
          <img src={calc.images[0]} alt="" className="w-full h-full object-contain rounded-lg" />
        ) : (
          <span className="text-3xl opacity-20">🧮</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-600 font-mono">{calc.make}</p>
        <p className="font-bold font-mono text-zinc-100 group-hover:text-amber-400 transition-colors truncate text-sm">
          {calc.model}
        </p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {missing.map((m) => (
            <span key={m} className="text-[10px] font-mono bg-red-950/40 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded">
              missing {m}
            </span>
          ))}
        </div>
      </div>

      <span className="text-amber-400 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        edit →
      </span>
    </Link>
  );
}

export default function ContributePage() {
  const { user } = useAuth();
  const [calcs, setCalcs] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Contribute — CurioCalc';
    api.calculators.needsWork(24)
      .then(setCalcs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    setLoading(true);
    api.calculators.needsWork(24)
      .then(setCalcs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono text-amber-400">Help Improve CurioCalc</h1>
        <p className="text-zinc-500 text-sm font-mono mt-1">
          These calculators need images or descriptions. Click any to edit.
        </p>
        {!user && (
          <p className="text-zinc-600 text-xs font-mono mt-2">
            <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">Sign in</Link>
            {' '}or{' '}
            <Link href="/register" className="text-amber-400 hover:text-amber-300 transition-colors">register</Link>
            {' '}to submit improvements.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-zinc-600 font-mono">
          Showing {calcs.length} calculators needing attention
        </p>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
        >
          ↻ Shuffle
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : calcs.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 font-mono">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-sm">Everything looks complete! The catalog is in great shape.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {calcs.map((c) => <CalcCard key={c.id} calc={c} />)}
        </div>
      )}

      {/* How to help */}
      <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-bold font-mono text-zinc-300 mb-3">How to contribute</h2>
        <ol className="space-y-1.5 text-xs font-mono text-zinc-500 list-decimal list-inside">
          <li>Click a calculator that needs work</li>
          <li>Use the <span className="text-amber-400">Suggest Edit</span> button to propose changes</li>
          <li>Admins review and approve within a few days</li>
          <li>Your username appears in the edit history 🎉</li>
        </ol>
      </div>
    </div>
  );
}
