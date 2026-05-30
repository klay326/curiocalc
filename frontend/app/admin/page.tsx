'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator, type EditSuggestion, type AdminStats, type AdminUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const CALC_TYPES = ['scientific','graphing','financial','programmable','databank','printing','novelty','other'];

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'stats' | 'calcs' | 'suggestions' | 'users'>('stats');

  useEffect(() => {
    if (!authLoading && (!user || !user.is_superuser)) router.replace('/');
  }, [user, authLoading, router]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-zinc-600 font-mono text-sm animate-pulse">Loading…</div>
    </div>
  );
  if (!user?.is_superuser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-amber-400">Admin</h1>
        </div>
        <Link href="/calculators/new"
          className="bg-amber-400 text-zinc-950 px-4 py-2 rounded-lg font-mono font-bold text-sm hover:bg-amber-300 transition-colors">
          + Add Calculator
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit flex-wrap">
        {(['stats', 'calcs', 'users', 'suggestions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors capitalize ${
              tab === t ? 'bg-zinc-700 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}>{t}</button>
        ))}
      </div>

      {tab === 'stats' ? <StatsTab />
       : tab === 'calcs' ? <CalcsTab />
       : tab === 'users' ? <UsersTab />
       : <SuggestionsTab />}
    </div>
  );
}

