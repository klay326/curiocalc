'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Calculator } from '@/lib/api';

const TYPE_COLORS: Record<string, string> = {
  scientific:    'bg-blue-900/40 text-blue-300 border-blue-800/50',
  graphing:      'bg-purple-900/40 text-purple-300 border-purple-800/50',
  financial:     'bg-green-900/40 text-green-300 border-green-800/50',
  databank:      'bg-cyan-900/40 text-cyan-300 border-cyan-800/50',
  novelty:       'bg-pink-900/40 text-pink-300 border-pink-800/50',
  printing:      'bg-orange-900/40 text-orange-300 border-orange-800/50',
  programmable:  'bg-indigo-900/40 text-indigo-300 border-indigo-800/50',
  other:         'bg-zinc-800/60 text-zinc-400 border-zinc-700/50',
};

type Props = {
  calc: Calculator;
  compact?: boolean;
  isAdmin?: boolean;
  onRemoveImage?: () => Promise<void>;
};

export function CalculatorCard({ calc, compact = false, isAdmin = false, onRemoveImage }: Props) {
  const typeColor = TYPE_COLORS[calc.calc_type] ?? TYPE_COLORS.other;
  const yearLabel = calc.year_introduced
    ? calc.year_discontinued
      ? `${calc.year_introduced}–${calc.year_discontinued}`
      : `${calc.year_introduced}`
    : null;

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRemoveImage) return;
    setRemoving(true);
    try { await onRemoveImage(); }
    finally { setRemoving(false); setConfirmRemove(false); }
  };

  if (compact) {
    return (
      <Link href={`/calculators/${calc.id}`}>
        <div className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-amber-400/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
          <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
            {calc.images[0] ? (
              <img src={calc.images[0]} alt={`${calc.make} ${calc.model}`}
                loading="lazy" decoding="async"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <span className="text-3xl opacity-20 select-none">🧮</span>
            )}
          </div>
          <div className="p-2">
            <p className="text-[9px] text-zinc-600 font-mono truncate">{calc.make}</p>
            <p className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors truncate leading-tight">{calc.model}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-amber-400/40 hover:-translate-y-0.5 transition-all duration-200">
      {/* Image — separate from link so admin button doesn't trigger navigation */}
      <div className="aspect-[4/3] bg-zinc-800 flex items-center justify-center overflow-hidden relative">
        <Link href={`/calculators/${calc.id}`} className="absolute inset-0 flex items-center justify-center">
          {calc.images[0] ? (
            <img
              src={calc.images[0]}
              alt={`${calc.make} ${calc.model}`}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl opacity-20 select-none">🧮</span>
          )}
        </Link>

        {/* Badges */}
        {calc.weirdness_score != null && calc.weirdness_score >= 7 && (
          <span className="absolute top-2 right-2 text-xs bg-pink-900/80 text-pink-300 px-1.5 py-0.5 rounded font-mono backdrop-blur-sm pointer-events-none">
            🌀
          </span>
        )}
        {calc.is_verified && (
          <span className="absolute top-2 left-2 text-xs bg-amber-900/80 text-amber-400 px-1.5 py-0.5 rounded font-mono backdrop-blur-sm pointer-events-none">
            ✓
          </span>
        )}
        {calc.rarity_score != null && calc.rarity_score >= 8 && (
          <span className="absolute bottom-2 right-2 text-xs bg-zinc-900/80 text-zinc-400 px-1.5 py-0.5 rounded font-mono backdrop-blur-sm pointer-events-none">
            💎
          </span>
        )}

        {/* Admin remove button */}
        {isAdmin && onRemoveImage && calc.images[0] && (
          <div className="absolute bottom-2 left-2 z-10">
            {confirmRemove ? (
              <div className="flex items-center gap-1 bg-black/85 border border-red-800/60 rounded-lg px-2 py-1">
                <span className="text-red-400 font-mono text-[10px]">Remove?</span>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmRemove(false); }}
                  className="text-zinc-300 font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                >no</button>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="text-white font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
                >{removing ? '…' : 'yes'}</button>
              </div>
            ) : (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmRemove(true); }}
                className="bg-black/70 hover:bg-red-900/80 border border-red-800/50 text-red-400 rounded-lg px-2 py-1 font-mono text-[10px] flex items-center gap-1 transition-colors"
              >
                🗑 remove image
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <Link href={`/calculators/${calc.id}`}>
        <div className="p-3">
          <div className="flex items-start justify-between gap-1 mb-2">
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 font-mono truncate">{calc.make}</p>
              <h3 className="font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors truncate leading-tight">
                {calc.model}
              </h3>
            </div>
            {yearLabel && (
              <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap flex-shrink-0 pt-3">
                {yearLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${typeColor}`}>
              {calc.calc_type}
            </span>
            {calc.variant_count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono bg-zinc-800/60 text-zinc-500 border-zinc-700/50">
                {calc.variant_count} variant{calc.variant_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {(calc.owner_count > 0 || calc.want_count > 0) && (
            <p className="text-[10px] text-zinc-600 mt-2 font-mono">
              {calc.owner_count > 0 && `${calc.owner_count} own`}
              {calc.owner_count > 0 && calc.want_count > 0 && ' · '}
              {calc.want_count > 0 && `${calc.want_count} want`}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}
