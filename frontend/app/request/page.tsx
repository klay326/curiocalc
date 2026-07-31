'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function RequestForm() {
  const params = useSearchParams();
  const [make, setMake]   = useState('');
  const [model, setModel] = useState('');
  const [year, setYear]   = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const m = params.get('make');
    if (m) setMake(m);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!make.trim() || !model.trim()) return;
    setSubmitting(true); setError('');
    try {
      await api.calcRequests.create({
        make: make.trim(),
        model: model.trim(),
        year: year ? parseInt(year) : null,
        notes: notes.trim() || null,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Link href="/calculators" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold font-mono text-amber-400">Request a Calculator</h1>
        <p className="text-zinc-500 font-mono text-xs mt-2">
          Can&apos;t find a calculator in our catalog? Let us know and we&apos;ll add it.
        </p>
      </div>

      {done ? (
        <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-4">✓</p>
          <p className="font-bold font-mono text-green-400 mb-2">Request submitted!</p>
          <p className="text-zinc-500 font-mono text-xs mb-6">
            We&apos;ll review your request and add it to the catalog.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setDone(false); setMake(''); setModel(''); setYear(''); setNotes(''); }}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-colors">
              Submit another
            </button>
            <Link href="/calculators"
              className="text-xs font-mono bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-lg hover:bg-amber-300 transition-colors">
              Browse catalog
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                Make <span className="text-red-500">*</span>
              </label>
              <input
                value={make} onChange={e => setMake(e.target.value)} required
                placeholder="e.g. Texas Instruments"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 font-mono text-sm placeholder-zinc-700 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                value={model} onChange={e => setModel(e.target.value)} required
                placeholder="e.g. TI-99"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 font-mono text-sm placeholder-zinc-700 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
              Year <span className="text-zinc-700 normal-case">(optional)</span>
            </label>
            <input
              type="number" min={1960} max={2030}
              value={year} onChange={e => setYear(e.target.value)}
              placeholder="e.g. 1979"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 font-mono text-sm placeholder-zinc-700 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
              Notes <span className="text-zinc-700 normal-case">(optional)</span>
            </label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Any details that might help us find it — variants, country of origin, links…"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 font-mono text-sm placeholder-zinc-700 focus:outline-none focus:border-amber-400 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-red-400 font-mono text-xs">{error}</p>}

          <button type="submit" disabled={submitting || !make.trim() || !model.trim()}
            className="w-full bg-amber-400 text-zinc-950 font-bold font-mono py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function RequestPage() {
  return <Suspense><RequestForm /></Suspense>;
}
