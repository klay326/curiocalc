'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type CollectionEntry, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type EntryWithCalc = CollectionEntry & { calculator?: Calculator };

function exportCSV(entries: EntryWithCalc[], username: string) {
  const headers = ['Make', 'Model', 'Status', 'Condition', 'Notes', 'Acquired From', 'Price Paid', 'Date Added', 'Year Introduced'];
  const rows = entries.map(e => [
    e.calculator?.make ?? '',
    e.calculator?.model ?? e.calculator_id,
    e.status,
    e.condition ?? '',
    (e.notes ?? '').replace(/,/g, ';'),
    (e.acquired_from ?? '').replace(/,/g, ';'),
    e.acquired_price != null ? String(e.acquired_price) : '',
    new Date(e.created_at).toLocaleDateString(),
    e.calculator?.year_introduced != null ? String(e.calculator.year_introduced) : '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `curiocalc-${username}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── Per-entry photo panel ────────────────────────────────────────────────────

function PhotoPanel({ entry, onUpdate }: { entry: EntryWithCalc; onUpdate: (updated: CollectionEntry) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await api.collection.uploadPhoto(entry.id, file);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async (index: number) => {
    setRemoving(index);
    try {
      const updated = await api.collection.removePhoto(entry.id, index);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 border-t border-zinc-800/60">
      {error && <p className="text-red-400 font-mono text-xs mb-2">{error}</p>}
      {entry.photos.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {entry.photos.map((url, i) => (
            <div key={i} className="relative group/photo w-16 h-16">
              <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-zinc-700" />
              <button
                onClick={() => handleRemove(i)}
                disabled={removing === i}
                className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-red-400 text-xs font-mono"
              >
                {removing === i ? '…' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-200 border border-dashed border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {uploading ? <><span className="animate-spin inline-block">⟳</span> Uploading…</> : <>📷 Add photo</>}
      </button>
    </div>
  );
}

// ── Mini bar chart ───────────────────────────────────────────────────────────

function BarChart({ rows, color = 'bg-amber-400' }: { rows: [string, number][]; color?: string }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="space-y-2">
      {rows.map(([label, count]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500 w-24 truncate text-right capitalize">{label}</span>
          <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
            <div
              className={`${color} h-1.5 rounded-full transition-all duration-500`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-400 w-5 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stats tab ────────────────────────────────────────────────────────────────

function StatsTab({ entries }: { entries: EntryWithCalc[] }) {
  const owned = entries.filter(e => e.status === 'owned');

  const brandCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const decadeCounts: Record<string, number> = {};
  const conditionOrder = ['mint', 'excellent', 'good', 'fair', 'poor'];
  const conditionCounts: Record<string, number> = {};
  let totalSpent = 0;
  let spentCount = 0;

  for (const e of owned) {
    if (e.calculator?.make) brandCounts[e.calculator.make] = (brandCounts[e.calculator.make] ?? 0) + 1;
    if (e.calculator?.calc_type) typeCounts[e.calculator.calc_type] = (typeCounts[e.calculator.calc_type] ?? 0) + 1;
    if (e.calculator?.year_introduced) {
      const decade = `${Math.floor(e.calculator.year_introduced / 10) * 10}s`;
      decadeCounts[decade] = (decadeCounts[decade] ?? 0) + 1;
    }
    if (e.acquired_price != null) { totalSpent += e.acquired_price; spentCount++; }
    if (e.condition) conditionCounts[e.condition] = (conditionCounts[e.condition] ?? 0) + 1;
  }

  const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topTypes  = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const decades   = Object.entries(decadeCounts).sort((a, b) => a[0].localeCompare(b[0]));
  const conditions = conditionOrder
    .filter(c => conditionCounts[c])
    .map(c => [c, conditionCounts[c]] as [string, number]);

  const uniqueBrands = Object.keys(brandCounts).length;
  const uniqueTypes  = Object.keys(typeCounts).length;
  const avgSpend = spentCount > 0 ? totalSpent / spentCount : null;

  if (owned.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-600 font-mono">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm">No owned calculators to analyze.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Owned', value: owned.length, color: 'text-amber-400' },
          { label: 'Brands', value: uniqueBrands, color: 'text-blue-400' },
          { label: 'Types', value: uniqueTypes, color: 'text-purple-400' },
          ...(totalSpent > 0
            ? [{ label: 'Total spent', value: `$${totalSpent.toLocaleString()}`, color: 'text-green-400' }]
            : avgSpend != null
            ? [{ label: 'Avg price', value: `$${avgSpend.toFixed(0)}`, color: 'text-green-400' }]
            : []),
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-[10px] text-zinc-600 font-mono mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Brands */}
        {topBrands.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-4">By Brand</p>
            <BarChart rows={topBrands} color="bg-amber-400" />
          </div>
        )}

        {/* Types */}
        {topTypes.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-4">By Type</p>
            <BarChart rows={topTypes} color="bg-blue-500" />
          </div>
        )}

        {/* Decades */}
        {decades.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-4">By Decade</p>
            <BarChart rows={decades} color="bg-purple-500" />
          </div>
        )}

        {/* Condition */}
        {conditions.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Condition</p>
            <BarChart rows={conditions} color="bg-green-500" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithCalc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'owned' | 'wanted' | 'stats'>('owned');
  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.collection.mine()
      .then(async (data) => {
        const ids = [...new Set(data.map(e => e.calculator_id))];
        const calcs = await api.calculators.batch(ids).catch(() => [] as typeof entries[0]['calculator'][]);
        const calcMap = Object.fromEntries((calcs as Calculator[]).map(c => [c.id, c]));
        setEntries(data.map(e => ({ ...e, calculator: calcMap[e.calculator_id] })));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const remove = async (id: string) => {
    await api.collection.remove(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateEntry = (updated: CollectionEntry) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
  };

  const togglePhotos = (id: string) => {
    setExpandedPhotos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (authLoading || !user) return null;

  const owned   = entries.filter(e => e.status === 'owned');
  const wanted  = entries.filter(e => e.status === 'wanted');
  const forSale = entries.filter(e => e.status === 'for_sale');
  const filtered = activeTab === 'owned' ? owned : activeTab === 'wanted' ? wanted : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono text-amber-400">My Collection</h1>
          <p className="text-zinc-600 text-xs font-mono mt-1">@{user.username}</p>
        </div>
        <button
          onClick={() => exportCSV(entries, user.username)}
          disabled={entries.length === 0}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1.5"
        >
          ⬇ Export CSV
        </button>
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
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['owned', 'wanted', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
              activeTab === tab
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab === 'owned'  ? `Owned (${owned.length})`
            : tab === 'wanted' ? `Wishlist (${wanted.length})`
            : '📊 Stats'}
          </button>
        ))}
        {forSale.length > 0 && (
          <Link href="/trade"
            className="px-4 py-2 rounded-lg font-mono text-sm text-green-400 border border-green-900/40 hover:border-green-700/60 transition-colors">
            🏷 For sale ({forSale.length})
          </Link>
        )}
      </div>

      {/* Stats tab content */}
      {activeTab === 'stats' && !loading && <StatsTab entries={entries} />}

      {/* Entries */}
      {activeTab !== 'stats' && (
        loading ? (
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
            {filtered.map(entry => {
              const photosOpen = expandedPhotos.has(entry.id);
              return (
                <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-colors">
                  <div className="p-4 flex items-center gap-4">
                    {/* Thumbnail */}
                    <Link href={`/calculators/${entry.calculator_id}`} className="flex-shrink-0">
                      <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                        {entry.photos[0] ? (
                          <img src={entry.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : entry.calculator?.images[0] ? (
                          <img src={entry.calculator.images[0]} alt="" className="w-full h-full object-contain" />
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
                        {entry.calculator?.variant_label && (
                          <p className="text-[10px] text-zinc-500 font-mono italic truncate">{entry.calculator.variant_label}</p>
                        )}
                      </Link>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {entry.condition && (
                          <span className="text-[10px] text-zinc-600 font-mono capitalize">{entry.condition}</span>
                        )}
                        {entry.acquired_from && (
                          <span className="text-[10px] text-zinc-600 font-mono">from {entry.acquired_from}</span>
                        )}
                        {entry.acquired_price != null && (
                          <span className="text-[10px] text-zinc-600 font-mono">${entry.acquired_price}</span>
                        )}
                        {entry.photos.length > 0 && (
                          <span className="text-[10px] text-zinc-600 font-mono">📷 {entry.photos.length}</span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{entry.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activeTab === 'owned' && (
                        <button
                          onClick={() => togglePhotos(entry.id)}
                          className={`text-zinc-500 hover:text-zinc-200 transition-colors font-mono text-xs px-2 py-1 rounded border ${
                            photosOpen ? 'border-zinc-600 text-zinc-300 bg-zinc-800' : 'border-zinc-700'
                          }`}
                          title="Photos"
                        >
                          📷
                        </button>
                      )}
                      <button
                        onClick={() => remove(entry.id)}
                        className="text-zinc-700 hover:text-red-500 transition-colors font-mono text-xs"
                      >
                        remove
                      </button>
                    </div>
                  </div>

                  {/* Photo panel */}
                  {photosOpen && activeTab === 'owned' && (
                    <PhotoPanel entry={entry} onUpdate={updateEntry} />
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
