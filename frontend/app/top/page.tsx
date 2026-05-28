'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type LeaderboardEntry } from '@/lib/api';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Leaderboard — CurioCalc';
    api.users.leaderboard()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono text-amber-400">Top Collectors</h1>
        <p className="text-zinc-500 text-sm font-mono mt-1">Ranked by owned calculators in public collections</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 font-mono">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm">No collectors on the board yet. Start your collection!</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-xs mt-2 inline-block transition-colors">
            Browse the catalog →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry.username}
              href={`/u/${entry.username}`}
              className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
            >
              {/* Rank */}
              <div className="w-10 text-center flex-shrink-0">
                {entry.rank <= 3 ? (
                  <span className="text-2xl">{MEDALS[entry.rank - 1]}</span>
                ) : (
                  <span className="text-lg font-bold font-mono text-zinc-600">#{entry.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500 text-lg">
                    {(entry.display_name ?? entry.username)[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-bold font-mono text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                  {entry.display_name ?? entry.username}
                </p>
                <p className="text-[10px] text-zinc-600 font-mono">@{entry.username}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-right flex-shrink-0">
                <div>
                  <p className="text-xl font-bold font-mono text-amber-400">{entry.owned_count}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">owned</p>
                </div>
                <div>
                  <p className="text-xl font-bold font-mono text-blue-400">{entry.brand_count}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">brands</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-center text-zinc-700 text-xs font-mono mt-8">
        Only public collections count.{' '}
        <Link href="/collection" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          Make yours public →
        </Link>
      </p>
    </div>
  );
}
