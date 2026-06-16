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

function computeBadges(entries: CollectionEntry[], calcMap: Record<string, Calculator>, profile: UserProfile): Badge[] {
  const owned     = entries.filter(e => e.status === 'owned');
  const wanted    = entries.filter(e => e.status === 'wanted');
  const forSale   = entries.filter(e => e.status === 'for_sale');
  const ownedCalcs = owned.map(e => calcMap[e.calculator_id]).filter(Boolean);

  const badges: Badge[] = [];
  const b = (id: string, emoji: string, label: string, desc: string, color: string) =>
    badges.push({ id, emoji, label, desc, color });

  // ── Collection size ──────────────────────────────────────────────
  if (owned.length >= 1)   b('first_pick', '🧮', 'First Pick',        'Added first calculator to collection',  'border-zinc-700 text-zinc-400');
  if (owned.length >= 10)  b('collector',  '📚', 'Collector',          'Own 10+ calculators',                   'border-amber-800/60 text-amber-400');
  if (owned.length >= 25)  b('enthusiast', '📦', 'Enthusiast',         'Own 25+ calculators',                   'border-amber-700/60 text-amber-400');
  if (owned.length >= 50)  b('serious',    '🏆', 'Serious Collector',  'Own 50+ calculators',                   'border-amber-600/70 text-amber-300');
  if (owned.length >= 100) b('legend',     '🌟', 'Legend',             'Own 100+ calculators',                  'border-yellow-500/70 text-yellow-300');
  if (owned.length >= 250) b('archivist',  '🗄',  'Archivist',          'Own 250+ calculators',                  'border-yellow-400/80 text-yellow-200');
  if (owned.length >= 500) b('museum',     '🏛',  'Museum',             'Own 500+ calculators',                  'border-white/30 text-white');

  // ── Rarity & weirdness ───────────────────────────────────────────
  const rareOwned = ownedCalcs.filter(c => c.rarity_score != null && c.rarity_score >= 8);
  if (rareOwned.length >= 1) b('rare_find',  '💎', 'Rare Find',   'Own a rarity 8+ calculator',         'border-cyan-700/60 text-cyan-400');
  if (rareOwned.length >= 3) b('diamond',    '💠', 'Diamond',     'Own 3+ rarity 8+ calculators',       'border-cyan-400/70 text-cyan-300');
  if (ownedCalcs.some(c => c.rarity_score != null && c.rarity_score >= 9.5))
    b('unobtainium', '🌌', 'Unobtainium', 'Own a near-mythical rarity 9.5+ calc', 'border-indigo-400/70 text-indigo-300');

  const weirdOwned = ownedCalcs.filter(c => c.weirdness_score != null && c.weirdness_score >= 8);
  if (weirdOwned.length >= 1) b('weird_taste', '🌀', 'Weird Taste',   'Own a weirdness 8+ calculator',    'border-pink-700/60 text-pink-400');
  if (weirdOwned.length >= 3) b('chaos_agent', '🤪', 'Chaos Agent',   'Own 3+ weirdness 8+ calculators',  'border-pink-500/70 text-pink-300');

  // ── Display types ────────────────────────────────────────────────
  if (ownedCalcs.some(c => c.display_type?.toLowerCase().includes('led')))
    b('led_hunter',  '💡', 'LED Hunter',       'Own an LED display calculator',  'border-red-700/60 text-red-400');
  if (ownedCalcs.some(c => c.display_type?.toLowerCase().includes('vfd')))
    b('vfd_collector','🌟', 'VFD Collector',   'Own a VFD display calculator',   'border-teal-700/60 text-teal-400');
  if (ownedCalcs.some(c => c.display_type?.toLowerCase().includes('nixie')))
    b('nixie_hoarder','🔮', 'Nixie Hoarder',   'Own a Nixie tube calculator',    'border-orange-600/60 text-orange-300');
  if (ownedCalcs.some(c => c.display_type?.toLowerCase().includes('panaplex') || c.display_type?.toLowerCase().includes('fluorescent')))
    b('plasma',      '⚡', 'Plasma Fan',       'Own a Panaplex/fluorescent calc', 'border-violet-600/60 text-violet-400');

  // ── Brands ───────────────────────────────────────────────────────
  const brandCounts: Record<string, number> = {};
  ownedCalcs.forEach(c => { brandCounts[c.make] = (brandCounts[c.make] ?? 0) + 1; });
  const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];
  const brandCount = Object.keys(brandCounts).length;
  if (topBrand && topBrand[1] >= 5)  b('loyalist',  '🏭', 'Brand Loyalist',  `Own 5+ ${topBrand[0]} calculators`,   'border-purple-700/60 text-purple-400');
  if (topBrand && topBrand[1] >= 15) b('devotee',   '🎯', 'Brand Devotee',   `Own 15+ ${topBrand[0]} calculators`,  'border-purple-500/70 text-purple-300');
  if (brandCount >= 10) b('explorer',  '🗺',  'Brand Explorer',  'Own calcs from 10+ different brands', 'border-green-700/60 text-green-400');
  if (brandCount >= 20) b('connoisseur','🎓', 'Connoisseur',     'Own calcs from 20+ different brands', 'border-green-500/70 text-green-300');

  // ── Eras & history ───────────────────────────────────────────────
  if (ownedCalcs.some(c => c.year_introduced != null && c.year_introduced < 1975))
    b('vintage', '📅', 'Vintage',  'Own a calculator made before 1975', 'border-orange-700/60 text-orange-400');
  if (ownedCalcs.some(c => c.year_introduced != null && c.year_introduced < 1970))
    b('pioneer', '🦕', 'Pioneer',  'Own a pre-1970 calculator',         'border-orange-600/70 text-orange-300');
  if (ownedCalcs.some(c => c.year_introduced != null && c.year_introduced < 1965))
    b('relic',   '🏺', 'Relic',    'Own a pre-1965 calculator',         'border-amber-500/70 text-amber-200');

  const decades = new Set(ownedCalcs.filter(c => c.year_introduced).map(c => Math.floor(c.year_introduced! / 10) * 10));
  if (decades.size >= 4) b('decade_hopper', '🕰', 'Decade Hopper', 'Own calcs from 4+ different decades', 'border-indigo-700/60 text-indigo-400');
  if (decades.size >= 6) b('time_traveler', '⏳', 'Time Traveler', 'Own calcs from 6+ different decades', 'border-indigo-500/70 text-indigo-300');

  const eighties = ownedCalcs.filter(c => c.year_introduced != null && c.year_introduced >= 1980 && c.year_introduced < 1990);
  if (eighties.length >= 5) b('eighties_kid', '📺', '80s Kid', 'Own 5+ calculators from the 1980s', 'border-fuchsia-700/60 text-fuchsia-400');

  // ── Calc types ───────────────────────────────────────────────────
  const types = new Set(ownedCalcs.map(c => c.calc_type));
  if (types.size >= 5) b('diverse',   '🎨', 'Diverse Taste',   'Own 5+ calculator types',    'border-green-700/60 text-green-400');
  if (types.size >= 8) b('generalist','🌐', 'Generalist',      'Own 8+ calculator types',    'border-green-500/60 text-green-300');

  const scientificCount = ownedCalcs.filter(c => c.calc_type === 'scientific').length;
  if (scientificCount >= 10) b('scientist', '🔬', 'Scientist', 'Own 10+ scientific calculators', 'border-blue-700/60 text-blue-400');

  const financialCount = ownedCalcs.filter(c => c.calc_type === 'financial').length;
  if (financialCount >= 3) b('money_talks', '💰', 'Money Talks', 'Own 3+ financial calculators', 'border-emerald-700/60 text-emerald-400');

  const pocketCount = ownedCalcs.filter(c => c.calc_type === 'pocket').length;
  if (pocketCount >= 5) b('pocket_rocket', '📱', 'Pocket Rocket', 'Own 5+ pocket calculators', 'border-sky-700/60 text-sky-400');

  const graphingCount = ownedCalcs.filter(c => c.calc_type === 'graphing').length;
  if (graphingCount >= 5) b('graph_head', '📈', 'Graph Head', 'Own 5+ graphing calculators', 'border-violet-700/60 text-violet-400');

  const printingCount = ownedCalcs.filter(c => c.calc_type === 'printing').length;
  if (printingCount >= 3) b('printer', '🖨', 'Print Gang', 'Own 3+ printing calculators', 'border-zinc-600/60 text-zinc-400');

  // ── Power source ─────────────────────────────────────────────────
  if (ownedCalcs.some(c => c.power_source?.toLowerCase().includes('solar')))
    b('solar', '☀️', 'Solar Powered', 'Own a solar-powered calculator', 'border-yellow-600/60 text-yellow-400');

  // ── Geography ────────────────────────────────────────────────────
  const countries = new Set(ownedCalcs.filter(c => c.country_of_origin).map(c => c.country_of_origin!));
  if (countries.size >= 5)  b('globetrotter', '🌍', 'Globetrotter',  'Own calcs from 5+ countries',  'border-blue-600/60 text-blue-400');
  if (countries.size >= 10) b('world_tour',   '✈️', 'World Tour',    'Own calcs from 10+ countries', 'border-blue-400/70 text-blue-300');

  // ── Condition ────────────────────────────────────────────────────
  const mintOwned = owned.filter(e => e.condition === 'mint');
  if (mintOwned.length >= 5) b('mint_collector', '✨', 'Mint Collector', 'Own 5+ calculators in mint condition', 'border-teal-600/60 text-teal-400');
  if (owned.some(e => e.condition === 'poor'))
    b('rescue_mission', '🔧', 'Rescue Mission', 'Own a calculator saved from poor condition', 'border-zinc-600/60 text-zinc-500');

  // ── Photos & docs ────────────────────────────────────────────────
  const withPhotos = owned.filter(e => e.photos && e.photos.length > 0);
  if (withPhotos.length >= 5)  b('documentarian', '📸', 'Documentarian', 'Photographed 5+ collection items',   'border-zinc-600/60 text-zinc-400');
  if (withPhotos.length >= 20) b('archivist_photo','🗂',  'Archivist',     'Photographed 20+ collection items',  'border-zinc-500/60 text-zinc-300');

  // ── Trading & selling ────────────────────────────────────────────
  if (forSale.length >= 1) b('seller',     '🏷',  'Seller',      'Has listed calculators for sale',   'border-green-800/60 text-green-500');
  if (forSale.length >= 5) b('shopkeeper', '🏪', 'Shop Keeper', 'Has 5+ calculators listed for sale', 'border-green-600/60 text-green-400');
  if (entries.some(e => e.status === 'traded_away'))
    b('trader', '🔄', 'Trader', 'Has traded at least one calculator', 'border-blue-700/60 text-blue-400');

  // ── Wishlist ─────────────────────────────────────────────────────
  if (wanted.length >= 10)  b('dreamer',    '⭐', 'Dreamer',    '10+ calculators on wishlist',  'border-blue-700/60 text-blue-400');
  if (wanted.length >= 25)  b('big_dreams', '🌠', 'Big Dreams', '25+ calculators on wishlist',  'border-blue-500/70 text-blue-300');
  if (wanted.length >= 50)  b('obsessed',   '🌊', 'Obsessed',   '50+ calculators on wishlist',  'border-blue-400/70 text-blue-200');

  // ── Account milestone ────────────────────────────────────────────
  const joinedDaysAgo = (Date.now() - new Date(profile.created_at).getTime()) / 86400000;
  if (joinedDaysAgo >= 365) b('veteran', '🎖', 'Veteran', 'Member for over a year',   'border-amber-700/60 text-amber-400');
  if (joinedDaysAgo >= 730) b('elder',   '👑', 'Elder',   'Member for over 2 years',  'border-amber-500/70 text-amber-300');
  if (joinedDaysAgo >= 30 && joinedDaysAgo <= 90)
    b('fresh',  '🌱', 'Fresh Meat', 'Brand new to the community', 'border-lime-700/60 text-lime-400');

  // ── Acquisition stories ──────────────────────────────────────────
  const withNotes = owned.filter(e => e.notes && e.notes.trim().length > 20);
  if (withNotes.length >= 5)  b('storyteller', '📖', 'Storyteller',    'Added notes to 5+ collection entries',  'border-rose-700/60 text-rose-400');
  if (withNotes.length >= 20) b('chronicler',  '📜', 'Chronicler',     'Added notes to 20+ collection entries', 'border-rose-500/70 text-rose-300');

  const withPrice = owned.filter(e => e.acquired_price != null && e.acquired_price > 0);
  if (withPrice.length >= 10) b('accountant', '🧾', 'Accountant', 'Tracked purchase price on 10+ items', 'border-emerald-700/60 text-emerald-400');

  const bigSpend = owned.find(e => e.acquired_price != null && e.acquired_price >= 500);
  if (bigSpend) b('high_roller', '💸', 'High Roller', 'Paid $500+ for a single calculator', 'border-yellow-600/60 text-yellow-400');

  const budget = owned.find(e => e.acquired_price != null && e.acquired_price <= 1 && e.acquired_price > 0);
  if (budget) b('bargain_hunter', '🤑', 'Bargain Hunter', 'Snagged a calc for under $1', 'border-lime-600/60 text-lime-400');

  // ── Condition spectrum ───────────────────────────────────────────
  const conditionSet = new Set(owned.map(e => e.condition).filter(Boolean));
  if (conditionSet.size >= 4) b('all_conditions', '📊', 'All States', 'Own calcs in 4+ different conditions', 'border-zinc-600/60 text-zinc-400');

  const excellentPlus = owned.filter(e => e.condition === 'mint' || e.condition === 'excellent');
  if (excellentPlus.length >= 20) b('curator', '🖼', 'Curator', 'Keep 20+ calcs in excellent/mint condition', 'border-teal-500/70 text-teal-300');

  // ── Calc type deep-dives ─────────────────────────────────────────
  const programmableCount = ownedCalcs.filter(c => c.calc_type === 'programmable').length;
  if (programmableCount >= 3) b('programmer', '💾', 'Programmer', 'Own 3+ programmable calculators', 'border-cyan-700/60 text-cyan-400');

  const watchCount = ownedCalcs.filter(c => c.calc_type === 'watch').length;
  if (watchCount >= 1) b('time_keeper', '⌚', 'Time Keeper', 'Own a calculator watch', 'border-slate-600/60 text-slate-400');

  const noveltyCount = ownedCalcs.filter(c => c.calc_type === 'novelty').length;
  if (noveltyCount >= 1) b('novelty_fan', '🎪', 'Novelty Fan', 'Own a novelty calculator', 'border-fuchsia-700/60 text-fuchsia-400');
  if (noveltyCount >= 5) b('carnival',    '🎠', 'Carnival',    'Own 5+ novelty calculators', 'border-fuchsia-500/70 text-fuchsia-300');

  const desktopCount = ownedCalcs.filter(c => c.calc_type === 'desktop').length;
  if (desktopCount >= 3) b('desk_jockey', '🖥', 'Desk Jockey', 'Own 3+ desktop calculators', 'border-slate-700/60 text-slate-400');

  const mechanicalCount = ownedCalcs.filter(c => c.calc_type === 'mechanical').length;
  if (mechanicalCount >= 1) b('mechanic', '⚙️', 'Mechanic', 'Own a mechanical calculator', 'border-stone-600/60 text-stone-400');
  if (mechanicalCount >= 3) b('clockwork', '🔩', 'Clockwork', 'Own 3+ mechanical calculators', 'border-stone-500/60 text-stone-300');

  // ── Display type completionist ───────────────────────────────────
  const hasLED   = ownedCalcs.some(c => c.display_type?.toLowerCase().includes('led'));
  const hasLCD   = ownedCalcs.some(c => c.display_type?.toLowerCase().includes('lcd'));
  const hasVFD   = ownedCalcs.some(c => c.display_type?.toLowerCase().includes('vfd'));
  const hasNixie = ownedCalcs.some(c => c.display_type?.toLowerCase().includes('nixie'));
  if (hasLED && hasLCD && hasVFD) b('display_trio',  '🖲',  'Display Trio',         'Own LED, LCD, and VFD calcs',            'border-teal-600/60 text-teal-400');
  if (hasLED && hasLCD && hasVFD && hasNixie)
    b('display_master', '🎛', 'Display Master', 'Own LED, LCD, VFD, and Nixie calcs', 'border-teal-400/70 text-teal-200');

  // ── Tags & special ───────────────────────────────────────────────
  const spaceCals = ownedCalcs.filter(c => c.tags?.includes('space') || c.tags?.includes('nasa') || c.tags?.includes('apollo'));
  if (spaceCals.length >= 1) b('space_cadet', '🚀', 'Space Cadet', 'Own a calculator with space heritage', 'border-indigo-600/60 text-indigo-400');

  const militaryCals = ownedCalcs.filter(c => c.tags?.includes('military'));
  if (militaryCals.length >= 1) b('field_ops', '🎖', 'Field Ops', 'Own a military-issued calculator', 'border-olive-600/60 text-stone-400');

  const limitedCals = ownedCalcs.filter(c => c.tags?.includes('limited') || c.tags?.includes('limited-edition'));
  if (limitedCals.length >= 1) b('limited_edition', '🎫', 'Limited Edition', 'Own a limited-edition calculator', 'border-rose-600/60 text-rose-400');

  // ── Decade completionist ─────────────────────────────────────────
  const has60s = ownedCalcs.some(c => c.year_introduced != null && c.year_introduced >= 1960 && c.year_introduced < 1970);
  const has70s = ownedCalcs.some(c => c.year_introduced != null && c.year_introduced >= 1970 && c.year_introduced < 1980);
  const has80s = ownedCalcs.some(c => c.year_introduced != null && c.year_introduced >= 1980 && c.year_introduced < 1990);
  const has90s = ownedCalcs.some(c => c.year_introduced != null && c.year_introduced >= 1990 && c.year_introduced < 2000);
  const has00s = ownedCalcs.some(c => c.year_introduced != null && c.year_introduced >= 2000 && c.year_introduced < 2010);
  if (has60s && has70s && has80s && has90s) b('four_decades',  '📆', 'Four Decades',  'Own calcs from the 60s, 70s, 80s & 90s', 'border-violet-600/60 text-violet-400');
  if (has60s && has70s && has80s && has90s && has00s)
    b('five_decades', '🗓', 'Five Decades', 'Own calcs from 5 consecutive decades', 'border-violet-400/70 text-violet-300');

  // ── Power source variety ─────────────────────────────────────────
  const powerSources = new Set(ownedCalcs.filter(c => c.power_source).map(c => c.power_source!.toLowerCase().split(/[,/]/)[0].trim()));
  if (powerSources.size >= 3) b('power_hungry', '🔌', 'Power Hungry', 'Own calcs with 3+ different power sources', 'border-yellow-700/60 text-yellow-400');

  const batteryCalc = ownedCalcs.some(c => c.power_source?.toLowerCase().includes('battery') || c.power_source?.toLowerCase().includes('aa') || c.power_source?.toLowerCase().includes('aaa'));
  const acCalc = ownedCalcs.some(c => c.power_source?.toLowerCase().includes('ac') || c.power_source?.toLowerCase().includes('mains') || c.power_source?.toLowerCase().includes('plug'));
  if (batteryCalc && acCalc && ownedCalcs.some(c => c.power_source?.toLowerCase().includes('solar')))
    b('off_grid', '⚡', 'Off Grid', 'Own battery, solar, and AC-powered calcs', 'border-lime-600/60 text-lime-400');

  // ── Wishlist hunger ───────────────────────────────────────────────
  if (wanted.length >= 100) b('collector_in_waiting', '🌀', 'Collector in Waiting', '100+ items on the wishlist', 'border-indigo-500/60 text-indigo-300');

  // ── Social ────────────────────────────────────────────────────────
  if (profile.follower_count >= 10)  b('recognized',  '👥', 'Recognized',   '10+ followers',  'border-sky-700/60 text-sky-400');
  if (profile.follower_count >= 50)  b('influencer',  '📣', 'Influencer',   '50+ followers',  'border-sky-500/70 text-sky-300');
  if (profile.follower_count >= 100) b('celebrity',   '⭐', 'Celebrity',    '100+ followers', 'border-sky-400/70 text-sky-200');
  if (profile.following_count >= 25) b('social',      '🤝', 'Social',       'Following 25+ collectors', 'border-green-700/60 text-green-400');

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
        // Batch fetch all collection calcs + showcase calcs
        const collectionIds = [...new Set(e.map(entry => entry.calculator_id))];
        const allIds = [...new Set([...collectionIds, ...(p.showcase_ids ?? [])])];
        const calcs = await api.calculators.batch(allIds).catch(() => []);
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
  const badges = computeBadges(entries, calcMap, profile);

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

      {/* Showcase */}
      {(profile.showcase_ids?.length ?? 0) > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Showcase</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(profile.showcase_ids ?? []).map(id => {
              const c = calcMap[id];
              if (!c) return null;
              return (
                <Link key={id} href={`/calculators/${id}`} className="group bg-zinc-900 border border-amber-900/30 hover:border-amber-400/40 rounded-xl overflow-hidden transition-colors">
                  <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {c.images[0]
                      ? <img src={c.images[0]} alt={c.model} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      : <span className="text-2xl opacity-20">🧮</span>}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[9px] font-mono text-zinc-600 truncate">{c.make}</p>
                    <p className="text-[10px] font-bold font-mono text-zinc-300 group-hover:text-amber-400 transition-colors truncate">{c.model}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Shelf photos */}
      {profile.collection_photos?.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Shelf</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {profile.collection_photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors">
                <img src={url} alt={`shelf photo ${i + 1}`} className="w-full h-full object-cover" />
              </a>
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
