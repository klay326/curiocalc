'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator, type BrandSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const CALC_TYPES = ['scientific','graphing','financial','programmable','databank','printing','novelty','other'];
const DISPLAY_TYPES = ['LCD','LED','VFD','color LCD','nixie tube','CRT','e-paper','thermal paper','mechanical','relay'];
const COMMON_COUNTRIES = ['Japan','USA','Taiwan','China','Germany','UK','France','Italy','South Korea','Hong Kong'];

type Form = {
  make: string; model: string; year_introduced: string; year_discontinued: string;
  calc_type: string; display_type: string; power_source: string; num_keys: string;
  country_of_origin: string; description: string; fun_facts: string; manual_url: string; tags: string;
  variant_label: string; image_urls: string;
  rarity_score: string; weirdness_score: string;
};

const EMPTY: Form = {
  make:'', model:'', year_introduced:'', year_discontinued:'', calc_type:'scientific',
  display_type:'', power_source:'', num_keys:'', country_of_origin:'',
  description:'', fun_facts:'', manual_url:'', tags:'', variant_label:'', image_urls:'',
  rarity_score:'', weirdness_score:'',
};

function ScoreSlider({ label, desc, value, onChange }: {
  label: string; desc: string; value: string;
  onChange: (v: string) => void;
}) {
  const num = parseFloat(value) || 0;
  const filled = Math.round(num);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">{label}</label>
        <span className="text-xs font-mono text-amber-400">{value || '—'}</span>
      </div>
      <p className="text-[10px] font-mono text-zinc-600 mb-2">{desc}</p>
      <div className="flex items-center gap-3">
        <input
          type="range" min="0" max="10" step="0.5"
          value={value || 0}
          onChange={e => onChange(e.target.value === '0' ? '' : e.target.value)}
          className="flex-1 accent-amber-400 h-1.5"
        />
        <div className="flex gap-0.5 flex-shrink-0">
          {Array.from({length: 10}, (_, i) => (
            <div key={i} className={`w-2 h-4 rounded-sm transition-colors ${i < filled ? 'bg-amber-400' : 'bg-zinc-700'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NewCalculatorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Brand autocomplete
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [showBrandList, setShowBrandList] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  // Tag autocomplete
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showTagList, setShowTagList] = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);

  // Image file uploads (queued until after calc is created)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced section collapse
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Variant parent search
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<Calculator[]>([]);
  const [parentCalc, setParentCalc] = useState<Calculator | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duplicate check
  const [dupWarning, setDupWarning] = useState<Calculator[]>([]);
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.calculators.brands().then(setBrands).catch(() => {});
    api.calculators.tags().then(setAllTags).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrandList(false);
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setShowTagList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setForm(prev => ({ ...prev, [k]: v }));

    if (k === 'make' || k === 'model') {
      if (dupTimer.current) clearTimeout(dupTimer.current);
      const newMake = k === 'make' ? v : form.make;
      const newModel = k === 'model' ? v : form.model;
      if (newMake.trim() && newModel.trim()) {
        dupTimer.current = setTimeout(async () => {
          try {
            const results = await api.calculators.list({ q: `${newMake} ${newModel}`, limit: 3 });
            setDupWarning(results.filter(r =>
              r.make.toLowerCase() === newMake.toLowerCase() &&
              r.model.toLowerCase().includes(newModel.toLowerCase())
            ));
          } catch { setDupWarning([]); }
        }, 500);
      } else {
        setDupWarning([]);
      }
    }
  };

  // Debounced parent search
  useEffect(() => {
    if (!parentSearch.trim() || parentCalc) { setParentResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.calculators.list({ q: parentSearch, limit: 6 });
        setParentResults(results);
      } catch { setParentResults([]); }
      finally { setSearching(false); }
    }, 350);
  }, [parentSearch, parentCalc]);

  // Filtered brand suggestions — contains match, sorted by count
  const filteredBrands = form.make.trim()
    ? brands
        .filter(b => b.make.toLowerCase().includes(form.make.toLowerCase()) && b.make.toLowerCase() !== form.make.toLowerCase())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  // Current tag being typed (last comma-separated token)
  const tagTokens = form.tags.split(',');
  const currentTagInput = tagTokens[tagTokens.length - 1].trim().toLowerCase();
  const filteredTags = currentTagInput.length >= 1
    ? allTags
        .filter(t => t.toLowerCase().includes(currentTagInput) && !tagTokens.slice(0, -1).map(s => s.trim()).includes(t))
        .slice(0, 8)
    : [];

  const selectTag = (tag: string) => {
    const prefix = tagTokens.slice(0, -1).join(', ');
    setForm(prev => ({ ...prev, tags: prefix ? `${prefix}, ${tag}, ` : `${tag}, ` }));
    setShowTagList(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setError('You must be logged in.'); return; }
    setLoading(true); setError(''); setLoadingStatus('Creating calculator…');
    try {
      const imageList = form.image_urls
        .split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));

      const payload: Record<string, unknown> = {
        make: form.make.trim(),
        model: form.model.trim(),
        calc_type: form.calc_type,
        display_type: form.display_type || undefined,
        power_source: form.power_source.trim() || undefined,
        country_of_origin: form.country_of_origin.trim() || undefined,
        description: form.description.trim() || undefined,
        fun_facts: form.fun_facts.trim() || undefined,
        manual_url: form.manual_url.trim() || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images: imageList,
        parent_id: parentCalc?.id || undefined,
        variant_label: form.variant_label.trim() || undefined,
      };
      if (form.year_introduced) payload.year_introduced = parseInt(form.year_introduced);
      if (form.year_discontinued) payload.year_discontinued = parseInt(form.year_discontinued);
      if (form.num_keys) payload.num_keys = parseInt(form.num_keys);
      if (form.rarity_score) payload.rarity_score = parseFloat(form.rarity_score);
      if (form.weirdness_score) payload.weirdness_score = parseFloat(form.weirdness_score);

      const calc = await api.calculators.create(payload);

      // Upload any pending files after the calc exists
      if (pendingFiles.length > 0) {
        let updated = calc;
        for (let i = 0; i < pendingFiles.length; i++) {
          setLoadingStatus(`Uploading image ${i + 1} of ${pendingFiles.length}…`);
          try { updated = await api.calculators.uploadImage(calc.id, pendingFiles[i]); } catch { /* non-fatal */ }
        }
        void updated;
      }

      router.push(`/calculators/${calc.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add calculator');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  if (!user) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <p className="text-zinc-400 font-mono text-sm mb-4">You need to be logged in to add a calculator.</p>
      <Link href="/login" className="text-amber-400 hover:text-amber-300 font-mono text-sm">Sign in →</Link>
    </div>
  );

  if (!user.is_superuser && !user.is_curator) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <p className="text-zinc-400 font-mono text-sm mb-4">Only admins and curators can add calculators.</p>
      <Link href="/" className="text-amber-400 hover:text-amber-300 font-mono text-sm">← Browse</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <h1 className="text-2xl font-bold font-mono text-amber-400 mt-3">Add a Calculator</h1>
        <p className="text-zinc-500 font-mono text-xs mt-1">Only Make + Model + Type are required</p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-red-400 text-xs font-mono mb-6">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">

        {/* ── Identity ── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Identity</h2>

          {dupWarning.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">⚠ Similar entry already exists</p>
              {dupWarning.map(d => (
                <Link key={d.id} href={`/calculators/${d.id}`} target="_blank"
                  className="flex items-center gap-2 hover:bg-amber-900/20 rounded p-1 transition-colors">
                  {d.images[0] && <img src={d.images[0]} alt="" className="w-8 h-8 rounded object-contain bg-zinc-900 flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-mono text-amber-300">{d.make} {d.model}</p>
                    <p className="text-[10px] font-mono text-zinc-500">{d.year_introduced ?? '?'} · {d.calc_type}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-mono text-amber-600">view →</span>
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Brand with rich autocomplete */}
            <div ref={brandRef}>
              <label className="label">Make *</label>
              <div className="relative">
                <input
                  type="text" value={form.make} required placeholder="Texas Instruments"
                  onChange={set('make')}
                  onFocus={() => setShowBrandList(true)}
                  className="input"
                />
                {showBrandList && filteredBrands.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                    {filteredBrands.map(b => (
                      <button key={b.make} type="button"
                        onClick={() => { setForm(prev => ({ ...prev, make: b.make })); setShowBrandList(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 transition-colors text-left">
                        {b.image ? (
                          <img src={b.image} alt="" className="w-6 h-6 rounded object-contain bg-zinc-900 flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-zinc-700 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm font-mono text-zinc-200">{b.make}</span>
                        <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">{b.count} calc{b.count !== 1 ? 's' : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 font-mono mt-1">Use the full name — e.g. "Texas Instruments", not "TI"</p>
            </div>

            {/* Model */}
            <div>
              <label className="label">Model *</label>
              <input
                type="text" value={form.model} required placeholder="TI-84 Plus"
                onChange={set('model')}
                className="input"
              />
              <p className="text-[10px] text-zinc-600 font-mono mt-1">Include the brand prefix — e.g. "TI-84 Plus", "HP-42S"</p>
            </div>

            <Field label="Year introduced" value={form.year_introduced} onChange={set('year_introduced')} placeholder="1984" type="number" />
            <Field label="Year discontinued" value={form.year_discontinued} onChange={set('year_discontinued')} placeholder="still in production" type="number" />
          </div>
        </section>

        {/* ── Images ── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Images</h2>

          {/* Pending file list */}
          {pendingFiles.length > 0 && (
            <div className="space-y-1.5">
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-zinc-400 flex-1 truncate">{f.name}</span>
                  <span className="text-[10px] font-mono text-zinc-600">{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-zinc-600 hover:text-red-400 transition-colors text-xs ml-1">✕</button>
                </div>
              ))}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 border border-dashed border-zinc-600 hover:border-amber-400/50 text-zinc-500 hover:text-zinc-300 rounded-lg font-mono text-xs transition-colors">
            <span className="text-base">📁</span> Upload images from computer
          </button>

          <div>
            <p className="text-[10px] text-zinc-600 font-mono mb-1.5">Or paste image URLs (one per line)</p>
            <textarea
              value={form.image_urls}
              onChange={set('image_urls')}
              placeholder={'https://example.com/front.jpg\nhttps://example.com/back.jpg'}
              rows={2}
              className="input resize-none font-mono text-xs"
            />
          </div>
        </section>

        {/* ── Classification ── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Classification</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type *</label>
              <select value={form.calc_type} onChange={set('calc_type')} className="select">
                {CALC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Display type</label>
              <select value={form.display_type} onChange={set('display_type')} className="select">
                <option value="">— unknown —</option>
                {DISPLAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="Power source" value={form.power_source} onChange={set('power_source')} placeholder="solar + battery" />
            <Field label="Number of keys" value={form.num_keys} onChange={set('num_keys')} placeholder="40" type="number" />
            <div className="col-span-2">
              <label className="label">Country of origin</label>
              <select value={form.country_of_origin} onChange={set('country_of_origin')} className="select">
                <option value="">— unknown —</option>
                {COMMON_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Description ── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Description</h2>
          <TextArea label="Description" value={form.description} onChange={set('description')}
            placeholder="What makes this calculator special? Its history, use, notable features…" rows={4} />

          {/* Tags with autocomplete */}
          <div ref={tagRef}>
            <label className="label">Tags</label>
            <div className="relative">
              <input
                type="text"
                value={form.tags}
                onChange={set('tags')}
                onFocus={() => setShowTagList(true)}
                placeholder="graphing, school, iconic, rpn"
                className="input"
              />
              {showTagList && filteredTags.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                  {filteredTags.map(t => (
                    <button key={t} type="button"
                      onClick={() => selectTag(t)}
                      className="w-full text-left px-3 py-2 text-sm font-mono text-zinc-300 hover:bg-zinc-700 transition-colors">
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 font-mono mt-1">Comma-separated. Type to see existing tags.</p>
            {form.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded font-mono border border-zinc-700">#{t}</span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Color & Variant ── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Color &amp; Variant</h2>
            <p className="text-[10px] text-zinc-600 font-mono mt-0.5">Leave blank if this is a standalone model</p>
          </div>

          <Field label="Color or edition name" value={form.variant_label} onChange={set('variant_label')}
            placeholder="Black, Rose Gold, Python Edition, UK Version…" />

          {form.variant_label.trim() && (
            <div>
              <p className="text-[10px] font-mono text-zinc-500 mb-2">
                Is this a color/variant of an existing model?
                <span className="text-zinc-600"> (leave blank if this is the only version)</span>
              </p>
              {parentCalc ? (
                <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-xs font-mono text-zinc-200">{parentCalc.make} {parentCalc.model}</p>
                    <p className="text-[10px] font-mono text-zinc-500">base model</p>
                  </div>
                  <button type="button" onClick={() => { setParentCalc(null); setParentSearch(''); }}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors text-xs font-mono">
                    ✕ clear
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={parentSearch} onChange={e => setParentSearch(e.target.value)}
                    placeholder="Search for base model…" className="input pr-8" />
                  {searching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs animate-pulse">…</span>
                  )}
                  {parentResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                      {parentResults.map(r => (
                        <button key={r.id} type="button"
                          onClick={() => { setParentCalc(r); setParentSearch(''); setParentResults([]); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-700 transition-colors text-left">
                          {r.images[0] && <img src={r.images[0]} alt="" className="w-8 h-8 rounded object-contain bg-zinc-900 flex-shrink-0" />}
                          <div>
                            <p className="text-sm font-mono text-zinc-200">{r.make} {r.model}</p>
                            <p className="text-[10px] font-mono text-zinc-500">{r.year_introduced ?? '?'} · {r.calc_type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Advanced (collapsed by default) ── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Advanced details</span>
            <span className={`text-zinc-600 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {showAdvanced && (
            <div className="px-5 pb-5 space-y-5 border-t border-zinc-800 pt-4">
              <TextArea label="Fun facts / lore" value={form.fun_facts} onChange={set('fun_facts')}
                placeholder="Weird quirks, famous uses, collector notes…" rows={3} />
              <Field label="Manual URL" value={form.manual_url} onChange={set('manual_url')} placeholder="https://…" />
              <ScoreSlider
                label="Rarity"
                desc="How hard is it to find? 1 = common, 10 = museum-only"
                value={form.rarity_score}
                onChange={v => setForm(prev => ({ ...prev, rarity_score: v }))}
              />
              <ScoreSlider
                label="Weirdness"
                desc="How strange or unusual is it? 1 = boring, 10 = what is this thing"
                value={form.weirdness_score}
                onChange={v => setForm(prev => ({ ...prev, weirdness_score: v }))}
              />
            </div>
          )}
        </section>

        <button
          type="submit" disabled={loading}
          className="w-full bg-amber-400 text-zinc-950 rounded-xl py-3 font-mono font-bold text-sm hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          {loading ? loadingStatus || 'Adding…' : '+ Add to database'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, type = 'text' }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="input" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        className="input resize-none" />
    </div>
  );
}
