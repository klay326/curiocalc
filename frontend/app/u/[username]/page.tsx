'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type UserProfile, type CollectionEntry, type Calculator } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [calcMap, setCalcMap] = useState<Record<string, Calculator>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'owned' | 'wanted'>('owned');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.users.get(username),
      api.collection.forUser(username),
    ])
      .then(async ([p, e]) => {
        setProfile(p);
        setEntries(e);
        // Fetch calculator details for all entries
        const ids = [...new Set(e.map(entry => entry.calculator_id))];
        const calcs = await Promise.all(ids.map(id => api.calculators.get(id).catch(() => null)));
        const map: Record<string, Calculator> = {};
        calcs.forEach(c => { if (c) map[c.id] = c; });
        setCalcMap(map);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="flex gap-4 items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-6 bg-zinc-800 rounded w-40" />
          <div className="h-4 bg-zinc-800 rounded w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({length:8}).map((_,i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="aspect-[4/3] bg-zinc-800 rounded-t-xl" />
            <div className="p-3 space-y-2">
              <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
              <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error || !profile) return (
    <div className="max-w-4xl mx-auto px-4 py-24 text-center">
      <p className="text-zinc-500 font-mono text-sm">{error ?? 'User not found'}</p>
      <Link href="/" className="text-amber-400 font-mono text-xs hover:text-amber-300 mt-2 inline-block">← back home</Link>
    </div>
  );

  const initial = (profile.display_name ?? profile.username).charAt(0).toUpperCase();
  const joinedYear = new Date(profile.created_at).getFullYear();

  const ownedEntries = entries.filter(e => e.status === 'owned');
  const wantedEntries = entries.filter(e => e.status === 'wanted');
  const shown = (tab === 'owned' ? ownedEntries : wantedEntries)
    .map(e => calcMap[e.calculator_id])
    .filter(Boolean) as Calculator[];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-xs text-zinc-500 font-mono hover:text-zinc-300 transition-colors mb-6 inline-block">
        ← back to catalog
      </Link>

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-8">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username}
            className="w-20 h-20 rounded-full border-2 border-zinc-700 object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-amber-900/40 border-2 border-amber-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-amber-400 font-mono">{initial}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-zinc-100 font-mono">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-zinc-500 font-mono text-sm">@{profile.username}</p>
          {profile.bio && (
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs font-mono text-zinc-600">
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                className="text-amber-500/70 hover:text-amber-400">🔗 {profile.website.replace(/^https?:\/\//, '')}</a>
            )}
            <span>joined {joinedYear}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-shrink-0">
          <div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
            <p className="text-2xl font-bold text-amber-400 font-mono">{profile.owned_count}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">owned</p>
          </div>
          <div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
            <p className="text-2xl font-bold text-zinc-300 font-mono">{profile.wanted_count}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">wanted</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {(['owned', 'wanted'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
              tab === t ? 'bg-zinc-700 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            {t} ({t === 'owned' ? ownedEntries.length : wantedEntries.length})
          </button>
        ))}
      </div>

      {/* Collection grid */}
      {shown.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 font-mono">
          <div className="text-4xl mb-3">🧮</div>
          <p className="text-sm">Nothing here yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {shown.map(c => <CalculatorCard key={c.id} calc={c} />)}
        </div>
      )}
    </div>
  );
}
