'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type UserCollectionStats } from '@/lib/api';

const CONDITION_COLOR: Record<string, string> = {
  mint:      'bg-teal-400',
  excellent: 'bg-blue-400',
  good:      'bg-amber-400',
  fair:      'bg-orange-400',
  poor:      'bg-red-400',
};

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-zinc-100">{value}</p>
      {sub && <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function HBar({ label, value, max, color = 'bg-amber-400' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-zinc-400 w-28 truncate flex-shrink-0 capitalize">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-zinc-500 w-6 text-right">{value}</span>
    </div>
  );
}

export default function UserStatsPage() {
  const { username } = useParams<{ username: string }>();
  const [stats, setStats] = useState<UserCollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.users.collectionStats(username)
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-6 bg-zinc-800 rounded w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-zinc-800 rounded-xl" />)}
      </div>
    </div>
  );

  if (error || !stats) return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center text-zinc-600 font-mono text-sm">
      Could not load stats.
    </div>
  );

  const topBrandMax = Math.max(...Object.values(stats.brand_counts), 1);
  const topDecadeMax = Math.max(...Object.values(stats.decade_counts), 1);
  const topCondMax = Math.max(...Object.values(stats.condition_counts), 1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/u/${username}`} className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">
        ← @{username}
      </Link>
      <h1 className="text-2xl font-bold font-mono text-zinc-100 mt-3 mb-6">
        Collection stats
      </h1>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile label="Owned" value={stats.owned_count} />
        <StatTile label="Wanted" value={stats.wanted_count} />
        {stats.total_value != null
          ? <StatTile label="Total spent" value={`$${stats.total_value.toLocaleString()}`}
              sub={stats.avg_price ? `avg $${stats.avg_price}` : undefined} />
          : <StatTile label="Total spent" value="—" sub="prices not shared" />
        }
        {stats.market_value != null
          ? <StatTile label="Est. market value" value={`$${stats.market_value.toLocaleString()}`}
              sub="based on price guides" />
          : <StatTile
              label="Avg rarity"
              value={stats.avg_rarity != null ? `${stats.avg_rarity}/10` : '—'}
              sub={stats.avg_weirdness != null ? `weird ${stats.avg_weirdness}/10` : undefined}
            />
        }
      </div>
      {stats.market_value != null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatTile
            label="Avg rarity"
            value={stats.avg_rarity != null ? `${stats.avg_rarity}/10` : '—'}
            sub={stats.avg_weirdness != null ? `weird ${stats.avg_weirdness}/10` : undefined}
          />
        </div>
      )}

      {/* Brands */}
      {Object.keys(stats.brand_counts).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Top brands</h2>
          <div className="space-y-2.5">
            {Object.entries(stats.brand_counts).map(([brand, count]) => (
              <HBar key={brand} label={brand} value={count} max={topBrandMax} />
            ))}
          </div>
        </div>
      )}

      {/* Decades */}
      {Object.keys(stats.decade_counts).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">By decade</h2>
          <div className="space-y-2.5">
            {Object.entries(stats.decade_counts).map(([decade, count]) => (
              <HBar key={decade} label={decade} value={count} max={topDecadeMax} color="bg-blue-400" />
            ))}
          </div>
        </div>
      )}

      {/* Condition */}
      {Object.keys(stats.condition_counts).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Condition</h2>
          <div className="space-y-2.5">
            {['mint','excellent','good','fair','poor']
              .filter(c => stats.condition_counts[c])
              .map(c => (
                <HBar key={c} label={c} value={stats.condition_counts[c]} max={topCondMax}
                  color={CONDITION_COLOR[c] ?? 'bg-zinc-400'} />
              ))
            }
          </div>
        </div>
      )}

      {/* Tags */}
      {stats.top_tags.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Top tags</h2>
          <div className="flex flex-wrap gap-2">
            {stats.top_tags.map(({ tag, count }) => (
              <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-amber-400/50 transition-colors">
                <span className="font-mono text-xs text-zinc-400">#{tag}</span>
                <span className="font-mono text-[10px] text-zinc-600">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {stats.owned_count === 0 && (
        <p className="text-center text-zinc-600 font-mono text-sm py-12">No public collection data yet.</p>
      )}
    </div>
  );
}
