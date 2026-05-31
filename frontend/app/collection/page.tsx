'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type CollectionEntry, type Calculator, type AuthUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type EntryWithCalc = CollectionEntry & { calculator?: Calculator };

// ── Mark-for-sale inline form ────────────────────────────────────────────────

function ForSaleForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: EntryWithCalc;
  onSave: (updated: CollectionEntry) => void;
  onCancel: () => void;
}) {
  const [price, setPrice] = useState(entry.acquired_price != null ? String(entry.acquired_price) : '');
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.collection.update(entry.id, {
        status: 'for_sale',
        acquired_price: price ? parseFloat(price) : entry.acquired_price,
        notes: notes.trim() || entry.notes,
      } as Partial<CollectionEntry>);
      onSave(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-4 pt-3 border-t border-zinc-800/60 bg-zinc-950/40">
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">List for sale</p>
      {error && <p className="text-red-400 font-mono text-xs mb-2">{error}</p>}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-zinc-600 block mb-1">Asking price ($)</label>
          <input
            type="number" value={price} onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 45.00" min="0" step="0.01"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-[10px] font-mono text-zinc-600 block mb-1">Listing notes</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Condition details, shipping info, etc."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-green-500 transition-colors resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg font-mono text-xs hover:bg-zinc-700 border border-zinc-700 transition-colors">
          cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-mono text-xs font-bold hover:bg-green-500 transition-colors disabled:opacity-50">
          {saving ? 'Listing…' : '🏷 List for sale'}
        </button>
      </div>
    </div>
  );
}

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

// ── CSV bulk import ───────────────────────────────────────────────────────

