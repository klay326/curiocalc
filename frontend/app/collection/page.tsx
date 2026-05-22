'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type CollectionEntry, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type EntryWithCalc = CollectionEntry & { calculator?: Calculator };

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithCalc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'owned' | 'wanted'>('owned');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.collection.mine()
      .then(async (data) => {
        const enriched = await Promise.all(
          data.map(async (e) => {
            try { return { ...e, calculator: await api.calculators.get(e.calculator_id) }; }
            catch { return e; }
          })
        );
        setEntries(enriched);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const remove = async (id: string) => {
    await api.collection.remove(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  if (authLoading || !user) return null;

  const owned  = entries.filter(e => e.status === 'owned');
  const wanted = entries.filter(e => e.status === 'wanted');
  const forSale = entries.filter(e => e.status === 'for_sale');
  const filtered = activeTab === 'owned' ? owned : wanted;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono text-amber-400">My Collection</h1>
        <p className="text-zinc-600 text-xs font-mono mt-1">@{user.username}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Owned',    value: owned.length,   color: 'text-amber-400' },
          { label: 'Wishlist', value: wanted.length,   color: 'text-blue-400' },
          { label: 'For Sale', value: forSale.length,  color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-zinc-600 font-mono mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['owned', 'wanted'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
              activeTab === tab
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab === 'owned' ? `Owned (${owned.length})` : `Wishlist (${wanted.length})`}
          </button>
        ))}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 font-mono">
          <div className="text-4xl mb-3">🧮</div>
          <p className="text-sm">{activeTab === 'owned' ? "No calculators in your collection yet." : "Your wishlist is empty."}</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-xs mt-2 inline-block transition-colors">
            Browse the catalog →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 group hover:border-zinc-700 transition-colors">
              {/* Thumbnail */}
              <Link href={`/calculators/${entry.calculator_id}`} className="flex-shrink-0">
                <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                  {entry.calculator?.images[0] ? (
                    <img src={entry.calculator.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl opacity-20">🧮</span>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/calculators/${entry.calculator_id}`}>
                  <p className="text-[10px] text-zinc-600 font-mono">{entry.calculator?.make}</p>
                  <p className="font-bold font-mono text-zinc-100 truncate text-sm hover:text-amber-400 transition-colors">
                    {entry.calculator?.model ?? entry.calculator_id}
                  </p>
                </Link>
                <div className="flex gap-3 mt-1">
                  {entry.condition && (
                    <span className="text-[10px] text-zinc-600 font-mono capitalize">{entry.condition}</span>
                  )}
                  {entry.acquired_from && (
                    <span className="text-[10px] text-zinc-600 font-mono">from {entry.acquired_from}</span>
                  )}
                  {entry.acquired_price && (
                    <span className="text-[10px] text-zinc-600 font-mono">${entry.acquired_price}</span>
                  )}
                </div>
                {entry.notes && (
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{entry.notes}</p>
                )}
              </div>

              {/* Remove */}
              <button
                onClick={() => remove(entry.id)}
                className="text-zinc-700 hover:text-red-500 transition-colors font-mono text-xs opacity-0 group-hover:opacity-100"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
