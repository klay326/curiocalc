'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Calculator } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';

type Section = {
  title: string;
  emoji: string;
  calcs: Calculator[];
  desc: string;
};

export default function TrendingPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats.trending()
      .then(data => {
        setSections([
          {
            title: 'Hot this week',
            emoji: '🔥',
            desc: 'Most added to collections in the past 7 days',
            calcs: data.trending_owned,
          },
          {
            title: 'Most wanted',
            emoji: '⭐',
            desc: 'Most added to wishlists this week',
            calcs: data.trending_wanted,
          },
          {
            title: 'New additions',
            emoji: '✨',
            desc: 'Recently added to the database',
            calcs: data.new_this_week,
          },
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <h1 className="text-3xl font-bold font-mono text-amber-400 mt-3">Trending</h1>
        <p className="text-zinc-500 font-mono text-xs mt-1">What the community is collecting right now</p>
      </div>

      {loading ? (
        <div className="space-y-12">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-5 bg-zinc-800 rounded w-48 mb-4 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse">
                    <div className="aspect-[4/3] bg-zinc-800 rounded-t-xl" />
                    <div className="p-3 space-y-2">
                      <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
                      <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-14">
          {sections.map(({ title, emoji, desc, calcs }) => (
            <section key={title}>
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  {emoji} {title}
                </h2>
                <span className="text-[10px] text-zinc-700 font-mono normal-case">({calcs.length})</span>
              </div>
              <p className="text-xs text-zinc-600 font-mono mb-5">{desc}</p>

              {calcs.length === 0 ? (
                <p className="text-zinc-700 font-mono text-sm italic">Nothing yet — check back after more activity!</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {calcs.map(c => <CalculatorCard key={c.id} calc={c} compact />)}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
