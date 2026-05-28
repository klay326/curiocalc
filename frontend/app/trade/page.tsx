'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ForSaleListing } from '@/lib/api';

const CONDITION_COLORS: Record<string, string> = {
  mint:      'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  excellent: 'text-blue-400 bg-blue-950/40 border-blue-900/50',
  good:      'text-amber-400 bg-amber-950/40 border-amber-900/50',
  fair:      'text-orange-400 bg-orange-950/40 border-orange-900/50',
  poor:      'text-red-400 bg-red-950/40 border-red-900/50',
};

export default function TradePage() {
  const [listings, setListings] = useState<ForSaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.trade.listings()
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = listings.filter(l => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      l.make.toLowerCase().includes(q) ||
      l.model.toLowerCase().includes(q) ||
      l.seller_username.toLowerCase().includes(q) ||
      (l.notes ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <div className="flex items-end gap-4 mt-3">
          <h1 className="text-3xl font-bold font-mono text-green-400">🏷 Trade board</h1>
          <p className="text-zinc-500 font-mono text-sm pb-1">{listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
        </div>
        <p className="text-zinc-600 font-mono text-xs mt-1">
          Calculators for sale or trade from community members. Contact the seller via their profile.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search listings…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-green-500 transition-colors mb-8"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse flex gap-4">
              <div className="w-16 h-16 bg-zinc-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-1/4" />
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-zinc-600 font-mono">
          <div className="text-5xl mb-4">🏷</div>
          <p className="text-sm">
            {query ? `No listings match "${query}"` : 'No listings yet. Mark calculators as for sale from your collection!'}
          </p>
          {!query && (
            <Link href="/collection" className="text-green-400 hover:text-green-300 text-xs mt-3 inline-block transition-colors">
              Go to my collection →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => (
            <div key={listing.entry_id}
              className="bg-zinc-900 border border-zinc-800 hover:border-green-900/50 rounded-xl p-4 flex gap-4 transition-colors">
              {/* Thumb */}
              <Link href={`/calculators/${listing.calculator_id}`} className="flex-shrink-0">
                <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                  {listing.images[0] ? (
                    <img src={listing.images[0]} alt={listing.model}
                      className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl opacity-20">🧮</span>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-600 font-mono">{listing.make}</p>
                    <Link href={`/calculators/${listing.calculator_id}`}>
                      <p className="font-bold font-mono text-zinc-100 hover:text-green-400 transition-colors truncate">
                        {listing.model}
                      </p>
                    </Link>
                  </div>
                  {listing.acquired_price && (
                    <span className="text-sm font-bold font-mono text-green-400 flex-shrink-0">
                      ${listing.acquired_price}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {listing.condition && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono capitalize ${CONDITION_COLORS[listing.condition] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                      {listing.condition}
                    </span>
                  )}
                  {listing.year_introduced && (
                    <span className="text-[10px] text-zinc-600 font-mono">{listing.year_introduced}</span>
                  )}
                  <span className="text-[10px] text-zinc-600 font-mono">{listing.calc_type}</span>
                </div>

                {listing.notes && (
                  <p className="text-xs text-zinc-500 mt-1 leading-snug line-clamp-2">{listing.notes}</p>
                )}

                {/* Seller */}
                <div className="flex items-center gap-2 mt-2">
                  {listing.seller_avatar ? (
                    <img src={listing.seller_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-amber-400 font-mono">
                        {(listing.seller_display_name ?? listing.seller_username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <Link href={`/u/${listing.seller_username}`}
                    className="text-[11px] font-mono text-zinc-500 hover:text-amber-400 transition-colors">
                    {listing.seller_display_name ?? `@${listing.seller_username}`}
                  </Link>
                  <span className="text-[10px] text-zinc-700 font-mono">
                    · {new Date(listing.listed_at).toLocaleDateString()}
                  </span>
                  <Link href={`/u/${listing.seller_username}`}
                    className="ml-auto text-[11px] font-mono text-green-500 hover:text-green-400 transition-colors border border-green-900/50 hover:border-green-700/60 px-2 py-0.5 rounded">
                    contact seller →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