/* ────────────────────────────────── Stats tab ── */
function StatsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-600 font-mono text-sm animate-pulse py-8">Loading stats…</div>;
  if (error)   return <div className="text-red-400 font-mono text-sm py-4">Error: {error}</div>;
  if (!stats)  return null;

  const { users, calculators, collections } = stats;
  const total = calculators.total || 1;

  return (
    <div className="space-y-8">
      {/* User Stats */}
      <section>
        <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">👥 Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',      value: users.total },
            { label: 'New Today',  value: users.new_today },
            { label: 'This Week',  value: users.new_this_week },
            { label: 'This Month', value: users.new_this_month },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-bold font-mono text-amber-400">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Recent signups */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-800">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Recent Signups</p>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {users.recent.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/30">
                <div className="flex items-center gap-2">
                  <Link href={`/u/${u.username}`} className="font-mono text-sm text-zinc-300 hover:text-amber-400 transition-colors">
                    @{u.username}
                  </Link>
                  {u.is_superuser && (
                    <span className="text-[9px] bg-amber-900/30 text-amber-400 border border-amber-900/40 px-1.5 py-0.5 rounded font-mono">admin</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-600 font-mono text-xs hidden md:block">{u.email}</span>
                  <span className="text-zinc-600 font-mono text-[10px]">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
            {users.recent.length === 0 && <p className="px-4 py-4 text-zinc-600 font-mono text-xs">No users yet</p>}
          </div>
        </div>
      </section>

      {/* Calculator Stats */}
      <section>
        <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">🧮 Calculators</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',       value: calculators.total },
            { label: 'Added/Week',  value: calculators.added_this_week },
            { label: 'Added/Month', value: calculators.added_this_month },
            { label: 'Collection Entries', value: collections.total_entries },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-bold font-mono text-amber-400">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Type breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-800">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">By Type</p>
            </div>
            <div className="p-4 space-y-2">
              {calculators.by_type.map(t => {
                const pct = Math.round((t.count / total) * 100);
                return (
                  <div key={t.type}>
                    <div className="flex justify-between text-[10px] font-mono mb-0.5">
                      <span className="text-zinc-400 capitalize">{t.type}</span>
                      <span className="text-zinc-600">{t.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full">
                      <div className="h-full bg-amber-400/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent additions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-800">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Recently Added</p>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {calculators.recent_additions.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2 hover:bg-zinc-800/30">
                  <Link href={`/calculators/${c.id}`} className="font-mono text-sm text-zinc-300 hover:text-amber-400 transition-colors">
                    {c.make} {c.model}
                  </Link>
                  <span className="text-zinc-600 font-mono text-[10px]">
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Collection Stats */}
      <section>
        <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">📦 Collections</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Top collectors */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-800">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">🏆 Top Collectors</p>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {collections.top_collectors.map((c, i) => (
                <div key={c.username} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-700 w-4 text-right">{i + 1}</span>
                    <Link href={`/u/${c.username}`} className="font-mono text-sm text-zinc-300 hover:text-amber-400 transition-colors">
                      @{c.username}
                    </Link>
                    {c.display_name && <span className="text-[10px] text-zinc-600 font-mono">{c.display_name}</span>}
                  </div>
                  <span className="text-amber-400 font-bold font-mono">{c.owned}</span>
                </div>
              ))}
              {collections.top_collectors.length === 0 && <p className="px-4 py-4 text-zinc-600 font-mono text-xs">No collections yet</p>}
            </div>
          </div>

          {/* Most collected */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-800">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">🔥 Most Collected</p>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {collections.most_collected.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-700 w-4 text-right">{i + 1}</span>
                    <Link href={`/calculators/${c.id}`} className="font-mono text-sm text-zinc-300 hover:text-amber-400 transition-colors">
                      {c.make} {c.model}
                    </Link>
                  </div>
                  <span className="text-amber-400 font-bold font-mono">{c.total}</span>
                </div>
              ))}
              {collections.most_collected.length === 0 && <p className="px-4 py-4 text-zinc-600 font-mono text-xs">No collections yet</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Email config notice */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">📧 Email Notifications</p>
        <p className="text-xs font-mono text-zinc-500">
          Notifications go to <span className="text-zinc-300">klay.adams326@gmail.com</span> on new user registrations and calculator changes.
          Set <span className="text-amber-400/70">SMTP_USER</span> + <span className="text-amber-400/70">SMTP_PASSWORD</span> in{' '}
          <span className="text-zinc-300">/opt/curiocalc/.env</span> then restart the backend to enable.
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────── Calculators tab ── */
function CalcsTab() {
  const [calcs, setCalcs] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Calculator> & { tags_str?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try { const data = await api.calculators.list({ limit: 500 }); setCalcs(data); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = calcs.filter(c =>
    !query || `${c.make} ${c.model}`.toLowerCase().includes(query.toLowerCase())
  );

  const startEdit = (calc: Calculator) => {
    setEditing(calc.id);
    setEditForm({ ...calc, tags_str: calc.tags.join(', ') });
    setError('');
  };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const { tags_str, ...rest } = editForm;
      const payload = {
        ...rest,
        tags: tags_str ? tags_str.split(',').map(t => t.trim()).filter(Boolean) : [],
        year_introduced: editForm.year_introduced ? Number(editForm.year_introduced) : undefined,
        year_discontinued: editForm.year_discontinued ? Number(editForm.year_discontinued) : undefined,
        num_keys: editForm.num_keys ? Number(editForm.num_keys) : undefined,
      };
      await api.calculators.update(editing, payload);
      await fetchAll();
      setEditing(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const deleteCalc = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.calculators.delete(id);
      setCalcs(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally { setDeleting(null); }
  };

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditForm(prev => ({ ...prev, [k]: e.target.value }));

  if (loading) return <div className="text-zinc-600 font-mono text-sm animate-pulse">Loading…</div>;

  return (
    <>
      {error && (
        <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-red-400 text-xs font-mono mb-4">{error}</div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <input type="text" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400" />
        <span className="text-xs text-zinc-600 font-mono">{filtered.length} / {calcs.length}</span>
      </div>

      <div className="space-y-2">
        {filtered.map(calc => (
          <div key={calc.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {editing === calc.id ? (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <AdminField label="Make"              value={editForm.make ?? ''}                     onChange={setField('make')} />
                  <AdminField label="Model"             value={editForm.model ?? ''}                    onChange={setField('model')} />
                  <AdminField label="Year introduced"   value={String(editForm.year_introduced ?? '')}  onChange={setField('year_introduced')}  type="number" />
                  <AdminField label="Year discontinued" value={String(editForm.year_discontinued ?? '')} onChange={setField('year_discontinued')} type="number" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="label">Type</label>
                    <select value={editForm.calc_type ?? ''} onChange={setField('calc_type')} className="select">
                      {CALC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <AdminField label="Display type"  value={editForm.display_type ?? ''}       onChange={setField('display_type')} />
                  <AdminField label="Power source"  value={editForm.power_source ?? ''}       onChange={setField('power_source')} />
                  <AdminField label="Num keys"      value={String(editForm.num_keys ?? '')}   onChange={setField('num_keys')} type="number" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <AdminField label="Country"        value={editForm.country_of_origin ?? ''} onChange={setField('country_of_origin')} />
                  <AdminField label="Rarity (1-10)"  value={String(editForm.rarity_score ?? '')}    onChange={setField('rarity_score')}    type="number" />
                  <AdminField label="Weirdness (1-10)" value={String(editForm.weirdness_score ?? '')} onChange={setField('weirdness_score')} type="number" />
                </div>
                <div>
                  <label className="label">Tags (comma-separated)</label>
                  <input value={editForm.tags_str ?? ''} onChange={setField('tags_str')} className="input" />
                </div>
                <div>
                  <label className="label">Images (URLs, comma-separated)</label>
                  <input value={(editForm.images ?? []).join(', ')}
                    onChange={e => setEditForm(prev => ({ ...prev, images: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))}
                    className="input" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea value={editForm.description ?? ''} onChange={setField('description')} rows={3} className="input resize-none" />
                </div>
                <div>
                  <label className="label">Fun facts</label>
                  <textarea value={editForm.fun_facts ?? ''} onChange={setField('fun_facts')} rows={2} className="input resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} disabled={saving}
                    className="bg-amber-400 text-zinc-950 px-4 py-2 rounded-lg font-mono font-bold text-xs hover:bg-amber-300 transition-colors disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={cancelEdit}
                    className="border border-zinc-700 text-zinc-400 px-4 py-2 rounded-lg font-mono text-xs hover:border-zinc-500 hover:text-zinc-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 px-4 py-3">
                {calc.images[0] ? (
                  <img src={calc.images[0]} alt="" className="w-12 h-9 object-contain rounded flex-shrink-0 bg-zinc-800" />
                ) : (
                  <div className="w-12 h-9 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center text-xl">🧮</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm text-zinc-100">{calc.make} {calc.model}</span>
                    {calc.year_introduced && <span className="text-[10px] text-zinc-600 font-mono">{calc.year_introduced}</span>}
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{calc.calc_type}</span>
                    {calc.is_verified && <span className="text-[10px] text-amber-400 font-mono">✓</span>}
                  </div>
                  {calc.description && (
                    <p className="text-[11px] text-zinc-600 font-mono truncate mt-0.5">{calc.description.slice(0, 100)}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/calculators/${calc.id}`}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono px-2 py-1 rounded border border-zinc-800 hover:border-zinc-600 transition-colors">
                    view
                  </Link>
                  <button onClick={() => startEdit(calc)}
                    className="text-[11px] text-zinc-400 hover:text-amber-400 font-mono px-2 py-1 rounded border border-zinc-800 hover:border-amber-400/40 transition-colors">
                    edit
                  </button>
                  <button onClick={() => deleteCalc(calc.id, `${calc.make} ${calc.model}`)} disabled={deleting === calc.id}
                    className="text-[11px] text-zinc-600 hover:text-red-400 font-mono px-2 py-1 rounded border border-zinc-800 hover:border-red-900/50 transition-colors disabled:opacity-50">
                    {deleting === calc.id ? '…' : 'del'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ────────────────────────────────── Suggestions tab ── */
function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setSuggestions(await api.suggestions.list(filter || undefined)); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, status: 'approved' | 'rejected') => {
    setReviewing(id);
    try {
      const updated = await api.suggestions.review(id, { status, reviewer_note: note || undefined });
      setSuggestions(prev => prev.map(s => s.id === id ? updated : s));
      setNote('');
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setReviewing(null); }
  };

  const pending = suggestions.filter(s => s.status === 'pending');

  return (
    <>
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected', ''] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-mono border transition-colors ${
              filter === f
                ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold'
                : 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
            }`}>
            {f || 'all'}
            {f === 'pending' && pending.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-zinc-600 font-mono text-sm animate-pulse">Loading…</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 font-mono text-sm">
          <div className="text-4xl mb-3">✅</div>
          No suggestions in this queue.
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map(s => (
            <div key={s.id} className={`bg-zinc-900 border rounded-xl p-5 ${
              s.status === 'pending' ? 'border-amber-900/40' :
              s.status === 'approved' ? 'border-green-900/40' : 'border-zinc-800'
            }`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <Link href={`/calculators/${s.calculator_id}`}
                    className="font-bold font-mono text-zinc-100 hover:text-amber-400 transition-colors">
                    {s.calculator_make} {s.calculator_model}
                  </Link>
                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                    by @{s.submitted_by_username ?? 'unknown'} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded font-mono font-bold flex-shrink-0 ${
                  s.status === 'pending'  ? 'bg-amber-900/30 text-amber-400' :
                  s.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                                            'bg-zinc-800 text-zinc-500'
                }`}>{s.status}</span>
              </div>

              {/* Proposed changes */}
              <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 space-y-2">
                {Object.entries(s.proposed_changes).map(([key, val]) => (
                  <div key={key} className="flex gap-3 text-xs font-mono">
                    <span className="text-zinc-500 w-36 flex-shrink-0">{key.replace(/_/g,' ')}</span>
                    <span className="text-zinc-200 break-all">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                  </div>
                ))}
              </div>

              {s.reason && (
                <p className="text-xs text-zinc-500 font-mono italic mb-3">"{s.reason}"</p>
              )}
              {s.reviewer_note && (
                <p className="text-xs text-zinc-500 font-mono mb-3">
                  <span className="text-zinc-600">reviewer note:</span> {s.reviewer_note}
                </p>
              )}

              {s.status === 'pending' && (
                <div className="flex gap-2 items-center flex-wrap">
                  <input value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Optional reviewer note…"
                    className="flex-1 min-w-[180px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-amber-400" />
                  <button onClick={() => review(s.id, 'approved')} disabled={reviewing === s.id}
                    className="px-3 py-1.5 bg-green-900/40 text-green-400 border border-green-900/50 rounded-lg font-mono text-xs font-bold hover:bg-green-900/60 transition-colors disabled:opacity-50">
                    {reviewing === s.id ? '…' : '✓ approve'}
                  </button>
                  <button onClick={() => review(s.id, 'rejected')} disabled={reviewing === s.id}
                    className="px-3 py-1.5 bg-red-900/20 text-red-400 border border-red-900/30 rounded-lg font-mono text-xs hover:bg-red-900/30 transition-colors disabled:opacity-50">
                    ✕ reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────── Users tab ── */
function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try { setUsers(await api.admin.users(q || undefined)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setQuery(inputVal); load(inputVal); }, 400);
    return () => clearTimeout(t);
  }, [inputVal, load]);

  const toggle = async (user: AdminUser, field: 'is_superuser' | 'is_curator' | 'is_active') => {
    setUpdating(user.id);
    try {
      const updated = await api.admin.updateUser(user.id, { [field]: !user[field] });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setUpdating(null);
    }
  };

  const ROLE_BADGE = {
    admin:   'bg-amber-900/40 text-amber-400 border-amber-800/60',
    curator: 'bg-blue-900/40 text-blue-400 border-blue-800/60',
    user:    'bg-zinc-800 text-zinc-500 border-zinc-700',
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <input
          type="text" placeholder="Search username, email, display name…"
          value={inputVal} onChange={e => setInputVal(e.target.value)}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400"
        />
        <span className="text-xs text-zinc-600 font-mono flex-shrink-0">{users.length} user{users.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 px-4 py-2 bg-zinc-800/40 border-b border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">User</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center w-20">Admin</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center w-20">Curator</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center w-20">Active</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-right w-24">Joined</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-zinc-600 font-mono text-sm animate-pulse">Loading…</div>
        ) : users.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-600 font-mono text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {users.map(u => {
              const isMe = u.id === me?.id;
              const role = u.is_superuser ? 'admin' : u.is_curator ? 'curator' : 'user';
              const busy = updating === u.id;
              return (
                <div key={u.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 px-4 py-3 items-center hover:bg-zinc-800/30 transition-colors ${busy ? 'opacity-60' : ''}`}>
                  {/* User info */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-zinc-400 font-mono">
                        {(u.display_name ?? u.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/u/${u.username}`}
                          className="font-mono text-sm text-zinc-200 hover:text-amber-400 transition-colors truncate">
                          @{u.username}
                        </Link>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0 ${ROLE_BADGE[role]}`}>
                          {role}
                        </span>
                        {isMe && <span className="text-[9px] text-zinc-600 font-mono flex-shrink-0">you</span>}
                      </div>
                      <p className="text-[10px] text-zinc-600 font-mono truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Admin toggle */}
                  <div className="w-20 flex justify-center">
                    <button
                      onClick={() => !isMe && toggle(u, 'is_superuser')}
                      disabled={busy || isMe}
                      title={isMe ? "Can't remove your own admin" : u.is_superuser ? 'Remove admin' : 'Make admin'}
                      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                        u.is_superuser ? 'bg-amber-400' : 'bg-zinc-700'
                      } disabled:cursor-not-allowed`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${u.is_superuser ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Curator toggle */}
                  <div className="w-20 flex justify-center">
                    <button
                      onClick={() => toggle(u, 'is_curator')}
                      disabled={busy || u.is_superuser}
                      title={u.is_superuser ? 'Admins already have curator access' : u.is_curator ? 'Remove curator' : 'Make curator'}
                      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                        u.is_curator || u.is_superuser ? 'bg-blue-500' : 'bg-zinc-700'
                      } disabled:cursor-not-allowed`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${u.is_curator || u.is_superuser ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Active toggle */}
                  <div className="w-20 flex justify-center">
                    <button
                      onClick={() => !isMe && toggle(u, 'is_active')}
                      disabled={busy || isMe}
                      title={isMe ? "Can't deactivate yourself" : u.is_active ? 'Deactivate' : 'Activate'}
                      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                        u.is_active ? 'bg-green-600' : 'bg-zinc-700'
                      } disabled:cursor-not-allowed`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${u.is_active ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Joined date */}
                  <div className="w-24 text-right">
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-1">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Role reference</p>
        <p className="text-xs font-mono text-zinc-500"><span className="text-amber-400">Admin</span> — full access: manage users, delete calculators, admin panel</p>
        <p className="text-xs font-mono text-zinc-500"><span className="text-blue-400">Curator</span> — can add and edit calculators, upload images; no admin panel access</p>
        <p className="text-xs font-mono text-zinc-500"><span className="text-zinc-400">User</span> — standard: browse, collect, leave reviews, suggest edits</p>
      </div>
    </>
  );
}

function AdminField({ label, value, onChange, type = 'text' }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={onChange} className="input" />
    </div>
  );
}
