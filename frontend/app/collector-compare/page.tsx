'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, Calculator, CollectionEntry, UserProfile } from '@/lib/api';

type CollectorData = {
  profile: UserProfile;
  entries: CollectionEntry[];
  calcs: Record<string, Calculator>;
};

async function loadCollector(username: string): Promise<CollectorData> {
  const [profile, entries] = await Promise.all([
    api.users.get(username),
    api.collection.forUser(username),
  ]);
  const ids = [...new Set(entries.map(e => e.calculator_id))];
  const calcList = ids.length ? await api.calculators.batch(ids) : [];
  const calcs: Record<string, Calculator> = {};
  calcList.forEach(c => { calcs[c.id] = c; });
  return { profile, entries, calcs };
}

export default function CollectorComparePage() {
  const [usernameA, setUsernameA] = useState('');
  const [usernameB, setUsernameB] = useState('');
  const [dataA, setDataA] = useState<CollectorData | null>(null);
  const [dataB, setDataB] = useState<CollectorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    const a = usernameA.trim().replace(/^@/, '');
    const b = usernameB.trim().replace(/^@/, '');
    if (!a || !b) return;
    setLoading(true);
    setError(null);
    setDataA(null);
    setDataB(null);
    try {
      const [da, db] = await Promise.all([loadCollector(a), loadCollector(b)]);
      setDataA(da);
      setDataB(db);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load collectors');
    } finally {
      setLoading(false);
    }
  };

  const ownedIds = (d: CollectorData) =>
    new Set(d.entries.filter(e => e.status === 'owned' || e.status === 'for_sale').map(e => e.calculator_id));

  const sharedIds = dataA && dataB
    ? [...ownedIds(dataA)].filter(id => ownedIds(dataB).has(id))
    : [];

  const onlyA = dataA && dataB
    ? [...ownedIds(dataA)].filter(id => !ownedIds(dataB).has(id))
    : [];

  const onlyB = dataA && dataB
    ? [...ownedIds(dataB)].filter(id => !ownedIds(dataA).has(id))
    : [];

  const CalcGrid = ({ ids, calcs }: { ids: string[]; calcs: Record<string, Calculator> }) => (
    <div className="grid grid-cols-3 gap-2">
      {ids.slice(0, 18).map(id => {
        const c = calcs[id];
        if (!c) return null;
        return (
          <Link key={id} href={`/calculators/${id}`}
            className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl overflow-hidden transition-colors">
            <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
              {c.images[0]
                ? <img src={c.images[0]} alt={c.model} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                : <span className="text-xl opacity-20">🧮</span>}
            </div>
            <div className="p-1.5">
              <p className="text-[8px] font-mono text-zinc-600 truncate">{c.make}</p>
              <p className="text-[9px] font-bold font-mono text-zinc-300 truncate">{c.model}</p>
            </div>
          </Link>
        );
      })}
      {ids.length > 18 && (
        <div className="aspect-square bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
          <span className="text-xs font-mono text-zinc-600">+{ids.length - 18} more</span>
        </div>
      )}
    </div>
  );

  const AvatarLabel = ({ d, side }: { d: CollectorData; side: 'A' | 'B' }) => (
    <Link href={`/u/${d.profile.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      {d.profile.avatar_url
        ? <img src={d.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
        : <div className="w-8 h-8 rounded-full bg-amber-900/40 border border-amber-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-amber-400 font-mono">
              {(d.profile.display_name ?? d.profile.username).charAt(0).toUpperCase()}
            </span>
          </div>}
      <div>
        <p className="text-xs font-bold font-mono text-zinc-200">
          {d.profile.display_name ?? d.profile.username}
        </p>
        <p className="text-[10px] font-mono text-zinc-600">@{d.profile.username}</p>
      </div>
      <span className="ml-auto text-[10px] font-mono text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
        {ownedIds(d).size} owned
      </span>
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-xs text-zinc-500 font-mono hover:text-zinc-300 transition-colors">
          ← browse
        </Link>
      </div>

      <h1 className="text-2xl font-bold font-mono text-zinc-100 mb-1">Compare collectors</h1>
      <p className="text-sm text-zinc-500 font-mono mb-8">
        See what two collectors share and what's unique to each.
      </p>

      {/* Input row */}
      <div className="flex gap-3 mb-8">
        <input
          value={usernameA}
          onChange={e => setUsernameA(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCompare()}
          placeholder="@username"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
        <span className="flex items-center text-zinc-600 font-mono text-sm">vs</span>
        <input
          value={usernameB}
          onChange={e => setUsernameB(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCompare()}
          placeholder="@username"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
        <button
          onClick={handleCompare}
          disabled={loading || !usernameA.trim() || !usernameB.trim()}
          className="px-5 py-3 bg-amber-400 text-zinc-950 rounded-xl font-mono font-bold text-sm hover:bg-amber-300 transition-colors disabled:opacity-40"
        >
          {loading ? '…' : 'Compare'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 text-red-400 font-mono text-xs px-3 py-2 rounded-lg mb-6">
          {error}
        </div>
      )}

      {dataA && dataB && (
        <div className="space-y-8">
          {/* Summary bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-xl font-bold font-mono text-amber-400">{ownedIds(dataA).size}</p>
                <p className="text-[10px] font-mono text-zinc-600">
                  {dataA.profile.display_name ?? dataA.profile.username}'s collection
                </p>
              </div>
              <div>
                <p className="text-xl font-bold font-mono text-green-400">{sharedIds.length}</p>
                <p className="text-[10px] font-mono text-zinc-600">in common</p>
              </div>
              <div>
                <p className="text-xl font-bold font-mono text-amber-400">{ownedIds(dataB).size}</p>
                <p className="text-[10px] font-mono text-zinc-600">
                  {dataB.profile.display_name ?? dataB.profile.username}'s collection
                </p>
              </div>
            </div>
            {(ownedIds(dataA).size + ownedIds(dataB).size) > 0 && (
              <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                <div className="bg-amber-500/60 h-full" style={{ width: `${onlyA.length / (ownedIds(dataA).size + ownedIds(dataB).size) * 100}%` }} />
                <div className="bg-green-500/60 h-full" style={{ width: `${sharedIds.length * 2 / (ownedIds(dataA).size + ownedIds(dataB).size) * 100}%` }} />
                <div className="bg-blue-500/60 h-full" style={{ width: `${onlyB.length / (ownedIds(dataA).size + ownedIds(dataB).size) * 100}%` }} />
              </div>
            )}
          </div>

          {/* Both own */}
          {sharedIds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  Both own ({sharedIds.length})
                </p>
              </div>
              <CalcGrid ids={sharedIds} calcs={{ ...dataA.calcs, ...dataB.calcs }} />
            </div>
          )}

          {/* Only A */}
          {onlyA.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <AvatarLabel d={dataA} side="A" />
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest ml-auto">
                  only ({onlyA.length})
                </p>
              </div>
              <CalcGrid ids={onlyA} calcs={dataA.calcs} />
            </div>
          )}

          {/* Only B */}
          {onlyB.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <AvatarLabel d={dataB} side="B" />
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest ml-auto">
                  only ({onlyB.length})
                </p>
              </div>
              <CalcGrid ids={onlyB} calcs={dataB.calcs} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
