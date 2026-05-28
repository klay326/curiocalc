'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type BrandSummary } from '@/lib/api';

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.calculators.brands().then(setBrands).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = brands.filter(b =>
    !query || b.make.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <h1 className="text-3xl font-bold font-mono text-amber-400 mt-3">Brands</h1>
        <p className="text-zinc-500 font-mono text-xs mt-1">{brands.length} manufacturers in the database</p>
      </div>

      <input
        type="text"
        placeholder="Search brands…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors mb-8"
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
              <div className="aspect-square bg-zinc-800 rounded-lg mb-3" />
              <div className="h-3 bg-zinc-800 rounded w-2/3 mb-1" />
              <div className="h-2.5 bg-zinc-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(brand => (
            <Link key={brand.make} href={`/brands/${encodeURIComponent(brand.make)}`}>
              <div className="group bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 hover:-translate-y-0.5 rounded-xl p-4 transition-all duration-200 cursor-pointer">
                {/* Brand image / placeholder */}
                <div className="aspect-square bg-zinc-800 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  {brand.image ? (
                    <img src={brand.image} alt={brand.make}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2" />
                  ) : (
                    <span className="text-3xl opacity-20">🏭</span>
                  )}
                </div>
                <p className="font-bold font-mono text-sm text-zinc-100 group-hover:text-amber-400 transition-colors truncate leading-tight">
                  {brand.make}
                </p>
                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                  {brand.count} model{brand.count !== 1 ? 's' : ''}
                </p>
                {brand.flagship && (
                  <p className="text-[9px] text-zinc-700 font-mono truncate mt-0.5 italic">{brand.flagship}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-600 font-mono text-sm">No brands match "{query}"</div>
      )}
    </div>
  );
}
