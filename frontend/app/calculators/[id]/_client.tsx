'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator, type CollectionEntry, type EditSuggestion, type Comment, type AuthUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CalculatorCard } from '@/components/calculator-card';

const CALC_TYPES = ['scientific','graphing','financial','programmable','databank','printing','novelty','other'];
const DISPLAY_TYPES = ['LCD','LED','VFD','color LCD','nixie tube','CRT','e-paper','thermal paper','mechanical','relay'];

export default function CalculatorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [calc, setCalc] = useState<Calculator | null>(null);
  const [related, setRelated] = useState<Calculator[]>([]);
  const [variants, setVariants] = useState<Calculator[]>([]);
  const [parentCalc, setParentCalc] = useState<Calculator | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [myEntries, setMyEntries] = useState<CollectionEntry[]>([]);
  const [removingEntryId, setRemovingEntryId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingImg, setRemovingImg] = useState(false);
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'owned' | 'wanted'>('owned');
  const [showAddVariant, setShowAddVariant] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    setVariants([]);
    setParentCalc(null);
    api.calculators.get(id)
      .then(async (c) => {
        setCalc(c);
        // Load related, variants, and parent in parallel
        const [r, v, p] = await Promise.all([
          api.calculators.related(id).catch(() => []),
          api.calculators.variants(id).catch(() => []),
          c.parent_id ? api.calculators.get(c.parent_id).catch(() => null) : Promise.resolve(null),
        ]);
        setRelated(r);
        setVariants(v);
        setParentCalc(p);
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Load the user's collection entries for this calc family (parent + all variants)
  useEffect(() => {
    if (!user) { setMyEntries([]); return; }
    api.collection.mine()
      .then(entries => {
        const familyIds = new Set([id, ...variants.map(v => v.id)]);
        setMyEntries(entries.filter(e => familyIds.has(e.calculator_id)));
      })
      .catch(() => {});
  }, [id, user, variants]);


  const removeImageDirect = async (index: number) => {
    if (!calc) return;
    setRemovingImg(true);
    try {
      const newImages = calc.images.filter((_, i) => i !== index);
      const updated = await api.calculators.update(calc.id, { images: newImages } as Partial<Calculator>);
      setCalc(updated);
      setActiveImg(prev => Math.min(prev, Math.max(0, updated.images.length - 1)));
    } catch (e) { console.error(e); }
    finally { setRemovingImg(false); }
  };

  const openCollectionModal = (status: 'owned' | 'wanted') => {
    if (!user) { router.push('/login'); return; }
    setPendingStatus(status);
    setShowCollectionModal(true);
  };

  const removeEntry = async (entryId: string) => {
    setRemovingEntryId(entryId);
    try {
      await api.collection.remove(entryId);
      setMyEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (e) { console.error(e); }
    finally { setRemovingEntryId(null); }
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
          {/* Main image */}
          <div className="relative aspect-square bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden mb-2">
            {calc.images[activeImg] ? (
              <img
                src={calc.images[activeImg]}
                alt={`${calc.make} ${calc.model}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-8xl opacity-10 select-none">🧮</span>
            )}
            {/* Admin: remove button with inline confirmation */}
            {user?.is_superuser && calc.images[activeImg] && (
              confirmRemoveIdx === activeImg ? (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/85 border border-red-800/60 rounded-lg px-2.5 py-1.5">
                  <span className="text-red-400 font-mono text-xs">Remove?</span>
                  <button
                    onClick={() => setConfirmRemoveIdx(null)}
                    className="text-zinc-400 hover:text-zinc-100 font-mono text-xs px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
                  >cancel</button>
                  <button
                    onClick={() => { setConfirmRemoveIdx(null); removeImageDirect(activeImg); }}
                    disabled={removingImg}
                    className="text-white font-mono text-xs px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-40"
                  >{removingImg ? '…' : 'yes, remove'}</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRemoveIdx(activeImg)}
                  title="Remove this image"
                  className="absolute top-2 right-2 bg-black/70 hover:bg-red-900/80 border border-red-800/60 text-red-400 rounded-lg px-2.5 py-1.5 font-mono text-xs flex items-center gap-1.5 transition-colors"
                >
                  🗑 remove image
                </button>
              )
            )}
          </div>

          {/* Thumbnails */}
          {calc.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {calc.images.map((img, i) => (
                <div key={i} className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activeImg ? 'border-amber-400' : 'border-zinc-800 opacity-60 hover:opacity-100'
                }`}>
                  <button onClick={() => setActiveImg(i)} className="w-full h-full">
                    <img src={img} alt={`view ${i+1}`} className="w-full h-full object-contain bg-zinc-900" />
                  </button>
                  {/* Admin: trashcan on thumbnails with inline confirm */}
                  {user?.is_superuser && (
                    confirmRemoveIdx === i ? (
                      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-1 p-1">
                        <span className="text-red-400 font-mono text-[9px]">Remove?</span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmRemoveIdx(null); }}
                            className="text-zinc-300 font-mono text-[9px] px-1.5 py-0.5 bg-zinc-700 rounded"
                          >no</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmRemoveIdx(null); removeImageDirect(i); }}
                            className="text-white font-mono text-[9px] px-1.5 py-0.5 bg-red-600 rounded"
                          >yes</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmRemoveIdx(i); }}
                        title="Remove"
                        className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-red-900/80 text-red-400 rounded text-[11px] w-5 h-5 flex items-center justify-center transition-colors"
                      >
                        🗑
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-zinc-500 font-mono text-xs">{calc.make}</p>
            <div className="flex items-center gap-2">
              {calc.is_verified && (
                <span className="text-[10px] bg-amber-900/30 text-amber-400 border border-amber-900/50 px-1.5 py-0.5 rounded font-mono">✓ verified</span>
              )}
              {calc.parent_id && (
                <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-mono">variant</span>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-amber-400 font-mono mb-1 leading-tight">{calc.model}</h1>
          {calc.variant_label && (
            <p className="text-sm font-mono text-zinc-400 mb-1 italic">{calc.variant_label}</p>
          )}
          {/* Parent calc link */}
          {parentCalc && (
            <div className="mb-3">
              <Link href={`/calculators/${parentCalc.id}`}
                className="text-xs font-mono text-zinc-500 hover:text-amber-400 transition-colors">
                ↑ Variant of {parentCalc.make} {parentCalc.model}
              </Link>
            </div>
          )}
          {yearRange && <p className="text-zinc-500 font-mono text-sm mb-5">{yearRange}</p>}

          {/* Add to collection */}
          <div className="mb-5">
            {/* Existing entries for this calc family */}
            {myEntries.length > 0 && (
              <div className="space-y-2 mb-3">
                {myEntries.map(entry => {
                  const entryCalc = entry.calculator_id === calc.id
                    ? calc
                    : variants.find(v => v.id === entry.calculator_id);
                  return (
                    <div key={entry.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm border ${
                      entry.status === 'owned'
                        ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      <span>{entry.status === 'owned' ? '🧮' : '⭐'}</span>
                      <span className="flex-1">
                        {entry.status === 'owned' ? 'In collection' : 'On wishlist'}
                        {entryCalc?.variant_label && (
                          <span className="text-xs ml-1.5 opacity-60">· {entryCalc.variant_label}</span>
                        )}
                      </span>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        disabled={removingEntryId === entry.id}
                        className="text-zinc-600 hover:text-red-400 transition-colors px-1 leading-none"
                        title="Remove">
                        {removingEntryId === entry.id ? '…' : '✕'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add buttons */}
            <div className="flex gap-2">
              <button onClick={() => openCollectionModal('owned')} disabled={adding}
                className="px-4 py-2.5 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
                {myEntries.some(e => e.status === 'owned')
                  ? (variants.length > 0 ? '+ Add variant' : '+ Add another')
                  : 'I own this'}
              </button>
              {!myEntries.some(e => e.status === 'wanted') && (
                <button onClick={() => openCollectionModal('wanted')} disabled={adding}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-100 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50 border border-zinc-700">
                  I want this
                </button>
              )}
            </div>
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
            {calc.manual_url && (
              <a href={calc.manual_url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors">
                📄 Manual ↗
              </a>
            )}
            {calc.external_refs.map(ref =>
              ref.url ? (
                <a key={ref.label} href={ref.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors">
                  {ref.label} ↗
                </a>
              ) : null
            )}
            {user?.is_superuser ? (
              <>
                <button
                  onClick={() => {
                    setShowAdminEdit(true);
                    setTimeout(() => document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                  }}
                  className="text-xs font-mono text-amber-400 hover:text-amber-300 border border-amber-700/50 hover:border-amber-500 bg-amber-900/20 px-3 py-1.5 rounded-lg transition-colors">
                  ⚙ Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs font-mono text-red-400/70 hover:text-red-400 border border-red-900/40 hover:border-red-700/60 bg-red-950/20 px-3 py-1.5 rounded-lg transition-colors">
                  🗑 Delete
                </button>
              </>
            ) : user ? (
              <button onClick={() => setShowSuggest(true)}
                className="text-xs font-mono text-amber-500/70 hover:text-amber-400 border border-amber-900/30 hover:border-amber-900/60 px-3 py-1.5 rounded-lg transition-colors">
                ✏ suggest edit
              </button>
            ) : null}
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

      {/* Variants */}
      {(variants.length > 0 || user?.is_superuser) && !calc.parent_id && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              Variants &amp; colorways
              {variants.length > 0 && <span className="ml-2 text-zinc-700 normal-case">({variants.length})</span>}
            </h2>
            {user?.is_superuser && (
              <button
                onClick={() => setShowAddVariant(v => !v)}
                className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                  showAddVariant
                    ? 'border-amber-500/60 text-amber-400 bg-amber-900/20'
                    : 'border-zinc-700 text-zinc-500 hover:border-amber-500/40 hover:text-amber-400'
                }`}
              >
                {showAddVariant ? '✕ cancel' : '+ Add variant'}
              </button>
            )}
          </div>

          {showAddVariant && calc && (
            <AddVariantForm
              parent={calc}
              onAdded={(v) => {
                setVariants(prev => [...prev, v]);
                setShowAddVariant(false);
              }}
              onCancel={() => setShowAddVariant(false)}
            />
          )}

          {variants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {variants.map(v => (
                <div key={v.id} className="group/vcard relative">
                  <Link href={`/calculators/${v.id}`}
                    className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-600 transition-colors group">
                    <div className="w-12 h-12 flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                      {v.images[0] ? (
                        <img src={v.images[0]} alt={v.model} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl opacity-20">🧮</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono text-zinc-200 group-hover:text-amber-400 transition-colors truncate">{v.variant_label ?? v.model}</p>
                      {v.year_introduced && (
                        <p className="text-[10px] font-mono text-zinc-600">{v.year_introduced}</p>
                      )}
                    </div>
                  </Link>
                  {user?.is_superuser && (
                    <Link
                      href={`/calculators/${v.id}`}
                      className="absolute top-2 right-2 opacity-0 group-hover/vcard:opacity-100 transition-opacity text-[10px] font-mono text-amber-500 hover:text-amber-300 bg-zinc-900 border border-amber-900/50 px-1.5 py-0.5 rounded"
                    >
                      edit ↗
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {variants.length === 0 && !showAddVariant && user?.is_superuser && (
            <p className="text-zinc-700 font-mono text-xs italic">No variants yet — click "+ Add variant" above to create one.</p>
          )}
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

      {/* Comments */}
      <CommentsSection calcId={calc.id} currentUser={user} />

      {/* Collection Modal */}
      {showCollectionModal && calc && (
        <CollectionModal
          calcId={calc.id}
          calcName={`${calc.make} ${calc.model}`}
          variants={variants}
          status={pendingStatus}
          onClose={() => setShowCollectionModal(false)}
          onSuccess={(entry) => {
            setMyEntries(prev => [...prev.filter(e => e.id !== entry.id), entry]);
            setShowCollectionModal(false);
          }}
        />
      )}

      {/* Suggest Edit Modal */}
      {showSuggest && calc && (
        <SuggestEditModal calc={calc} onClose={() => setShowSuggest(false)} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && calc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-zinc-900 border border-red-900/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🗑</div>
              <h3 className="font-mono font-bold text-zinc-100 text-lg">Delete this calculator?</h3>
              <p className="text-zinc-500 font-mono text-xs mt-2">
                <span className="text-zinc-300">{calc.make} {calc.model}</span> will be permanently removed.<br />
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors border border-zinc-700">
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await api.calculators.delete(calc.id);
                    router.push('/');
                  } catch {
                    setDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-mono text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin inline edit panel */}
      {user?.is_superuser && (
        <div id="admin-panel" className="mt-8 border border-amber-900/40 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowAdminEdit(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-amber-900/10 hover:bg-amber-900/20 transition-colors"
          >
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-widest">⚙ Admin controls</span>
            <span className="text-zinc-500 text-xs font-mono">{showAdminEdit ? '▲ collapse' : '▼ expand'}</span>
          </button>
          {showAdminEdit && (
            <AdminEditPanel
              calc={calc}
              variants={variants}
              onSaved={updated => { setCalc(updated); setShowAdminEdit(false); }}
              onDeleted={() => router.push('/')}
              onVariantAdded={v => setVariants(prev => [...prev, v])}
              onVariantDeleted={id => setVariants(prev => prev.filter(v => v.id !== id))}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Variant Form ────────────────────────────────────────────────────────

function AddVariantForm({
  parent,
  onAdded,
  onCancel,
}: {
  parent: Calculator;
  onAdded: (v: Calculator) => void;
  onCancel: () => void;
}) {
  const [label, setLabel]       = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [yearIn, setYearIn]     = useState(String(parent.year_introduced ?? ''));
  const [yearOut, setYearOut]   = useState(String(parent.year_discontinued ?? ''));
  const [country, setCountry]   = useState(parent.country_of_origin ?? '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleCreate = async () => {
    if (!label.trim()) { setError('Variant label is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const images = imageUrls
        .split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
      const payload: Record<string, unknown> = {
        make:              parent.make,
        model:             parent.model,
        calc_type:         parent.calc_type,
        display_type:      parent.display_type,
        power_source:      parent.power_source,
        num_keys:          parent.num_keys,
        country_of_origin: country.trim() || parent.country_of_origin,
        year_introduced:   yearIn  ? parseInt(yearIn)  : parent.year_introduced,
        year_discontinued: yearOut ? parseInt(yearOut) : parent.year_discontinued,
        tags:              parent.tags,
        parent_id:         parent.id,
        variant_label:     label.trim(),
        images:            images.length ? images : (parent.images.length ? [parent.images[0]] : []),
        rarity_score:      parent.rarity_score,
        weirdness_score:   parent.weirdness_score,
      };
      const created = await api.calculators.create(payload as Partial<Calculator>);
      onAdded(created);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create variant');
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-amber-900/40 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">New variant of {parent.make} {parent.model}</p>
      {error && <p className="text-red-400 font-mono text-xs">{error}</p>}

      <div>
        <label className="text-[10px] font-mono text-zinc-500 block mb-1">Variant label <span className="text-red-500">*</span></label>
        <input
          value={label} onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Red, Silver edition, UK version, Rev. 2…"
          autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono text-zinc-500 block mb-1">Year introduced</label>
          <input value={yearIn} onChange={e => setYearIn(e.target.value)} placeholder={String(parent.year_introduced ?? '—')}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-mono text-zinc-500 block mb-1">Year discontinued</label>
          <input value={yearOut} onChange={e => setYearOut(e.target.value)} placeholder={String(parent.year_discontinued ?? '—')}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors" />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-mono text-zinc-500 block mb-1">Country of origin</label>
        <input value={country} onChange={e => setCountry(e.target.value)} placeholder={parent.country_of_origin ?? '—'}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors" />
      </div>

      <div>
        <label className="text-[10px] font-mono text-zinc-500 block mb-1">
          Image URLs <span className="text-zinc-700 normal-case">(one per line — leave blank to inherit parent image)</span>
        </label>
        <textarea
          value={imageUrls} onChange={e => setImageUrls(e.target.value)}
          placeholder="https://…"
          rows={2}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg font-mono text-sm hover:bg-zinc-700 border border-zinc-700 transition-colors">
          Cancel
        </button>
        <button onClick={handleCreate} disabled={saving || !label.trim()}
          className="px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
          {saving ? 'Creating…' : '✓ Create variant'}
        </button>
      </div>
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

// ─── Admin Edit Panel ────────────────────────────────────────────────────────

// These MUST be module-level — if defined inside AdminEditPanel they get
// recreated on every render, which unmounts the input and kills focus.
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">{children}</label>;
}
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors" />
  );
}

function AdminEditPanel({
  calc,
  variants,
  onSaved,
  onDeleted,
  onVariantAdded,
  onVariantDeleted,
}: {
  calc: Calculator;
  variants: Calculator[];
  onSaved: (updated: Calculator) => void;
  onDeleted: () => void;
  onVariantAdded: (v: Calculator) => void;
  onVariantDeleted: (id: string) => void;
}) {
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [showVariantAdder, setShowVariantAdder] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [localVariants, setLocalVariants] = useState<Calculator[]>(variants);

  // Editable fields mirroring the Calculator model
  const [make, setMake]                   = useState(calc.make);
  const [model, setModel]                 = useState(calc.model);
  const [variantLabel, setVariantLabel]   = useState(calc.variant_label ?? '');
  const [calcType, setCalcType]           = useState(calc.calc_type);
  const [yearIn, setYearIn]               = useState(String(calc.year_introduced ?? ''));
  const [yearOut, setYearOut]             = useState(String(calc.year_discontinued ?? ''));
  const [displayType, setDisplayType]     = useState(calc.display_type ?? '');
  const [power, setPower]                 = useState(calc.power_source ?? '');
  const [numKeys, setNumKeys]             = useState(String(calc.num_keys ?? ''));
  const [country, setCountry]             = useState(calc.country_of_origin ?? '');
  const [description, setDescription]    = useState(calc.description ?? '');
  const [funFacts, setFunFacts]           = useState(calc.fun_facts ?? '');
  const [manualUrl, setManualUrl]         = useState(calc.manual_url ?? '');
  const [rarity, setRarity]               = useState(String(calc.rarity_score ?? ''));
  const [weirdness, setWeirdness]         = useState(String(calc.weirdness_score ?? ''));
  const [tagsRaw, setTagsRaw]             = useState(calc.tags.join(', '));
  const [isVerified, setIsVerified]       = useState(calc.is_verified ?? false);

  // Images — editable list + file upload
  const [images, setImages]       = useState<string[]>(calc.images);
  const [newImgUrl, setNewImgUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const addImage = () => {
    const u = newImgUrl.trim();
    if (u && !images.includes(u)) { setImages([...images, u]); }
    setNewImgUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await api.calculators.uploadImage(calc.id, file);
      setImages(updated.images);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const removeImage = (i: number) => setImages(images.filter((_, idx) => idx !== i));
  const moveImage   = (i: number, dir: -1 | 1) => {
    const next = i + dir;
    if (next < 0 || next >= images.length) return;
    const arr = [...images];
    [arr[i], arr[next]] = [arr[next], arr[i]];
    setImages(arr);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Record<string, unknown> = {
        make:               make.trim(),
        model:              model.trim(),
        variant_label:      variantLabel.trim() || null,
        calc_type:          calcType,
        year_introduced:    yearIn   ? parseInt(yearIn)   : null,
        year_discontinued:  yearOut  ? parseInt(yearOut)  : null,
        display_type:       displayType.trim() || null,
        power_source:       power.trim() || null,
        num_keys:           numKeys ? parseInt(numKeys) : null,
        country_of_origin:  country.trim() || null,
        description:        description.trim() || null,
        fun_facts:          funFacts.trim() || null,
        manual_url:         manualUrl.trim() || null,
        rarity_score:       rarity    ? parseFloat(rarity)    : null,
        weirdness_score:    weirdness ? parseFloat(weirdness) : null,
        tags:               tagsRaw.split(',').map(s => s.trim()).filter(Boolean),
        is_verified:        isVerified,
        images,
      };
      const updated = await api.calculators.update(calc.id, payload as unknown as Partial<Calculator>);
      setSuccess(true);
      setTimeout(() => onSaved(updated), 600);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.calculators.delete(calc.id);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  return (
    <div className="px-5 py-5 bg-zinc-950 space-y-6">
      {error && (
        <div className="bg-red-950/40 border border-red-800/50 text-red-400 font-mono text-xs px-3 py-2 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-950/40 border border-green-800/50 text-green-400 font-mono text-xs px-3 py-2 rounded-lg">✓ Saved successfully</div>
      )}

      {/* ── Core identity ── */}
      <section>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Identity</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Make</FieldLabel>
            <TextInput value={make} onChange={setMake} placeholder="HP" />
          </div>
          <div>
            <FieldLabel>Model</FieldLabel>
            <TextInput value={model} onChange={setModel} placeholder="HP-42S" />
          </div>
        </div>
        <div className="mt-3">
          <FieldLabel>Variant label (optional)</FieldLabel>
          <TextInput value={variantLabel} onChange={setVariantLabel} placeholder="Gold edition, etc." />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <FieldLabel>Type</FieldLabel>
            <select value={calcType} onChange={e => setCalcType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors">
              {CALC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Year introduced</FieldLabel>
            <TextInput value={yearIn} onChange={setYearIn} placeholder="1982" />
          </div>
          <div>
            <FieldLabel>Year discontinued</FieldLabel>
            <TextInput value={yearOut} onChange={setYearOut} placeholder="1989" />
          </div>
        </div>
      </section>

      {/* ── Hardware specs ── */}
      <section>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Hardware</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Display type</FieldLabel>
            <select value={displayType} onChange={e => setDisplayType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors">
              <option value="">—</option>
              {DISPLAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Power source</FieldLabel>
            <TextInput value={power} onChange={setPower} placeholder="Battery / AC" />
          </div>
          <div>
            <FieldLabel>Number of keys</FieldLabel>
            <TextInput value={numKeys} onChange={setNumKeys} placeholder="35" />
          </div>
          <div>
            <FieldLabel>Country of origin</FieldLabel>
            <TextInput value={country} onChange={setCountry} placeholder="Japan" />
          </div>
        </div>
      </section>

      {/* ── Scores ── */}
      <section>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Scores (0–10)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Rarity score</FieldLabel>
            <TextInput value={rarity} onChange={setRarity} placeholder="7.5" />
          </div>
          <div>
            <FieldLabel>Weirdness score</FieldLabel>
            <TextInput value={weirdness} onChange={setWeirdness} placeholder="4.2" />
          </div>
        </div>
      </section>

      {/* ── Tags ── */}
      <section>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Tags</p>
        <FieldLabel>Comma-separated tags</FieldLabel>
        <TextInput value={tagsRaw} onChange={setTagsRaw} placeholder="rpn, voyager, programmable" />
        {tagsRaw && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tagsRaw.split(',').map(t => t.trim()).filter(Boolean).map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded font-mono border border-zinc-700">#{t}</span>
            ))}
          </div>
        )}
      </section>

      {/* ── Description & fun facts ── */}
      <section>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Content</p>
        <div className="space-y-3">
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors resize-y" />
          </div>
          <div>
            <FieldLabel>Fun facts</FieldLabel>
            <textarea value={funFacts} onChange={e => setFunFacts(e.target.value)} rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors resize-y" />
          </div>
          <div>
            <FieldLabel>Manual URL</FieldLabel>
            <TextInput value={manualUrl} onChange={setManualUrl} placeholder="https://…" />
          </div>
        </div>
      </section>

      {/* ── Images ── */}
      <section>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Images</p>
        <div className="space-y-2 mb-3">
          {images.length === 0 && (
            <p className="text-zinc-600 font-mono text-xs italic">No images yet</p>
          )}
          {images.map((url, i) => (
            <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              {/* Thumbnail with trashcan hover overlay */}
              <div className="relative flex-shrink-0 w-10 h-10 group/thumb">
                <img src={url} alt="" className="w-full h-full object-contain bg-zinc-800 rounded" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute inset-0 bg-black/70 rounded flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity text-red-400 text-base"
                  title="Remove image"
                >
                  🗑
                </button>
              </div>
              <span className="flex-1 min-w-0 font-mono text-[10px] text-zinc-500 truncate">{url}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => moveImage(i, -1)} disabled={i === 0}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors px-1 font-mono text-xs">▲</button>
                <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors px-1 font-mono text-xs">▼</button>
              </div>
            </div>
          ))}
        </div>
        {/* URL input row */}
        <div className="flex gap-2 mb-2">
          <input
            value={newImgUrl}
            onChange={e => setNewImgUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
            placeholder="Paste image URL and press Enter or Add…"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
          />
          <button onClick={addImage}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg font-mono text-xs hover:bg-zinc-700 border border-zinc-700 transition-colors">
            Add URL
          </button>
        </div>
        {/* File upload row */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-900 border border-dashed border-zinc-600 hover:border-amber-400/50 text-zinc-500 hover:text-zinc-300 rounded-lg font-mono text-xs transition-colors disabled:opacity-50 group">
            {uploading ? (
              <><span className="animate-spin">⟳</span> Uploading…</>
            ) : (
              <><span className="text-base">📁</span> Upload from computer</>
            )}
          </button>
          {uploading && (
            <p className="text-[10px] text-zinc-600 font-mono mt-1 text-center">Uploading image, please wait…</p>
          )}
        </div>
      </section>

      {/* ── Flags ── */}
      <section>
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Flags</p>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div onClick={() => setIsVerified(v => !v)}
            className={`w-10 h-5 rounded-full transition-colors relative ${isVerified ? 'bg-amber-400' : 'bg-zinc-700'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isVerified ? 'left-5' : 'left-0.5'}`} />
          </div>
          <span className="text-sm font-mono text-zinc-300 group-hover:text-zinc-100 transition-colors">
            Verified
            <span className="ml-2 text-[10px] text-zinc-600">(shows gold badge on detail page)</span>
          </span>
        </label>
      </section>

      {/* ── Variants (only shown on base models, not on variant entries) ── */}
      {!calc.parent_id && (
        <section>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-3">
            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">Variants &amp; colorways</p>
            <button
              onClick={() => setShowVariantAdder(v => !v)}
              className="text-[10px] font-mono text-amber-500 hover:text-amber-300 transition-colors"
            >
              {showVariantAdder ? '✕ cancel' : '+ add variant'}
            </button>
          </div>

          {showVariantAdder && (
            <AddVariantForm
              parent={calc}
              onAdded={v => {
                const updated = [...localVariants, v];
                setLocalVariants(updated);
                onVariantAdded(v);
                setShowVariantAdder(false);
              }}
              onCancel={() => setShowVariantAdder(false)}
            />
          )}

          {localVariants.length === 0 && !showVariantAdder && (
            <p className="text-zinc-700 font-mono text-xs italic mb-2">No variants yet.</p>
          )}

          {localVariants.length > 0 && (
            <div className="space-y-2 mb-2">
              {localVariants.map(v => (
                <div key={v.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <div className="w-8 h-8 flex-shrink-0 bg-zinc-800 rounded overflow-hidden flex items-center justify-center">
                    {v.images[0]
                      ? <img src={v.images[0]} alt="" className="w-full h-full object-contain" />
                      : <span className="text-sm opacity-20">🧮</span>
                    }
                  </div>
                  <span className="flex-1 text-xs font-mono text-zinc-300 truncate">
                    {v.variant_label ?? v.model}
                    {v.year_introduced && <span className="text-zinc-600 ml-2">{v.year_introduced}</span>}
                  </span>
                  <Link href={`/calculators/${v.id}`}
                    className="text-[10px] font-mono text-amber-500 hover:text-amber-300 transition-colors flex-shrink-0 px-2">
                    edit ↗
                  </Link>
                  {deletingVariantId === v.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-red-400">Sure?</span>
                      <button
                        onClick={() => setDeletingVariantId(null)}
                        className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700"
                      >no</button>
                      <button
                        onClick={async () => {
                          try {
                            await api.calculators.delete(v.id);
                            const next = localVariants.filter(lv => lv.id !== v.id);
                            setLocalVariants(next);
                            onVariantDeleted(v.id);
                          } catch {}
                          setDeletingVariantId(null);
                        }}
                        className="text-[10px] font-mono text-white bg-red-600 hover:bg-red-500 px-1.5 py-0.5 rounded"
                      >yes</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingVariantId(v.id)}
                      className="text-[10px] font-mono text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0"
                    >🗑</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <div>
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)}
              className="text-xs font-mono text-red-500/60 hover:text-red-400 transition-colors border border-red-900/30 hover:border-red-700/50 px-3 py-2 rounded-lg">
              🗑 Delete calculator
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-red-400">Are you sure?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs font-mono bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDel(false)}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : '✓ Save changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Comments Section ────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-lg transition-colors leading-none"
        >
          <span className={(hovered || value) >= n ? 'text-amber-400' : 'text-zinc-700'}>★</span>
        </button>
      ))}
    </div>
  );
}

function CommentsSection({ calcId, currentUser }: { calcId: string; currentUser: AuthUser | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.comments.list(calcId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [calcId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const newComment = await api.comments.create(calcId, {
        content: content.trim(),
        rating: rating || null,
      });
      setComments(prev => [newComment, ...prev]);
      setContent('');
      setRating(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.comments.delete(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
  };

  const avgRating = comments.filter(c => c.rating).length > 0
    ? (comments.reduce((sum, c) => sum + (c.rating ?? 0), 0) / comments.filter(c => c.rating).length).toFixed(1)
    : null;

  return (
    <div className="mt-8">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          Community reviews
        </h2>
        {avgRating && (
          <span className="text-amber-400 font-mono text-sm font-bold">
            ★ {avgRating}
            <span className="text-zinc-600 text-[10px] ml-1">({comments.filter(c => c.rating).length} rated)</span>
          </span>
        )}
        <span className="text-zinc-700 font-mono text-[10px]">({comments.length})</span>
      </div>

      {/* Write a comment */}
      {currentUser ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-amber-400 font-mono">
                  {(currentUser.display_name ?? currentUser.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-zinc-500">@{currentUser.username}</span>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <span className="text-[10px] font-mono text-zinc-600">{rating}/5</span>
            )}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share your experience with this calculator…"
            rows={3}
            maxLength={2000}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
          {error && <p className="text-red-400 font-mono text-xs mt-2">{error}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-zinc-700 font-mono">{content.length}/2000</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="px-4 py-1.5 bg-amber-400 text-zinc-950 rounded-lg font-mono text-xs font-bold hover:bg-amber-300 transition-colors disabled:opacity-40"
            >
              {submitting ? 'Posting…' : 'Post review'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5 text-center">
          <p className="text-zinc-600 font-mono text-xs">
            <a href="/login" className="text-amber-400 hover:text-amber-300">Sign in</a> to leave a review
          </p>
        </div>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-zinc-700 font-mono text-sm italic text-center py-6">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-amber-400 font-mono">
                    {(c.display_name ?? c.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">{c.display_name ?? `@${c.username}`}</span>
                {c.rating && (
                  <span className="text-amber-400 text-xs font-mono">{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</span>
                )}
                <span className="text-[10px] text-zinc-700 font-mono ml-auto">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
                {(currentUser?.id === c.user_id || currentUser?.is_superuser) && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-[10px] font-mono text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    delete
                  </button>
                )}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Collection Modal ────────────────────────────────────────────────────────

function CollectionModal({
  calcId,
  calcName,
  variants,
  status,
  onClose,
  onSuccess,
}: {
  calcId: string;
  calcName: string;
  variants: Calculator[];
  status: 'owned' | 'wanted';
  onClose: () => void;
  onSuccess: (entry: CollectionEntry) => void;
}) {
  const [selectedCalcId, setSelectedCalcId] = useState(calcId);
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [acquiredFrom, setAcquiredFrom] = useState('');
  const [price, setPrice] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = variants.find(v => v.id === selectedCalcId);
  const displayName = selectedVariant?.variant_label
    ? `${calcName} · ${selectedVariant.variant_label}`
    : calcName;

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      const entry = await api.collection.add({
        calculator_id: selectedCalcId,
        status,
        condition: condition || null,
        notes: notes.trim() || null,
        acquired_from: acquiredFrom.trim() || null,
        acquired_price: price ? parseFloat(price) : null,
      });
      onSuccess(entry);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add');
      setAdding(false);
    }
  };

  const isOwned = status === 'owned';
  const CONDITIONS = ['mint', 'excellent', 'good', 'fair', 'poor'] as const;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-mono font-bold text-zinc-100">
              {isOwned ? '🧮 Add to collection' : '⭐ Add to wishlist'}
            </h3>
            <p className="text-zinc-600 font-mono text-xs mt-0.5">{displayName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors text-xl leading-none">✕</button>
        </div>

        {error && (
          <p className="text-red-400 font-mono text-xs mb-3 bg-red-900/20 border border-red-900/30 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Variant selector */}
        {variants.length > 0 && (
          <div className="mb-4">
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
              Which version?
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCalcId(calcId)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                  selectedCalcId === calcId
                    ? 'bg-zinc-700 text-zinc-100 border-zinc-500'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                }`}>
                Base model
              </button>
              {variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedCalcId(v.id)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                    selectedCalcId === v.id
                      ? 'bg-zinc-700 text-zinc-100 border-zinc-500'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                  }`}>
                  {v.variant_label ?? v.model}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Condition — only for owned */}
        {isOwned && (
          <div className="mb-4">
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
              Condition <span className="text-zinc-700 normal-case">(optional)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {CONDITIONS.map(c => (
                <button key={c}
                  onClick={() => setCondition(condition === c ? '' : c)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                    condition === c
                      ? 'bg-amber-400/20 text-amber-400 border-amber-600/60'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
            {isOwned ? 'Notes' : 'Why do you want this?'} <span className="text-zinc-700 normal-case">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={isOwned ? 'Box included, working condition…' : 'Dream piece, great for RPN…'}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
        </div>

        {/* Owned-only: price + source */}
        {isOwned && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
                Price paid <span className="text-zinc-700 normal-case">($, optional)</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="25.00"
                min="0"
                step="0.01"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
                Acquired from <span className="text-zinc-700 normal-case">(optional)</span>
              </label>
              <input
                value={acquiredFrom}
                onChange={e => setAcquiredFrom(e.target.value)}
                placeholder="eBay, estate sale…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-400 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors border border-zinc-700">
            cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={adding}
            className={`flex-1 px-4 py-2.5 rounded-lg font-mono text-sm font-bold transition-colors disabled:opacity-50 ${
              isOwned
                ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600 border border-zinc-600'
            }`}>
            {adding ? 'Adding…' : isOwned ? '✓ Add to collection' : '⭐ Add to wishlist'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Suggest Edit Modal ────────────────────────────────────────────────────────

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
