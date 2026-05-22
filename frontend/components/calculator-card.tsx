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

export function CalculatorCard({ calc }: { calc: Calculator }) {
  const typeColor = TYPE_COLORS[calc.calc_type] ?? TYPE_COLORS.other;
  const yearLabel = calc.year_introduced
    ? calc.year_discontinued
      ? `${calc.year_introduced}–${calc.year_discontinued}`
      : `${calc.year_introduced}`
    : null;

  return (
    <Link href={`/calculators/${calc.id}`}>
      <div className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-amber-400/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
        {/* Image */}
        <div className="aspect-[4/3] bg-zinc-800 flex items-center justify-center overflow-hidden relative">
          {calc.images[0] ? (
            <img
              src={calc.images[0]}
              alt={`${calc.make} ${calc.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl opacity-20 select-none">🧮</span>
          )}
          {calc.weirdness_score && calc.weirdness_score >= 7 && (
            <span className="absolute top-2 right-2 text-xs bg-pink-900/80 text-pink-300 px-1.5 py-0.5 rounded font-mono backdrop-blur-sm">
              🌀
            </span>
          )}
          {calc.is_verified && (
            <span className="absolute top-2 left-2 text-xs bg-amber-900/80 text-amber-400 px-1.5 py-0.5 rounded font-mono backdrop-blur-sm">
              ✓
            </span>
          )}
        </div>

        {/* Info */}
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
          </div>

          {(calc.owner_count > 0 || calc.want_count > 0) && (
            <p className="text-[10px] text-zinc-600 mt-2 font-mono">
              {calc.owner_count > 0 && `${calc.owner_count} own`}
              {calc.owner_count > 0 && calc.want_count > 0 && ' · '}
              {calc.want_count > 0 && `${calc.want_count} want`}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
