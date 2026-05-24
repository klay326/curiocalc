'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator, type EditSuggestion } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CalculatorCard } from '@/components/calculator-card';

export default function CalculatorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [calc, setCalc] = useState<Calculator | null>(null);
  const [related, setRelated] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [addStatus, setAddStatus] = useState<'owned' | 'wanted' | null>(null);
  const [adding, setAdding] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    Promise.all([
      api.calculators.get(id),
      api.calculators.related(id).catch(() => []),
    ])
      .then(([c, r]) => { setCalc(c); setRelated(r); })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const addToCollection = async (status: 'owned' | 'wanted') => {
    if (!user) { router.push('/login'); return; }
    setAdding(true);
    try {
      await api.collection.add({ calculator_id: id, status });
      setAddStatus(status);
    } catch (e) { console.error(e); }
    finally { setAdding(false); }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-4">
      <div className="h-6 bg-zinc-800 rounded w-1/4" />
      <div className="h-8 bg-zinc-800 rounded w-1/2" />
      <div className="grid md:grid-cols-2 gap-8 mt-6">
        <div className="aspect-square bg-zinc-800 rounded-xl" />
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-zinc-800 rounded-lg" />)}</div>
      </div>
    </div>
  );

  if (!calc) return null;

  const yearRange = calc.year_introduced
    ? calc.year_discontinued ? `${calc.year_introduced}–${calc.year_discontinued}` : `${calc.year_introduced}–present`
    : null;

  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(calc.make + '_' + calc.model)}`;

  const stats = [
    { label: 'Type',    value: calc.calc_type },
    { label: 'Display', value: calc.display_type || '—' },
    { label: 'Power',   value: calc.power_source || '—' },
    { label: 'Keys',    value: calc.num_keys != null ? String(calc.num_keys) : '—' },
    { label: 'Country', value: calc.country_of_origin || '—' },
    { label: 'Owners',  value: `${calc.owner_count} own · ${calc.want_count} want` },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-xs text-zinc-500 font-mono hover:text-zinc-300 transition-colors mb-6 inline-block">
        ← back to catalog
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div>
          <div className="aspect-square bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden mb-2">
            {calc.images[activeImg] ? (
              <img
                src={calc.images[activeImg]}
                alt={`${calc.make} ${calc.model}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-8xl opacity-10 select-none">🧮</span>
            )}
          </div>
          {calc.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {calc.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-amber-400' : 'border-zinc-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`view ${i+1}`} className="w-full h-full object-contain bg-zinc-900" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-zinc-500 font-mono text-xs">{calc.make}</p>
            {calc.is_verified && (
              <span className="text-[10px] bg-amber-900/30 text-amber-400 border border-amber-900/50 px-1.5 py-0.5 rounded font-mono">✓ verified</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-amber-400 font-mono mb-1 leading-tight">{calc.model}</h1>
          {yearRange && <p className="text-zinc-500 font-mono text-sm mb-5">{yearRange}</p>}

          {/* Add to collection */}
          <div className="flex gap-2 mb-5">
            {addStatus ? (
              <div className="px-4 py-2.5 bg-amber-400/10 text-amber-400 rounded-lg font-mono text-sm border border-amber-400/20">
                ✓ Added to {addStatus === 'owned' ? 'collection' : 'wishlist'}
              </div>
            ) : (
              <>
                <button onClick={() => addToCollection('owned')} disabled={adding}
                  className="px-4 py-2.5 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
                  I own this
                </button>
                <button onClick={() => addToCollection('wanted')} disabled={adding}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-100 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50 border border-zinc-700">
                  I want this
                </button>
              </>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{label}</p>
                <p className="text-sm font-mono text-zinc-200 mt-0.5 capitalize">{value}</p>
              </div>
            ))}
          </div>

          {/* Score bars */}
          {(calc.rarity_score != null || calc.weirdness_score != null) && (
            <div className="space-y-3 mb-4">
              {calc.rarity_score != null && (
                <ScoreBar label="Rarity" value={calc.rarity_score} color="amber" />
              )}
              {calc.weirdness_score != null && (
                <ScoreBar label="Weirdness" value={calc.weirdness_score} color="pink" />
              )}
            </div>
          )}

          {/* Tags */}
          {calc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {calc.tags.map(tag => (
                <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}
                  className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded font-mono border border-zinc-700 hover:border-amber-400/50 hover:text-zinc-300 transition-colors">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Action links */}
          <div className="flex flex-wrap gap-2">
            <a href={wikiUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors">
              Wikipedia ↗
            </a>
            {Object.entries(calc.external_refs).map(([key, url]) =>
              url ? (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors">
                  {key.replace(/_/g, ' ')} ↗
                </a>
              ) : null
            )}
            {user && (
              <button onClick={() => setShowSuggest(true)}
                className="text-xs font-mono text-amber-500/70 hover:text-amber-400 border border-amber-900/30 hover:border-amber-900/60 px-3 py-1.5 rounded-lg transition-colors">
                ✏ suggest edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {calc.description && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-[10px] font-mono text-zinc-600 mb-3 uppercase tracking-widest">About</h2>
          <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-line">{calc.description}</p>
        </div>
      )}

      {/* Fun facts */}
      {calc.fun_facts && (
        <div className="mt-3 bg-pink-950/20 border border-pink-900/30 rounded-xl p-6">
          <h2 className="text-[10px] font-mono text-pink-500 mb-3 uppercase tracking-widest">🌀 Fun Facts</h2>
          <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-line">{calc.fun_facts}</p>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[10px] font-mono text-zinc-600 mb-4 uppercase tracking-widest">Related calculators</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {related.map(r => <CalculatorCard key={r.id} calc={r} compact />)}
          </div>
        </div>
      )}

      {/* Suggest Edit Modal */}
      {showSuggest && calc && (
        <SuggestEditModal calc={calc} onClose={() => setShowSuggest(false)} />
      )}
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: 'amber' | 'pink' }) {
  const pct = Math.min(100, (value / 10) * 100);
  const colorMap = {
    amber: { bar: 'bg-amber-400', text: 'text-amber-400', track: 'bg-amber-900/20' },
    pink:  { bar: 'bg-pink-400',  text: 'text-pink-400',  track: 'bg-pink-900/20' },
  };
  const c = colorMap[color];
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-bold font-mono ${c.text}`}>{value.toFixed(1)}/10</span>
      </div>
      <div className={`h-1.5 rounded-full ${c.track}`}>
        <div className={`h-full rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SuggestEditModal({ calc, onClose }: { calc: Calculator; onClose: () => void }) {
  const [field, setField] = useState('description');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const EDITABLE_FIELDS = [
    'description', 'fun_facts', 'year_introduced', 'year_discontinued',
    'display_type', 'power_source', 'num_keys', 'country_of_origin',
    'tags', 'rarity_score', 'weirdness_score',
  ];

  const currentValue = (calc as Record<string, unknown>)[field];
  const placeholder = Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue ?? '');

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      let parsed: unknown = value;
      if (field === 'tags') parsed = value.split(',').map(s => s.trim()).filter(Boolean);
      else if (['year_introduced','year_discontinued','num_keys'].includes(field)) parsed = parseInt(value) || null;
      else if (['rarity_score','weirdness_score'].includes(field)) parsed = parseFloat(value) || null;

      await api.suggestions.submit(calc.id, {
        proposed_changes: { [field]: parsed },
        reason: reason || undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono font-bold text-zinc-100">Suggest an edit</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors text-xl leading-none">✕</button>
        </div>
        <p className="text-zinc-600 font-mono text-xs mb-4">
          {calc.make} {calc.model} — your suggestion will be reviewed by a moderator
        </p>

        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-zinc-200 font-mono text-sm">Thanks! Your suggestion has been submitted.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
              close
            </button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-400 font-mono text-xs mb-3 bg-red-900/20 border border-red-900/30 px-3 py-2 rounded-lg">{error}</p>}

            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">Field to change</label>
            <select value={field} onChange={e => { setField(e.target.value); setValue(''); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 font-mono text-sm mb-4 focus:outline-none focus:border-amber-400">
              {EDITABLE_FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g,' ')}</option>)}
            </select>

            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
              Current value: <span className="text-zinc-400">{placeholder || '(empty)'}</span>
            </label>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={`New value for ${field.replace(/_/g,' ')}…`}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 font-mono text-sm mb-3 focus:outline-none focus:border-amber-400 resize-none"
            />

            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">Reason (optional)</label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why should this be changed?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 font-mono text-sm mb-4 focus:outline-none focus:border-amber-400"
            />

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-zinc-800 rounded-lg font-mono text-sm text-zinc-400 hover:bg-zinc-700 transition-colors">
                cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting || !value.trim()}
                className="px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
                {submitting ? 'submitting…' : 'submit suggestion'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
