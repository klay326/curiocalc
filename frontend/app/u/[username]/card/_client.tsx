'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type UserProfile, type CollectionEntry, type Calculator } from '@/lib/api';

export default function CollectionCardClient({ username }: { username: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calcs, setCalcs] = useState<Calculator[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    Promise.all([
      api.users.get(username),
      api.collection.forUser(username),
    ])
      .then(async ([prof, entries]) => {
        setProfile(prof);
        const owned = entries.filter((e: CollectionEntry) => e.status === 'owned').slice(0, 6);
        if (owned.length > 0) {
          const ids = owned.map((e: CollectionEntry) => e.calculator_id);
          const fetched = await api.calculators.batch(ids).catch(() => []);
          setCalcs(fetched);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  const cardUrl = `https://curiocalc.org/u/${username}/card`;

  const copyLink = () => {
    navigator.clipboard.writeText(cardUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile?.display_name ?? username}'s calculator collection`,
        text: `Check out my vintage calculator collection on CurioCalc!`,
        url: cardUrl,
      }).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const twitterShare = () => {
    const text = encodeURIComponent(`Check out my vintage calculator collection on CurioCalc! ${cardUrl}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-zinc-800 rounded w-1/2" />
              <div className="h-3 bg-zinc-800 rounded w-1/3" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-800 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="aspect-square bg-zinc-800 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-zinc-500 font-mono text-sm">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-600" />

        <div className="p-6 space-y-5">
          {/* User identity */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-900/40 border-2 border-amber-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-amber-400 font-mono">
                    {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
                  </span>
              }
            </div>
            <div className="min-w-0">
              <h1 className="font-bold font-mono text-zinc-100 text-lg truncate">
                {profile.display_name ?? profile.username}
              </h1>
              <p className="text-zinc-500 font-mono text-xs">@{profile.username}</p>
              {profile.bio && (
                <p className="text-zinc-400 font-mono text-xs mt-1 line-clamp-2">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'owned', value: profile.owned_count },
              { label: 'wanted', value: profile.wanted_count },
              { label: 'followers', value: profile.follower_count },
            ].map(s => (
              <div key={s.label} className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-3 text-center">
                <p className="text-xl font-bold font-mono text-amber-400">{s.value}</p>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top calcs */}
          {calcs.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Collection highlights</p>
              <div className="grid grid-cols-3 gap-2">
                {calcs.slice(0, 6).map(c => (
                  <Link key={c.id} href={`/calculators/${c.id}`}
                    className="group aspect-square bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center hover:border-amber-400/50 transition-colors">
                    {c.images[0]
                      ? <img src={c.images[0]} alt={c.model} className="w-full h-full object-contain p-1" />
                      : <span className="text-3xl opacity-20">🧮</span>
                    }
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Branding + member since */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-600">
              CurioCalc · member since {new Date(profile.created_at).getFullYear()}
            </span>
            <span className="text-amber-400 font-mono text-xs font-bold">curiocalc.org</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4 justify-center flex-wrap">
        <Link href={`/u/${username}`}
          className="px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors">
          View full profile →
        </Link>
        <button
          onClick={nativeShare}
          className="px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors"
        >
          {shared ? '✓ Shared!' : '↑ Share'}
        </button>
        <button
          onClick={copyLink}
          className="px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors"
        >
          {copied ? '✓ Copied!' : '🔗 Copy link'}
        </button>
        <button
          onClick={twitterShare}
          className="px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg font-mono text-sm hover:bg-zinc-700 transition-colors"
        >
          Post to X
        </button>
      </div>
    </div>
  );
}
