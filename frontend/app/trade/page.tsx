'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type ForSaleListing, type WantedListing } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const CONDITION_COLORS: Record<string, string> = {
  mint:      'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  excellent: 'text-blue-400 bg-blue-950/40 border-blue-900/50',
  good:      'text-amber-400 bg-amber-950/40 border-amber-900/50',
  fair:      'text-orange-400 bg-orange-950/40 border-orange-900/50',
  poor:      'text-red-400 bg-red-950/40 border-red-900/50',
};

function MessageModal({ toUsername, calcId, calcName, onClose }: {
  toUsername: string;
  calcId: string;
  calcName: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const send = async () => {
    if (!body.trim()) return;
    if (!user) { router.push('/login'); return; }
    setSending(true);
    setError(null);
    try {
      await api.messages.send({ recipient_username: toUsername, body: body.trim(), calc_id: calcId });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-mono font-bold text-zinc-100">Message seller</h3>
            <p className="text-zinc-500 font-mono text-xs mt-0.5">@{toUsername} · {calcName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-xl leading-none">✕</button>
        </div>
        {done ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-zinc-200 font-mono text-sm">Message sent!</p>
            <div className="flex gap-3 mt-4 justify-center">
              <button onClick={onClose}
                className="px-4 py-2 bg-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                Close
              </button>
              <Link href="/messages"
                className="px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg font-mono text-sm font-bold hover:bg-amber-300 transition-colors">
                View messages →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="text-red-400 font-mono text-xs mb-3">{error}</p>}
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder={`Hi @${toUsername}, I'm interested in your ${calcName}…`}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-400 rounded-lg font-mono text-sm border border-zinc-700 hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button onClick={send} disabled={sending || !body.trim()}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-mono text-sm font-bold hover:bg-green-500 transition-colors disabled:opacity-50">
                {sending ? 'Sending…' : '✉ Send message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TradePage() {
  const [tab, setTab] = useState<'for_sale' | 'wanted'>('for_sale');
  const [listings, setListings] = useState<ForSaleListing[]>([]);
  const [wanted, setWanted] = useState<WantedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [messageTarget, setMessageTarget] = useState<{ username: string; calcId: string; calcName: string } | null>(null);

  useEffect(() => {
    Promise.all([api.trade.listings(), api.trade.wanted()])
      .then(([l, w]) => { setListings(l); setWanted(w); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredListings = listings.filter(l => {
    if (!query) return true;
    const q = query.toLowerCase();
    return l.make.toLowerCase().includes(q) || l.model.toLowerCase().includes(q) ||
      l.seller_username.toLowerCase().includes(q) || (l.notes ?? '').toLowerCase().includes(q);
  });

  const filteredWanted = wanted.filter(w => {
    if (!query) return true;
    const q = query.toLowerCase();
    return w.make.toLowerCase().includes(q) || w.model.toLowerCase().includes(q) ||
      w.wisher_username.toLowerCase().includes(q);
  });

  // Group wanted by calc for demand view
  const demandMap: Record<string, { listing: WantedListing; count: number }> = {};
  for (const w of wanted) {
    if (!demandMap[w.calculator_id]) demandMap[w.calculator_id] = { listing: w, count: 0 };
    demandMap[w.calculator_id].count++;
  }
  const demand = Object.values(demandMap).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {messageTarget && (
        <MessageModal
          toUsername={messageTarget.username}
          calcId={messageTarget.calcId}
          calcName={messageTarget.calcName}
          onClose={() => setMessageTarget(null)}
        />
      )}

      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← back</Link>
        <div className="flex items-end gap-4 mt-3">
          <h1 className="text-3xl font-bold font-mono text-green-400">🏷 Trade board</h1>
        </div>
        <p className="text-zinc-600 font-mono text-xs mt-1">
          Community listings — calculators for sale, and what people are looking for.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('for_sale')}
          className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
            tab === 'for_sale' ? 'bg-green-900/60 text-green-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}>
          🏷 For Sale ({listings.length})
        </button>
        <button onClick={() => setTab('wanted')}
          className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
            tab === 'wanted' ? 'bg-amber-900/40 text-amber-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}>
          ⭐ Wanted ({wanted.length})
        </button>
      </div>

      <input
        type="text"
        placeholder={tab === 'for_sale' ? 'Search listings…' : 'Search wanted calcs…'}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-green-500 transition-colors mb-8"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse flex gap-4">
              <div className="w-16 h-16 bg-zinc-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-1/4" />
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'for_sale' ? (
        filteredListings.length === 0 ? (
          <div className="text-center py-24 text-zinc-600 font-mono">
            <div className="text-5xl mb-4">🏷</div>
            <p className="text-sm">{query ? `No listings match "${query}"` : 'No listings yet.'}</p>
            {!query && <Link href="/collection" className="text-green-400 hover:text-green-300 text-xs mt-3 inline-block">Go to my collection →</Link>}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map(listing => (
              <div key={listing.entry_id}
                className="bg-zinc-900 border border-zinc-800 hover:border-green-900/50 rounded-xl p-4 flex gap-4 transition-colors">
                <Link href={`/calculators/${listing.calculator_id}`} className="flex-shrink-0">
                  <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                    {listing.images[0]
                      ? <img src={listing.images[0]} alt={listing.model} className="w-full h-full object-contain" />
                      : <span className="text-2xl opacity-20">🧮</span>}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-600 font-mono">{listing.make}</p>
                      <Link href={`/calculators/${listing.calculator_id}`}>
                        <p className="font-bold font-mono text-zinc-100 hover:text-green-400 transition-colors truncate">{listing.model}</p>
                      </Link>
                    </div>
                    {listing.acquired_price != null && (
                      <span className="text-sm font-bold font-mono text-green-400 flex-shrink-0">${listing.acquired_price}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {listing.condition && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono capitalize ${CONDITION_COLORS[listing.condition] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                        {listing.condition}
                      </span>
                    )}
                    {listing.year_introduced && <span className="text-[10px] text-zinc-600 font-mono">{listing.year_introduced}</span>}
                  </div>
                  {listing.notes && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{listing.notes}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <Link href={`/u/${listing.seller_username}`}
                      className="text-[11px] font-mono text-zinc-500 hover:text-amber-400 transition-colors">
                      @{listing.seller_username}
                    </Link>
                    <span className="text-[10px] text-zinc-700 font-mono">· {new Date(listing.listed_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => setMessageTarget({ username: listing.seller_username, calcId: listing.calculator_id, calcName: `${listing.make} ${listing.model}` })}
                      className="ml-auto text-[11px] font-mono text-green-500 hover:text-green-400 border border-green-900/50 hover:border-green-700/60 px-2.5 py-1 rounded-lg transition-colors">
                      ✉ Message seller
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Wanted tab */
        <>
          {demand.length > 0 && !query && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Most wanted</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {demand.slice(0, 8).map(({ listing, count }) => (
                  <Link key={listing.calculator_id} href={`/calculators/${listing.calculator_id}`}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 group">
                    <div className="w-14 h-14 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-700 group-hover:border-amber-400/40 transition-colors">
                      {listing.images[0]
                        ? <img src={listing.images[0]} alt="" className="w-full h-full object-contain" />
                        : <span className="text-xl opacity-20">🧮</span>}
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">{count} want</span>
                    <span className="text-[9px] font-mono text-zinc-500 truncate w-16 text-center">{listing.model}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredWanted.length === 0 ? (
            <div className="text-center py-16 text-zinc-600 font-mono">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-sm">{query ? `No wanted calcs match "${query}"` : 'No wishlist items yet.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWanted.map(w => (
                <div key={w.entry_id} className="bg-zinc-900 border border-zinc-800 hover:border-amber-900/40 rounded-xl p-4 flex gap-4 transition-colors">
                  <Link href={`/calculators/${w.calculator_id}`} className="flex-shrink-0">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                      {w.images[0]
                        ? <img src={w.images[0]} alt="" className="w-full h-full object-contain" />
                        : <span className="text-xl opacity-20">🧮</span>}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-zinc-600 font-mono">{w.make}</p>
                        <Link href={`/calculators/${w.calculator_id}`}>
                          <p className="font-bold font-mono text-zinc-100 hover:text-amber-400 transition-colors text-sm truncate">{w.model}</p>
                        </Link>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">{new Date(w.wanted_since).toLocaleDateString()}</span>
                    </div>
                    {w.notes && <p className="text-xs text-zinc-500 mt-0.5 truncate">{w.notes}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Link href={`/u/${w.wisher_username}`}
                        className="text-[11px] font-mono text-zinc-500 hover:text-amber-400 transition-colors">
                        @{w.wisher_username}
                      </Link>
                      <span className="text-[10px] text-zinc-600 font-mono capitalize">{w.calc_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
