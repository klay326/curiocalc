'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type UserProfile, type CollectionEntry, type Calculator } from '@/lib/api';
import { CalculatorCard } from '@/components/calculator-card';

export default function WishlistPage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wanted, setWanted] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.users.get(username),
      api.collection.forUser(username),
    ])
      .then(async ([p, entries]) => {
        setProfile(p);
        const wantedEntries = (entries as CollectionEntry[]).filter(e => e.status === 'wanted');
        const calcs = await Promise.all(
          wantedEntries.map(e => api.calculators.get(e.calculator_id).catch(() => null))
        );
        setWanted(calcs.filter(Boolean) as Calculator[]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-64 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({length: 8}).map((_, i) => (
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

  const displayName = profile.display_name ?? profile.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/u/${username}`} className="text-xs text-zinc-500 font-mono hover:text-zinc-300 transition-colors mb-6 inline-block">
        ← back to {displayName}&apos;s profile
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-8">
        <div>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={username}
              className="w-16 h-16 rounded-full border-2 border-zinc-700 object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-900/40 border-2 border-amber-900/50 flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-400 font-mono">{initial}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-zinc-100 font-mono">{displayName}&apos;s wishlist</h1>
          <p className="text-zinc-500 font-mono text-sm">@{username} · {wanted.length} calculator{wanted.length !== 1 ? 's' : ''} wanted</p>
        </div>

        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 hover:border-amber-700/50 text-zinc-400 hover:text-amber-400 rounded-lg font-mono text-xs transition-colors flex-shrink-0"
        >
          {copied ? '✓ copied!' : '🔗 copy link'}
        </button>
      </div>

      {/* Gift hint banner */}
      <div className="mb-6 bg-amber-950/20 border border-amber-900/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl flex-shrink-0">🎁</span>
        <p className="text-xs font-mono text-zinc-400">
          This is <span className="text-zinc-200">{displayName}</span>&apos;s public wishlist.
          Browse the catalog, find something they&apos;re looking for, and surprise them!
        </p>
      </div>

      {/* Grid */}
      {wanted.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 font-mono">
          <div className="text-4xl mb-3">🧮</div>
          <p className="text-sm">No wishlist items yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {wanted.map(c => <CalculatorCard key={c.id} calc={c} />)}
        </div>
      )}
    </div>
  );
}
