'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, type ForSaleListing } from '@/lib/api';

const CONDITION_BADGE: Record<string, string> = {
  mint:      'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  excellent: 'text-blue-400 bg-blue-950/40 border-blue-900/50',
  good:      'text-amber-400 bg-amber-950/40 border-amber-900/50',
  fair:      'text-orange-400 bg-orange-950/40 border-orange-900/50',
  poor:      'text-red-400 bg-red-950/40 border-red-900/50',
};

function ListingCard({ listing }: { listing: ForSaleListing }) {
  const img = listing.images?.[0];
  const name = `${listing.make} ${listing.model}`;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors flex flex-col">
      <Link href={`/calculators/${listing.calculator_id}`}>
        <div className="aspect-[4/3] bg-zinc-800 flex items-center justify-center overflow-hidden">
          {img
            ? <img src={img} alt={name} className="w-full h-full object-cover" />
            : <span className="text-4xl opacity-20">🧮</span>}
        </div>
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <Link href={`/calculators/${listing.calculator_id}`}
            className="font-bold font-mono text-zinc-100 text-sm hover:text-amber-400 transition-colors line-clamp-1">
            {name}
          </Link>
          {listing.year_introduced && (
            <p className="text-[10px] font-mono text-zinc-600">{listing.year_introduced}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {listing.condition && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${CONDITION_BADGE[listing.condition] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
              {listing.condition}
            </span>
          )}
          {listing.calc_type && (
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
              {listing.calc_type}
            </span>
          )}
        </div>

        {listing.acquired_price != null && (
          <p className="text-lg font-bold font-mono text-amber-400">${listing.acquired_price.toFixed(2)}</p>
        )}

        {listing.notes && (
          <p className="text-xs font-mono text-zinc-500 line-clamp-2">{listing.notes}</p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <Link href={`/u/${listing.seller_username}`}
            className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-amber-900/40 border border-amber-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {listing.seller_avatar
                ? <img src={listing.seller_avatar} alt="" className="w-full h-full object-cover" />
                : <span className="text-[9px] font-bold text-amber-400 font-mono">
                    {(listing.seller_display_name ?? listing.seller_username).charAt(0).toUpperCase()}
                  </span>
              }
            </div>
            <span className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 truncate transition-colors">
              @{listing.seller_username}
            </span>
          </Link>
          <Link href={`/trade`}
            className="text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0">
            Contact →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const [listings, setListings] = useState<ForSaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [condFilter, setCondFilter] = useState('');
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none');

  useEffect(() => {
    api.trade.listings()
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const makes = useMemo(() => {
    const s = new Set(listings.map(l => l.make));
    return Array.from(s).sort();
  }, [listings]);

  const types = useMemo(() => {
    const s = new Set(listings.map(l => l.calc_type).filter(Boolean));
    return Array.from(s).sort();
  }, [listings]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let out = listings.filter(l => {
      if (q && !`${l.make} ${l.model} ${l.notes ?? ''}`.toLowerCase().includes(q)) return false;
      if (makeFilter && l.make !== makeFilter) return false;
      if (typeFilter && l.calc_type !== typeFilter) return false;
      if (condFilter && l.condition !== condFilter) return false;
      return true;
    });
    if (priceSort === 'asc') out = [...out].sort((a, b) => (a.acquired_price ?? Infinity) - (b.acquired_price ?? Infinity));
    if (priceSort === 'desc') out = [...out].sort((a, b) => (b.acquired_price ?? -Infinity) - (a.acquired_price ?? -Infinity));
    return out;
  }, [listings, query, makeFilter, typeFilter, condFilter, priceSort]);

  const selectCls = 'bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 transition-colors';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← home</Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-bold font-mono text-amber-400">Marketplace</h1>
            <p className="text-zinc-500 font-mono text-xs mt-1">
              {loading ? 'Loading…' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} from collectors`}
            </p>
          </div>
          <Link href="/trade"
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors">
            All trades ↗
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search listings…"
          className="bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400 transition-colors flex-1 min-w-40 placeholder-zinc-700"
        />
        <select value={makeFilter} onChange={e => setMakeFilter(e.target.value)} className={selectCls}>
          <option value="">All brands</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="">All types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={condFilter} onChange={e => setCondFilter(e.target.value)} className={selectCls}>
          <option value="">Any condition</option>
          {['mint', 'excellent', 'good', 'fair', 'poor'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priceSort} onChange={e => setPriceSort(e.target.value as typeof priceSort)} className={selectCls}>
          <option value="none">Sort: newest</option>
          <option value="asc">Price: low to high</option>
          <option value="desc">Price: high to low</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-zinc-800" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-zinc-600 font-mono text-sm mb-3">
            {listings.length === 0 ? 'No listings yet' : 'No listings match your filters'}
          </p>
          {listings.length === 0 && (
            <p className="text-zinc-700 font-mono text-xs">
              Mark a calc as &ldquo;for sale&rdquo; in your collection to list it here.
            </p>
          )}
          {listings.length > 0 && (
            <button onClick={() => { setQuery(''); setMakeFilter(''); setTypeFilter(''); setCondFilter(''); setPriceSort('none'); }}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(l => <ListingCard key={l.entry_id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
