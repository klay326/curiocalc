'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type UserProfile, type CollectionEntry, type Calculator } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CalculatorCard } from '@/components/calculator-card';

type Tab = 'owned' | 'wanted' | 'for_sale';

type Badge = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  color: string;
};

function computeBadges(entries: CollectionEntry[], calcMap: Record<string, Calculator>): Badge[] {
  const owned  = entries.filter(e => e.status === 'owned');
  const wanted = entries.filter(e => e.status === 'wanted');
  const ownedCalcs = owned.map(e => calcMap[e.calculator_id]).filter(Boolean);

  const badges: Badge[] = [];

  if (owned.length >= 1)
    badges.push({ id: 'first_pick', emoji: '🧮', label: 'First Pick', desc: 'Added first calculator to collection', color: 'border-zinc-700 text-zinc-400' });

  if (owned.length >= 10)
    badges.push({ id: 'collector', emoji: '📚', label: 'Collector', desc: 'Own 10+ calculators', color: 'border-amber-800/60 text-amber-400' });

  if (owned.length >= 50)
    badges.push({ id: 'serious', emoji: '🏆', label: 'Serious Collector', desc: 'Own 50+ calculators', color: 'border-amber-600/70 text-amber-300' });

  if (owned.length >= 100)
    badges.push({ id: 'hoarder', emoji: '🌟', label: 'Legend', desc: 'Own 100+ calculators', color: 'border-yellow-500/70 text-yellow-300' });

  if (ownedCalcs.some(c => c.rarity_score != null && c.rarity_score >= 9))
    badges.push({ id: 'rare_find', emoji: '💎', label: 'Rare Find', desc: 'Own a rarity 9+ calculator', color: 'border-cyan-700/60 text-cyan-400' });

  if (ownedCalcs.some(c => c.weirdness_score != null && c.weirdness_score >= 8))
    badges.push({ id: 'weird_taste', emoji: '🌀', label: 'Weird Taste', desc: 'Own a weirdness 8+ calculator', color: 'border-pink-700/60 text-pink-400' });

  // Brand loyalist: 5+ from same brand
  const brandCounts: Record<string, number> = {};
  ownedCalcs.forEach(c => { brandCounts[c.make] = (brandCounts[c.make] ?? 0) + 1; });
  const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];
  if (topBrand && topBrand[1] >= 5)
    badges.push({ id: 'loyalist', emoji: '🏭', label: 'Brand Loyalist', desc: `Own 5+ ${topBrand[0]} calculators`, color: 'border-purple-700/60 text-purple-400' });

  // Vintage: own a pre-1975 calculator
  if (ownedCalcs.some(c => c.year_introduced != null && c.year_introduced < 1975))
    badges.push({ id: 'vintage', emoji: '📅', label: 'Vintage', desc: 'Own a calculator made before 1975', color: 'border-orange-700/60 text-orange-400' });

  // Wishlist: 10+ items on wishlist
  if (wanted.length >= 10)
    badges.push({ id: 'dreamer', emoji: '⭐', label: 'Dreamer', desc: '10+ calculators on wishlist', color: 'border-blue-700/60 text-blue-400' });

  // Diverse: own 5+ different types
  const types = new Set(ownedCalcs.map(c => c.calc_type));
  if (types.size >= 5)
    badges.push({ id: 'diverse', emoji: '🎨', label: 'Diverse Taste', desc: 'Own 5+ calculator types', color: 'border-green-700/60 text-green-400' });

  // Seller: has for_sale items
  if (entries.some(e => e.status === 'for_sale'))
    badges.push({ id: 'seller', emoji: '🏷', label: 'Seller', desc: 'Has listed calculators for sale', color: 'border-green-800/60 text-green-500' });

  return badges;
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [calcMap, setCalcMap] = useState<Record<string, Calculator>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('owned');
  const [wishlistCopied, setWishlistCopied] = useState(false);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.users.get(username),
      api.collection.forUser(username),
    ])
      .then(async ([p, e]) => {
        setProfile(p);
        setFollowing(p.is_following);
        setFollowerCount(p.follower_count);
        setEntries(e);
        const ids = [...new Set(e.map(entry => entry.calculator_id))];
        const calcs = await api.calculators.batch(ids).catch(() => []);
        const map: Record<string, Calculator> = {};
        calcs.forEach(c => { map[c.id] = c; });
        setCalcMap(map);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  const toggleFollow = async () => {
    if (!me) return;
    setFollowLoading(true);
    try {
      if (following) {
        await api.users.unfollow(username);
        setFollowing(false);
        setFollowerCount(n => n - 1);
      } else {
        await api.users.follow(username);
        setFollowing(true);
        setFollowerCount(n => n + 1);
      }
    } catch (e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  const copyWishlistLink = () => {
    const url = `${window.location.origin}/u/${username}/wishlist`;
    navigator.clipboard.writeText(url).then(() => {
      setWishlistCopied(true);
      setTimeout(() => setWishlistCopied(false), 2000);
    });
  };

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

  const isOwn = me?.username === username;
  const initial = (profile.display_name ?? profile.username).charAt(0).toUpperCase();
  const joinedYear = new Date(profile.created_at).getFullYear();
  const badges = computeBadges(entries, calcMap);

  const ownedEntries   = entries.filter(e => e.status === 'owned');
  const wantedEntries  = entries.filter(e => e.status === 'wanted');
  const forSaleEntries = entries.filter(e => e.status === 'for_sale');

  const shownEntries = tab === 'owned' ? ownedEntries : tab === 'wanted' ? wantedEntries : forSaleEntries;
  const shown = shownEntries
    .map(e => ({ entry: e, calc: calcMap[e.calculator_id] }))
    .filter(({ calc }) => Boolean(calc)) as { entry: CollectionEntry; calc: Calculator }[];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-xs text-zinc-500 font-mono hover:text-zinc-300 transition-colors">
          ← back to catalog
        </Link>
        {isOwn ? (
          <Link href="/settings"
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors">
            ⚙ Edit profile
          </Link>
        ) : me && (
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className={`text-xs font-mono px-4 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              following
                ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/50'
                : 'bg-amber-400 text-zinc-950 border-amber-400 hover:bg-amber-300 font-bold'
            }`}>
            {followLoading ? '…' : following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-6">
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
        <div className="flex gap-3 flex-shrink-0 flex-wrap">
          <div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-amber-400 font-mono">{profile.owned_count}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">owned</p>
          </div>
          <div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-zinc-300 font-mono">{profile.wanted_count}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">wanted</p>
          </div>
          <div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-zinc-300 font-mono">{followerCount}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">followers</p>
          </div>
          <div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-zinc-300 font-mono">{profile.following_count}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">following</p>
          </div>
          {forSaleEntries.length > 0 && (
            <div className="text-center bg-zinc-900 border border-green-900/40 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-green-400 font-mono">{forSaleEntries.length}</p>
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">for sale</p>
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map(badge => (
              <div
                key={badge.id}
                className="relative"
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
              >
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs cursor-default select-none bg-zinc-900/60 ${badge.color}`}>
                  <span>{badge.emoji}</span>
                  <span className="font-bold">{badge.label}</span>
                </div>
                {hoveredBadge === badge.id && (
                  <div className="absolute bottom-full left-0 mb-1.5 z-10 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
                    <p className="text-[11px] font-mono text-zinc-300">{badge.desc}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['owned', 'wanted'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                tab === t ? 'bg-zinc-700 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {t} ({t === 'owned' ? ownedEntries.length : wantedEntries.length})
            </button>
          ))}
          {forSaleEntries.length > 0 && (
            <button onClick={() => setTab('for_sale')}
              className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                tab === 'for_sale' ? 'bg-green-900/60 text-green-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              for sale ({forSaleEntries.length})
            </button>
          )}
        </div>

        {wantedEntries.length > 0 && (
          <button
            onClick={copyWishlistLink}
            className="text-xs font-mono text-zinc-500 hover:text-amber-400 border border-zinc-700 hover:border-amber-700/50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {wishlistCopied ? '✓ link copied!' : '🔗 share wishlist'}
          </button>
        )}
      </div>

      {/* For sale banner */}
      {tab === 'for_sale' && forSaleEntries.length > 0 && (
        <div className="mb-4 bg-green-950/20 border border-green-900/30 rounded-xl px-4 py-3">
          <p className="text-xs font-mono text-green-400">
            🏷 {profile.display_name ?? profile.username} has {forSaleEntries.length} calculator{forSaleEntries.length !== 1 ? 's' : ''} for sale.
            {' '}Check the notes on each item or contact them to arrange a trade.
          </p>
        </div>
      )}

      {/* Collection grid */}
      {shown.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 font-mono">
          <div className="text-4xl mb-3">🧮</div>
          <p className="text-sm">Nothing here yet.</p>
          {tab === 'wanted' && isOwn && (
            <p className="text-xs text-zinc-700 mt-2">Browse the catalog and click &quot;I want this&quot; to add items.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {shown.map(({ entry, calc }) => (
            <div key={entry.id} className="relative">
              <CalculatorCard
                calc={calc}
                isAdmin={me?.is_superuser}
                onRemoveImage={me?.is_superuser && calc.images.length > 0 ? async () => {
                  const newImages = calc.images.slice(1);
                  const updated = await api.calculators.update(calc.id, { images: newImages } as Partial<Calculator>);
                  setCalcMap(prev => ({ ...prev, [updated.id]: updated }));
                } : undefined}
              />
              {tab === 'for_sale' && (
                <div className="mt-1.5 px-2">
                  <span className="text-[10px] font-mono text-green-400 bg-green-950/30 border border-green-900/40 px-1.5 py-0.5 rounded">
                    for sale
                  </span>
                  {entry.notes && (
                    <p className="text-[10px] font-mono text-zinc-500 mt-1 leading-snug">{entry.notes}</p>
                  )}
                </div>
              )}
              {tab === 'owned' && entry.condition && (
                <div className="absolute top-2 left-2 pointer-events-none">
                  <span className="text-[9px] font-mono bg-zinc-950/80 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {entry.condition}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
