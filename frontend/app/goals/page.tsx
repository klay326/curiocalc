'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type CollectionGoal } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: CollectionGoal) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const g = await api.goals.create({ title: title.trim(), description: description.trim() || undefined });
      onCreate(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-mono font-bold text-zinc-100 mb-4">New collection goal</h3>
        <form onSubmit={submit} className="space-y-3">
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Collect all HP Voyager series"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 font-mono text-sm placeholder-zinc-700 focus:outline-none focus:border-amber-400 transition-colors"
            required
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description…"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 font-mono text-sm placeholder-zinc-700 focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
          {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="text-xs font-mono bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: CollectionGoal;
  onUpdate: (g: CollectionGoal) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isComplete = goal.completed_at != null || goal.progress >= 1;
  const pct = Math.min(Math.round(goal.progress * 100), 100);

  const toggleComplete = async () => {
    setToggling(true);
    try {
      const updated = await api.goals.update(goal.id, { completed: !isComplete });
      onUpdate(updated);
    } finally {
      setToggling(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this goal?')) return;
    setDeleting(true);
    try {
      await api.goals.delete(goal.id);
      onDelete(goal.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`bg-zinc-900 border rounded-2xl p-5 flex flex-col gap-3 transition-colors ${
      isComplete ? 'border-emerald-900/50' : 'border-zinc-800'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isComplete && <span className="text-emerald-400 text-sm">✓</span>}
            <h3 className={`font-bold font-mono text-sm ${isComplete ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
              {goal.title}
            </h3>
          </div>
          {goal.description && (
            <p className="text-xs font-mono text-zinc-600 mt-0.5 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={toggleComplete} disabled={toggling}
            className="text-[10px] font-mono text-zinc-600 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
            {isComplete ? 'Reopen' : 'Complete'}
          </button>
          <button onClick={remove} disabled={deleting}
            className="text-[10px] font-mono text-zinc-700 hover:text-red-400 px-1 py-1 transition-colors disabled:opacity-50">
            ✕
          </button>
        </div>
      </div>

      {goal.target_count > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-zinc-600">Progress</span>
            <span className="text-[10px] font-mono text-zinc-500">
              {goal.owned_count} / {goal.target_count} ({pct}%)
            </span>
          </div>
          <ProgressBar value={goal.progress} />
        </div>
      )}

      {goal.target_count > 0 && goal.calc_ids.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-1.5">Calcs in goal</p>
          <div className="flex flex-wrap gap-1.5">
            {goal.calc_ids.slice(0, 8).map(cid => (
              <Link key={cid} href={`/calculators/${cid}`}
                className="text-[10px] font-mono text-zinc-600 hover:text-amber-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded transition-colors">
                {cid.slice(0, 8)}…
              </Link>
            ))}
            {goal.calc_ids.length > 8 && (
              <span className="text-[10px] font-mono text-zinc-700">+{goal.calc_ids.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {goal.completed_at && (
        <p className="text-[10px] font-mono text-emerald-600">
          Completed {new Date(goal.completed_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<CollectionGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      api.goals.list()
        .then(setGoals)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const active = goals.filter(g => !g.completed_at && g.progress < 1);
  const completed = goals.filter(g => g.completed_at || g.progress >= 1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← home</Link>
        <div className="flex items-center justify-between mt-3">
          <div>
            <h1 className="text-2xl font-bold font-mono text-amber-400">Collection goals</h1>
            <p className="text-zinc-500 font-mono text-xs mt-1">Track what you&apos;re working toward</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="text-xs font-mono bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl hover:bg-amber-300 transition-colors">
            + New goal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-600 font-mono text-sm mb-2">No goals yet</p>
          <p className="text-zinc-700 font-mono text-xs mb-6">
            Create a goal to track your collection progress
          </p>
          <button onClick={() => setShowCreate(true)}
            className="text-xs font-mono bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl hover:bg-amber-300 transition-colors">
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
                In progress · {active.length}
              </h2>
              <div className="space-y-3">
                {active.map(g => (
                  <GoalCard key={g.id} goal={g}
                    onUpdate={updated => setGoals(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    onDelete={id => setGoals(prev => prev.filter(x => x.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
                Completed · {completed.length}
              </h2>
              <div className="space-y-3">
                {completed.map(g => (
                  <GoalCard key={g.id} goal={g}
                    onUpdate={updated => setGoals(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    onDelete={id => setGoals(prev => prev.filter(x => x.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={g => { setGoals(prev => [g, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