function CsvImport({ onImported }: { onImported: (added: EntryWithCalc[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ label: string; ok: boolean }[]>([]);

  const parseCSV = (text: string): string[][] => {
    return text.trim().split('\n').map(line =>
      line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim())
    );
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      // Skip header row if first cell looks like a header
      const data = parsed[0]?.[0]?.toLowerCase().includes('make') ? parsed.slice(1) : parsed;
      setRows(data.filter(r => r.length >= 2 && r[0] && r[1]));
      setResults([]);
      setOpen(true);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const runImport = async () => {
    setImporting(true);
    const added: EntryWithCalc[] = [];
    const res: { label: string; ok: boolean }[] = [];

    for (const row of rows) {
      const [make, model, condition, notes, acquired_from, price] = row;
      const label = `${make} ${model}`;
      try {
        // Search for the calculator
        const results = await api.calculators.list({ q: `${make} ${model}`, limit: 5 });
        const match = results.find(c =>
          c.make.toLowerCase() === make.toLowerCase() &&
          c.model.toLowerCase() === model.toLowerCase()
        ) ?? results.find(c =>
          c.make.toLowerCase().includes(make.toLowerCase()) &&
          c.model.toLowerCase().includes(model.toLowerCase())
        );

        if (!match) { res.push({ label, ok: false }); continue; }

        const entry = await api.collection.add({
          calculator_id: match.id,
          status: 'owned',
          condition: condition || null,
          notes: notes || null,
          acquired_from: acquired_from || null,
          acquired_price: price ? parseFloat(price) : null,
        });
        added.push({ ...entry, calculator: match });
        res.push({ label, ok: true });
      } catch {
        res.push({ label, ok: false });
      }
    }

    setResults(res);
    setImporting(false);
    if (added.length > 0) onImported(added);
  };

  const done = results.length > 0;
  const okCount = results.filter(r => r.ok).length;

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        className="text-xs font-mono text-zinc-500 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        title="Import from CSV"
      >
        ⬆ Import CSV
      </button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />

      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-zinc-100">Import Collection</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-300 text-xl leading-none">✕</button>
            </div>

            <p className="text-[11px] font-mono text-zinc-500 mb-4">
              CSV format: <span className="text-zinc-400">Make, Model, Condition, Notes, Acquired From, Price</span>
              <br/>Condition values: mint / excellent / good / fair / poor
            </p>

            {!done ? (
              <>
                <div className="bg-zinc-800 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                  {rows.length === 0 ? (
                    <p className="text-zinc-600 font-mono text-xs italic">No rows found</p>
                  ) : rows.map((r, i) => (
                    <div key={i} className="text-[11px] font-mono text-zinc-400 py-0.5 border-b border-zinc-700/50 last:border-0">
                      <span className="text-zinc-200">{r[0]}</span> {r[1]}
                      {r[2] && <span className="text-zinc-600 ml-2">· {r[2]}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors border border-zinc-700">
                    Cancel
                  </button>
                  <button onClick={runImport} disabled={importing || rows.length === 0}
                    className="flex-1 px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
                    {importing ? 'Importing…' : `Import ${rows.length} rows`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-2xl font-bold font-mono text-amber-400">{okCount}/{results.length}</p>
                  <p className="text-xs font-mono text-zinc-500">calculators imported</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto space-y-1">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
                      <span className={r.ok ? 'text-green-400' : 'text-red-400'}>{r.ok ? '✓' : '✗'}</span>
                      <span className={r.ok ? 'text-zinc-300' : 'text-zinc-600'}>{r.label}</span>
                      {!r.ok && <span className="text-zinc-700">not found</span>}
                    </div>
                  ))}
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-full px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors border border-zinc-700">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Shelf / collection photo gallery ─────────────────────────────────────

function ShelfPhotos({ user, onUpdate }: { user: AuthUser; onUpdate: (u: AuthUser) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photos = user.collection_photos ?? [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await api.users.uploadShelfPhoto(file);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async (i: number) => {
    setRemoving(i);
    setLightbox(null);
    try {
      const updated = await api.users.removeShelfPhoto(i);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">My Shelf</p>
        {photos.length < 20 && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-200 border border-dashed border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? <><span className="animate-spin inline-block text-sm">⟳</span> Uploading…</> : <>📷 Add photo</>}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {error && <p className="text-red-400 font-mono text-xs mb-2">{error}</p>}

      {photos.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-zinc-800 hover:border-zinc-600 rounded-xl text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50"
        >
          <span className="text-3xl">📸</span>
          <span className="text-xs font-mono">Upload a photo of your collection shelf</span>
        </button>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className="relative flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors group/shelf"
            >
              <img src={url} alt={`shelf photo ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover/shelf:bg-black/30 transition-colors rounded-xl" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={photos[lightbox]}
              alt="shelf photo"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={() => handleRemove(lightbox)}
                disabled={removing === lightbox}
                className="bg-red-600/90 hover:bg-red-500 text-white font-mono text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {removing === lightbox ? '…' : '🗑 Remove'}
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 font-mono text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
            </div>
            {/* Prev/next navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox((lightbox - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white font-mono text-sm w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                >‹</button>
                <button
                  onClick={() => setLightbox((lightbox + 1) % photos.length)}
                  className="absolute right-12 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white font-mono text-sm w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                >›</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini bar chart ───────────────────────────────────────────────────────────

function BarChart({ rows, color = 'bg-amber-400' }: { rows: [string, number][]; color?: string }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="space-y-2">
      {rows.map(([label, count]) => (
        <div key={label} className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono text-zinc-500 w-20 shrink-0 truncate text-right capitalize">{label}</span>
          <div className="flex-1 min-w-0 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`${color} h-1.5 rounded-full transition-all duration-500`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-400 w-8 shrink-0 text-right">{count}</span>
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
  const [activeTab, setActiveTab] = useState<'owned' | 'wanted' | 'for_sale' | 'stats'>('owned');
  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set());
  const [expandedForSale, setExpandedForSale] = useState<Set<string>>(new Set());
  // Local copy of user to reflect shelf photo changes without a full auth refresh
  const [localUser, setLocalUser] = useState<AuthUser | null>(null);
  useEffect(() => { if (user) setLocalUser(user); }, [user]);

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

  const unlist = async (id: string) => {
    const updated = await api.collection.update(id, { status: 'owned' } as Partial<CollectionEntry>);
    updateEntry(updated);
  };

  const togglePhotos = (id: string) => {
    setExpandedPhotos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleForSale = (id: string) => {
    setExpandedForSale(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (authLoading || !user) return null;

  const owned   = entries.filter(e => e.status === 'owned');
  const wanted  = entries.filter(e => e.status === 'wanted');
  const forSale = entries.filter(e => e.status === 'for_sale');
  const filtered = activeTab === 'owned' ? owned : activeTab === 'wanted' ? wanted : activeTab === 'for_sale' ? forSale : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono text-amber-400">My Collection</h1>
          <p className="text-zinc-600 text-xs font-mono mt-1">@{user.username}</p>
        </div>
        <div className="flex gap-2">
          <CsvImport onImported={(added) => setEntries(prev => [...prev, ...added])} />
          <button
            onClick={() => exportCSV(entries, user.username)}
            disabled={entries.length === 0}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1.5"
          >
            ⬇ Export CSV
          </button>
        </div>
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

      {/* Shelf photos */}
      {localUser && <ShelfPhotos user={localUser} onUpdate={setLocalUser} />}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'owned',    label: `Owned (${owned.length})` },
          { key: 'wanted',   label: `Wishlist (${wanted.length})` },
          { key: 'for_sale', label: `For Sale (${forSale.length})` },
          { key: 'stats',    label: '📊 Stats' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
              activeTab === key
                ? key === 'for_sale'
                  ? 'bg-green-600 text-white font-bold'
                  : 'bg-amber-400 text-zinc-950 font-bold'
                : key === 'for_sale' && forSale.length > 0
                  ? 'bg-zinc-900 border border-green-900/50 text-green-500 hover:border-green-700/60'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
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
            <div className="text-4xl mb-3">{activeTab === 'for_sale' ? '🏷' : '🧮'}</div>
            <p className="text-sm">
              {activeTab === 'owned' ? "No calculators in your collection yet."
               : activeTab === 'wanted' ? "Your wishlist is empty."
               : "No items listed for sale. Hover an owned calculator and click 🏷 to list it."}
            </p>
            {activeTab !== 'for_sale' && (
              <Link href="/" className="text-amber-400 hover:text-amber-300 text-xs mt-2 inline-block transition-colors">
                Browse the catalog →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => {
              const photosOpen = expandedPhotos.has(entry.id);
              const forSaleOpen = expandedForSale.has(entry.id);
              return (
                <div key={entry.id} className={`bg-zinc-900 border rounded-xl group transition-colors ${
                  activeTab === 'for_sale' ? 'border-green-900/40 hover:border-green-800/60' : 'border-zinc-800 hover:border-zinc-700'
                }`}>
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
                        {activeTab === 'for_sale' && entry.acquired_price != null && (
                          <span className="text-[10px] text-green-500 font-mono font-bold">${entry.acquired_price}</span>
                        )}
                        {activeTab !== 'for_sale' && entry.acquired_from && (
                          <span className="text-[10px] text-zinc-600 font-mono">from {entry.acquired_from}</span>
                        )}
                        {activeTab !== 'for_sale' && entry.acquired_price != null && (
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
                        <>
                          <button
                            onClick={() => togglePhotos(entry.id)}
                            className={`text-zinc-500 hover:text-zinc-200 transition-colors font-mono text-xs px-2 py-1 rounded border ${
                              photosOpen ? 'border-zinc-600 text-zinc-300 bg-zinc-800' : 'border-zinc-700'
                            }`}
                            title="Photos"
                          >
                            📷
                          </button>
                          <button
                            onClick={() => toggleForSale(entry.id)}
                            className={`text-zinc-500 hover:text-green-400 transition-colors font-mono text-xs px-2 py-1 rounded border ${
                              forSaleOpen ? 'border-green-700/60 text-green-400 bg-green-950/30' : 'border-zinc-700'
                            }`}
                            title="List for sale"
                          >
                            🏷
                          </button>
                        </>
                      )}
                      {activeTab === 'for_sale' && (
                        <button
                          onClick={() => unlist(entry.id)}
                          className="text-zinc-500 hover:text-zinc-200 transition-colors font-mono text-xs px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
                          title="Remove listing"
                        >
                          unlist
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

                  {/* For-sale form */}
                  {forSaleOpen && activeTab === 'owned' && (
                    <ForSaleForm
                      entry={entry}
                      onSave={(updated) => {
                        updateEntry(updated);
                        setExpandedForSale(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
                        setActiveTab('for_sale');
                      }}
                      onCancel={() => toggleForSale(entry.id)}
                    />
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
