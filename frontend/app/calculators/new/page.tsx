'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const CALC_TYPES = ['scientific','graphing','financial','programmable','databank','printing','novelty','other'];
const DISPLAY_TYPES = ['LCD','LED','VFD','color LCD','nixie tube','CRT','e-paper','thermal paper','mechanical','relay'];

type Form = {
  make: string; model: string; year_introduced: string; year_discontinued: string;
  calc_type: string; display_type: string; power_source: string; num_keys: string;
  country_of_origin: string; description: string; fun_facts: string; tags: string;
  variant_label: string;
};

const EMPTY: Form = {
  make:'', model:'', year_introduced:'', year_discontinued:'', calc_type:'scientific',
  display_type:'LCD', power_source:'', num_keys:'', country_of_origin:'',
  description:'', fun_facts:'', tags:'', variant_label:'',
};

export default function NewCalculatorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Variant parent search
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<Calculator[]>([]);
  const [parentCalc, setParentCalc] = useState<Calculator | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setError('You must be logged in to add a calculator.'); return; }
    setLoading(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        make: form.make.trim(),
        model: form.model.trim(),
        calc_type: form.calc_type,
        display_type: form.display_type || undefined,
        power_source: form.power_source.trim() || undefined,
        country_of_origin: form.country_of_origin.trim() || undefined,
        description: form.description.trim() || undefined,
        fun_facts: form.fun_facts.trim() || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        parent_id: parentCalc?.id || undefined,
        variant_label: form.variant_label.trim() || undefined,
      };
      if (form.year_introduced) payload.year_introduced = parseInt(form.year_introduced);
      if (form.year_discontinued) payload.year_discontinued = parseInt(form.year_discontinued);
      if (form.num_keys) payload.num_keys = parseInt(form.num_keys);

      const calc = await api.calculators.create(payload);
      router.push(`/calculators/${calc.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add calculator');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <p className="text-zinc-400 font-mono text-sm mb-4">You need to be logged in to add a calculator.</p>
      <Link href="/login" className="text-amber-400 hover:text-amber-300 font-mono text-sm">Sign in →</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <h1 className="text-2xl font-bold font-mono text-amber-400 mt-3">Add a Calculator</h1>
        <p className="text-zinc-500 font-mono text-xs mt-1">Help grow the community database</p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-red-400 text-xs font-mono mb-6">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Identity */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Make *" value={form.make} onChange={set('make')} required placeholder="Texas Instruments" />
            <Field label="Model *" value={form.model} onChange={set('model')} required placeholder="TI-84 Plus" />
            <Field label="Year introduced" value={form.year_introduced} onChange={set('year_introduced')} placeholder="1984" type="number" />
            <Field label="Year discontinued" value={form.year_discontinued} onChange={set('year_discontinued')} placeholder="(leave blank if still sold)" type="number" />
          </div>
        </section>

        {/* Classification */}
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
            <Field label="Country of origin" value={form.country_of_origin} onChange={set('country_of_origin')} placeholder="Japan" />
          </div>
        </section>

        {/* Description */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Description</h2>
          <TextArea label="Description" value={form.description} onChange={set('description')}
            placeholder="What makes this calculator special? Its history, use, notable features…" rows={4} />
          <TextArea label="Fun facts / lore" value={form.fun_facts} onChange={set('fun_facts')}
            placeholder="Weird quirks, famous uses, collector notes…" rows={3} />
          <Field label="Tags (comma-separated)" value={form.tags} onChange={set('tags')} placeholder="graphing, school, iconic, TI" />
        </section>

        {/* Variant */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Variant / Colorway</h2>
            <p className="text-[10px] text-zinc-600 font-mono mt-0.5">Optional — use if this is a regional edition, colorway, or revision of an existing model</p>
          </div>

          {parentCalc ? (
            <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-xs font-mono text-zinc-200">{parentCalc.make} {parentCalc.model}</p>
                <p className="text-[10px] font-mono text-zinc-500">parent model</p>
              </div>
              <button onClick={() => { setParentCalc(null); setParentSearch(''); }}
                className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm font-mono">
                ✕ remove
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={parentSearch}
                onChange={e => setParentSearch(e.target.value)}
                placeholder="Search for parent model (e.g. TI-84 Plus)…"
                className="input pr-8"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs animate-pulse">…</span>
              )}
              {parentResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                  {parentResults.map(r => (
                    <button key={r.id} type="button"
                      onClick={() => { setParentCalc(r); setParentSearch(''); setParentResults([]); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-700 transition-colors text-left">
                      {r.images[0] && (
                        <img src={r.images[0]} alt="" className="w-8 h-8 rounded object-contain bg-zinc-900 flex-shrink-0" />
                      )}
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

          <Field
            label="Variant label"
            value={form.variant_label}
            onChange={set('variant_label')}
            placeholder="e.g. Silver Edition, UK Version, 1996 Revision"
          />
        </section>

        <button
          type="submit" disabled={loading}
          className="w-full bg-amber-400 text-zinc-950 rounded-xl py-3 font-mono font-bold text-sm hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding…' : '+ Add to database'}
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
