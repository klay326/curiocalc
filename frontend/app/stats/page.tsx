'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type SiteStats } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';

function StatCard({ value, label, color = 'text-amber-400' }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
      <p className={`text-3xl font-bold font-mono ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-zinc-600 font-mono mt-1 uppercase tracking-widest">{label}</p>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats.get().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
      <div className="h-8 bg-zinc-800 rounded w-40" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="h-64 bg-zinc-800 rounded-xl" />
        <div className="h-64 bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );

  if (!stats) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center text-zinc-500 font-mono">
      Failed to load stats.
    </div>
  );

  const maxBrand = Math.max(...stats.top_brands.map(b => b.count), 1);
  const maxDecade = Math.max(...stats.decades.map(d => d.count), 1);
  const coveragePct = stats.total_calcs > 0
    ? Math.round((stats.with_images / stats.total_calcs) * 100) : 0;
  const descPct = stats.total_calcs > 0
    ? Math.round((stats.with_descriptions / stats.total_calcs) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono text-amber-400">Site Stats</h1>
        <p className="text-zinc-600 text-xs font-mono mt-1">Community database snapshot</p>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard value={stats.total_calcs} label="Calculators" />
        <StatCard value={stats.total_brands} label="Brands" color="text-blue-400" />
        <StatCard value={stats.total_users} label="Collectors" color="text-green-400" />
        <StatCard value={stats.total_owned} label="Items owned" color="text-purple-400" />
      </div>

      {/* Coverage */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Photo coverage</p>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{coveragePct}%</span>
            <span className="text-xs text-zinc-600 font-mono pb-0.5">{stats.with_images} of {stats.total_calcs}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${coveragePct}%` }} />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Description coverage</p>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-2xl font-bold font-mono text-blue-400">{descPct}%</span>
            <span className="text-xs text-zinc-600 font-mono pb-0.5">{stats.with_descriptions} of {stats.total_calcs}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${descPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Top brands */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Top brands</h2>
          <div className="space-y-2.5">
            {stats.top_brands.map(b => (
              <div key={b.make}>
                <div className="flex justify-between items-center mb-1">
                  <Link href={`/?make=${encodeURIComponent(b.make)}`}
                    className="text-xs font-mono text-zinc-300 hover:text-amber-400 transition-colors">
                    {b.make}
                  </Link>
                  <span className="text-xs font-mono text-zinc-600">{b.count}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400/70 rounded-full"
                    style={{ width: `${(b.count / maxBrand) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decade breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">By decade</h2>
          <div className="space-y-2.5">
            {stats.decades.map(d => (
              <div key={d.decade}>
                <div className="flex justify-between items-center mb-1">
                  <Link href={`/?decade=${d.decade}`}
                    className="text-xs font-mono text-zinc-300 hover:text-amber-400 transition-colors">
                    {d.decade}s
                  </Link>
                  <span className="text-xs font-mono text-zinc-600">{d.count}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400/70 rounded-full"
                    style={{ width: `${(d.count / maxDecade) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent additions */}
      {stats.recent.length > 0 && (
        <div>
          <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Recently added</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.recent.map(c => (
              <CalculatorCard key={c.id} calc={c} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
