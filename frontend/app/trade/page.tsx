'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type ForSaleListing, type WantedListing, type TradeMatch, type TradeOffer } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const CONDITION_COLORS: Record<string, string> = {
  mint:      'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  excellent: 'text-blue-400 bg-blue-950/40 border-blue-900/50',
  good:      'text-amber-400 bg-amber-950/40 border-amber-900/50',
  fair:      'text-orange-400 bg-orange-950/40 border-orange-900/50',
  poor:      'text-red-400 bg-red-950/40 border-red-900/50',
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'text-amber-400 bg-amber-950/40 border-amber-900/50',
  accepted:  'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  declined:  'text-red-400 bg-red-950/40 border-red-900/50',
  withdrawn: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50',
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

function MakeOfferModal({ match, onClose, onSent }: {
  match: TradeMatch;
  onClose: () => void;
  onSent: () => void;
}) {
  const [offeringIds, setOfferingIds] = useState<string[]>([]);
  const [requestingIds, setRequestingIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const toggleId = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const send = async () => {
    if (!user) { router.push('/login'); return; }
    if (!offeringIds.length && !requestingIds.length) {
      setError('Select at least one calculator on either side');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.tradeOffers.create({
        to_username: match.username,
        offering_ids: offeringIds,
        requesting_ids: requestingIds,
        message: message.trim() || undefined,
      });
      setDone(true);
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send offer');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-mono font-bold text-zinc-100">Make trade offer</h3>
            <p className="text-zinc-500 font-mono text-xs mt-0.5">to @{match.username}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-xl leading-none">✕</button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">🤝</div>
            <p className="text-zinc-200 font-mono text-sm">Offer sent!</p>
            <div className="flex gap-3 mt-4 justify-center">
              <button onClick={onClose}
                className="px-4 py-2 bg-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="text-red-400 font-mono text-xs mb-3">{error}</p>}

            <div className="mb-4">
              <p className="text-[9px] font-mono text-amber-500 uppercase tracking-widest mb-2">
                You offer (your for-sale calcs they want)
              </p>
              {match.they_want.length === 0 ? (
                <p className="text-zinc-600 font-mono text-xs">No calcs to offer in this match</p>
              ) : (
                <div className="space-y-1.5">
                  {match.they_want.map(c => (
                    <label key={c.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        offeringIds.includes(c.id)
                          ? 'border-amber-700/60 bg-amber-950/20'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}>
                      <input
                        type="checkbox"
                        checked={offeringIds.includes(c.id)}
                        onChange={() => toggleId(c.id, offeringIds, setOfferingIds)}
                        className="accent-amber-400"
                      />
                      <div className="w-8 h-8 bg-zinc-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {c.images[0]
                          ? <img src={c.images[0]} alt="" className="w-full h-full object-contain" />
                          : <span className="text-xs opacity-20">🧮</span>}
                      </div>
                      <div>
                        <p className="font-mono text-xs text-zinc-200 font-bold">{c.model}</p>
                        <p className="font-mono text-[10px] text-zinc-600">{c.make}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-mono text-green-500 uppercase tracking-widest mb-2">
                You request (their for-sale calcs you want)
              </p>
              {match.they_have.length === 0 ? (
                <p className="text-zinc-600 font-mono text-xs">No calcs to request in this match</p>
              ) : (
                <div className="space-y-1.5">
                  {match.they_have.map(c => (
                    <label key={c.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        requestingIds.includes(c.id)
                          ? 'border-green-700/60 bg-green-950/20'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}>
                      <input
                        type="checkbox"
                        checked={requestingIds.includes(c.id)}
                        onChange={() => toggleId(c.id, requestingIds, setRequestingIds)}
                        className="accent-green-400"
                      />
                      <div className="w-8 h-8 bg-zinc-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {c.images[0]
                          ? <img src={c.images[0]} alt="" className="w-full h-full object-contain" />
                          : <span className="text-xs opacity-20">🧮</span>}
                      </div>
                      <div>
                        <p className="font-mono text-xs text-zinc-200 font-bold">{c.model}</p>
                        <p className="font-mono text-[10px] text-zinc-600">{c.make}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Message (optional)</p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder={`Hi @${match.username}, interested in a trade…`}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-400 rounded-lg font-mono text-sm border border-zinc-700 hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button onClick={send} disabled={sending}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-mono text-sm font-bold hover:bg-blue-500 transition-colors disabled:opacity-50">
                {sending ? 'Sending…' : '🤝 Send offer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OfferCard({ offer, myUserId, onAction }: {
  offer: TradeOffer;
  myUserId: string;
  onAction: (id: string, action: 'accept' | 'decline' | 'withdraw') => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const isSender = offer.from_user_id === myUserId;
  const otherName = isSender
    ? (offer.to_display_name ?? offer.to_username)
    : (offer.from_display_name ?? offer.from_username);
  const otherUsername = isSender ? offer.to_username : offer.from_username;

  const act = async (action: 'accept' | 'decline' | 'withdraw') => {
    setLoading(true);
    try { await onAction(offer.id, action); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-zinc-500">{isSender ? 'To' : 'From'}</span>
          <Link href={`/u/${otherUsername}`}
            className="font-mono text-sm font-bold text-zinc-100 hover:text-amber-400 transition-colors truncate">
            {otherName}
          </Link>
          <span className="text-[10px] font-mono text-zinc-600">@{otherUsername}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono capitalize flex-shrink-0 ${STATUS_COLORS[offer.status] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
          {offer.status}
        </span>
      </div>

      <div className="flex gap-4 mb-3">
        <div className="flex-1">
          <p className="text-[9px] font-mono text-amber-500 uppercase tracking-widest mb-1">Offering</p>
          <p className="font-mono text-sm text-zinc-200 font-bold">
            {offer.offering_ids.length} calc{offer.offering_ids.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-zinc-700 font-mono text-lg self-center">⇄</div>
        <div className="flex-1">
          <p className="text-[9px] font-mono text-green-500 uppercase tracking-widest mb-1">Requesting</p>
          <p className="font-mono text-sm text-zinc-200 font-bold">
            {offer.requesting_ids.length} calc{offer.requesting_ids.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {offer.message && (
        <p className="text-xs font-mono text-zinc-500 bg-zinc-800/60 rounded-lg px-3 py-2 mb-3 line-clamp-2">
          {offer.message}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-zinc-700">
          {new Date(offer.created_at).toLocaleDateString()}
        </span>
        {offer.status === 'pending' && (
          <div className="flex gap-2">
            {!isSender && (
              <>
                <button
                  onClick={() => act('decline')}
                  disabled={loading}
                  className="px-3 py-1.5 text-[11px] font-mono text-red-400 border border-red-900/40 hover:border-red-700/60 rounded-lg transition-colors disabled:opacity-50">
                  Decline
                </button>
                <button
                  onClick={() => act('accept')}
                  disabled={loading}
                  className="px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-400 border border-emerald-900/40 hover:border-emerald-700/60 bg-emerald-950/20 rounded-lg transition-colors disabled:opacity-50">
                  Accept
                </button>
              </>
            )}
            {isSender && (
              <button
                onClick={() => act('withdraw')}
                disabled={loading}
                className="px-3 py-1.5 text-[11px] font-mono text-zinc-400 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50">
                Withdraw
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TradePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'for_sale' | 'wanted' | 'matches' | 'offers'>('for_sale');
  const [listings, setListings] = useState<ForSaleListing[]>([]);
  const [wanted, setWanted] = useState<WantedListing[]>([]);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [messageTarget, setMessageTarget] = useState<{ username: string; calcId: string; calcName: string } | null>(null);
  const [offerTarget, setOfferTarget] = useState<TradeMatch | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    Promise.all([api.trade.listings(), api.trade.wanted()])
      .then(([l, w]) => { setListings(l); setWanted(w); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.tradeOffers.pendingCount()
      .then(r => setPendingCount(r.pending_received))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (tab !== 'matches' || !user || matches.length > 0) return;
    setMatchesLoading(true);
    api.trade.matches()
      .then(setMatches)
      .catch(() => {})
      .finally(() => setMatchesLoading(false));
  }, [tab, user, matches.length]);

  useEffect(() => {
    if (tab !== 'offers' || !user) return;
    setOffersLoading(true);
    api.tradeOffers.list()
      .then(setOffers)
      .catch(() => {})
      .finally(() => setOffersLoading(false));
  }, [tab, user]);

  const handleOfferAction = async (id: string, action: 'accept' | 'decline' | 'withdraw') => {
    const updated = await api.tradeOffers.respond(id, action);
    setOffers(prev => prev.map(o => o.id === updated.id ? updated : o));
    if (action !== 'withdraw') {
      api.tradeOffers.pendingCount()
        .then(r => setPendingCount(r.pending_received))
        .catch(() => {});
    }
  };

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

  const demandMap: Record<string, { listing: WantedListing; count: number }> = {};
  for (const w of wanted) {
    if (!demandMap[w.calculator_id]) demandMap[w.calculator_id] = { listing: w, count: 0 };
    demandMap[w.calculator_id].count++;
  }
  const demand = Object.values(demandMap).sort((a, b) => b.count - a.count);

  const receivedOffers = offers.filter(o => o.to_user_id === user?.id);
  const sentOffers = offers.filter(o => o.from_user_id === user?.id);
  const pendingReceived = receivedOffers.filter(o => o.status === 'pending');

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
      {offerTarget && (
        <MakeOfferModal
          match={offerTarget}
          onClose={() => setOfferTarget(null)}
          onSent={() => {
            setOfferTarget(null);
            if (tab === 'offers') {
              setOffersLoading(true);
              api.tradeOffers.list()
                .then(setOffers)
                .catch(() => {})
                .finally(() => setOffersLoading(false));
            }
          }}
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

      <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit flex-wrap">
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
        {user && (
          <button onClick={() => setTab('matches')}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
              tab === 'matches' ? 'bg-blue-900/40 text-blue-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            🔀 Matches
          </button>
        )}
        {user && (
          <button onClick={() => setTab('offers')}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors relative ${
              tab === 'offers' ? 'bg-purple-900/40 text-purple-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            🤝 Offers
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {tab !== 'offers' && (
        <input
          type="text"
          placeholder={tab === 'for_sale' ? 'Search listings…' : 'Search wanted calcs…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-green-500 transition-colors mb-8"
        />
      )}

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
      ) : tab === 'wanted' ? (
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
      ) : tab === 'matches' ? (
        matchesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 text-zinc-600 font-mono">
            <div className="text-4xl mb-3">🔀</div>
            <p className="text-sm font-bold mb-1">No trade matches yet</p>
            <p className="text-xs text-zinc-700 max-w-xs mx-auto">Matches appear when someone owns a calc on your wishlist AND wants something you own.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Link href="/collection" className="text-xs font-mono text-amber-400 hover:text-amber-300 border border-amber-900/40 px-3 py-1.5 rounded-lg transition-colors">
                Add to collection →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">
              {matches.length} potential trade partner{matches.length !== 1 ? 's' : ''}
            </p>
            {matches.map(m => (
              <div key={m.user_id} className="bg-zinc-900 border border-blue-900/30 hover:border-blue-800/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-amber-900/40 border border-amber-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-amber-400 font-mono">{(m.display_name ?? m.username).charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/u/${m.username}`} className="font-bold font-mono text-zinc-100 hover:text-amber-400 transition-colors text-sm">
                      {m.display_name ?? m.username}
                    </Link>
                    <p className="text-[10px] font-mono text-zinc-600">@{m.username}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setOfferTarget(m)}
                      className="text-[11px] font-mono text-purple-400 hover:text-purple-300 border border-purple-900/40 hover:border-purple-700/60 px-2.5 py-1 rounded-lg transition-colors">
                      🤝 Offer
                    </button>
                    <button
                      onClick={() => setMessageTarget({ username: m.username, calcId: m.they_have[0]?.id ?? '', calcName: `${m.they_have[0]?.make} ${m.they_have[0]?.model}` })}
                      className="text-[11px] font-mono text-blue-400 hover:text-blue-300 border border-blue-900/40 hover:border-blue-700/60 px-2.5 py-1 rounded-lg transition-colors">
                      ✉ Message
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-mono text-green-500 uppercase tracking-widest mb-1.5">They have (you want)</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {m.they_have.slice(0, 4).map(c => (
                        <Link key={c.id} href={`/calculators/${c.id}`} className="flex-shrink-0">
                          <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center border border-green-900/30 hover:border-green-700/50 transition-colors">
                            {c.images[0] ? <img src={c.images[0]} alt="" className="w-full h-full object-contain" /> : <span className="text-base opacity-20">🧮</span>}
                          </div>
                          <p className="text-[9px] font-mono text-zinc-600 truncate w-12 text-center mt-0.5">{c.model}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-amber-500 uppercase tracking-widest mb-1.5">They want (you have)</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {m.they_want.slice(0, 4).map(c => (
                        <Link key={c.id} href={`/calculators/${c.id}`} className="flex-shrink-0">
                          <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center border border-amber-900/30 hover:border-amber-700/50 transition-colors">
                            {c.images[0] ? <img src={c.images[0]} alt="" className="w-full h-full object-contain" /> : <span className="text-base opacity-20">🧮</span>}
                          </div>
                          <p className="text-[9px] font-mono text-zinc-600 truncate w-12 text-center mt-0.5">{c.model}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'offers' ? (
        offersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-20 text-zinc-600 font-mono">
            <div className="text-4xl mb-3">🤝</div>
            <p className="text-sm font-bold mb-1">No trade offers yet</p>
            <p className="text-xs text-zinc-700 max-w-xs mx-auto">Find a match and click "Offer" to propose a trade.</p>
            <button onClick={() => setTab('matches')}
              className="text-xs font-mono text-purple-400 hover:text-purple-300 border border-purple-900/40 px-3 py-1.5 rounded-lg transition-colors mt-4 inline-block">
              View matches →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingReceived.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
                  Pending — {pendingReceived.length} received
                </p>
                <div className="space-y-3">
                  {pendingReceived.map(o => (
                    <OfferCard key={o.id} offer={o} myUserId={user!.id} onAction={handleOfferAction} />
                  ))}
                </div>
              </div>
            )}
            {receivedOffers.filter(o => o.status !== 'pending').length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Received</p>
                <div className="space-y-3">
                  {receivedOffers.filter(o => o.status !== 'pending').map(o => (
                    <OfferCard key={o.id} offer={o} myUserId={user!.id} onAction={handleOfferAction} />
                  ))}
                </div>
              </div>
            )}
            {sentOffers.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Sent</p>
                <div className="space-y-3">
                  {sentOffers.map(o => (
                    <OfferCard key={o.id} offer={o} myUserId={user!.id} onAction={handleOfferAction} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
