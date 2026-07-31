import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Docs — CurioCalc',
  description: 'CurioCalc public API reference for calculator data, collections, and community.',
};

const BASE = 'https://api.curiocalc.org';

type Endpoint = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  auth?: 'required' | 'optional';
  desc: string;
  params?: { name: string; in: 'query' | 'path' | 'body'; desc: string }[];
  example?: string;
};

const SECTIONS: { title: string; icon: string; endpoints: Endpoint[] }[] = [
  {
    title: 'Authentication',
    icon: '🔐',
    endpoints: [
      {
        method: 'POST', path: '/api/v1/auth/login',
        desc: 'Obtain a JWT access token.',
        params: [
          { name: 'username', in: 'body', desc: 'Your username or email' },
          { name: 'password', in: 'body', desc: 'Your password' },
        ],
        example: '{"access_token": "eyJ…", "token_type": "bearer"}',
      },
      {
        method: 'GET', path: '/api/v1/users/me', auth: 'required',
        desc: 'Return the currently authenticated user.',
      },
      {
        method: 'POST', path: '/api/v1/users/me/api-key', auth: 'required',
        desc: 'Regenerate your API key. The key is returned once and stored hashed.',
      },
    ],
  },
  {
    title: 'Calculators',
    icon: '🧮',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/calculators',
        desc: 'List calculators with optional filtering and pagination.',
        params: [
          { name: 'q', in: 'query', desc: 'Full-text search query' },
          { name: 'make', in: 'query', desc: 'Filter by brand/manufacturer' },
          { name: 'calc_type', in: 'query', desc: 'scientific | graphing | financial | programmable | databank | printing | novelty | other' },
          { name: 'tags', in: 'query', desc: 'Comma-separated tag list' },
          { name: 'year_min / year_max', in: 'query', desc: 'Year-introduced range filter' },
          { name: 'limit', in: 'query', desc: 'Max results (default 50, max 200)' },
          { name: 'skip', in: 'query', desc: 'Pagination offset' },
        ],
      },
      {
        method: 'GET', path: '/api/v1/calculators/{id}',
        desc: 'Fetch a single calculator by UUID. Includes owner_count, want_count, variant_count.',
      },
      {
        method: 'GET', path: '/api/v1/calculators/daily',
        desc: 'Return the admin-pinned featured calculator, or a daily rotating pick.',
      },
      {
        method: 'GET', path: '/api/v1/calculators/{id}/price-guide',
        desc: 'Crowdsourced price data from collector-reported acquisition prices.',
        example: '{"count":12,"avg":34.50,"min":5,"max":120,"median":28,"recent":[…]}',
      },
      {
        method: 'GET', path: '/api/v1/calculators/{id}/related',
        desc: 'Return up to 6 related calculators by brand or type.',
      },
      {
        method: 'GET', path: '/api/v1/calculators/{id}/variants',
        desc: 'Return all color/region variants of a parent calculator.',
      },
      {
        method: 'GET', path: '/api/v1/calculators/brands',
        desc: 'Return all brands with calculator counts and a sample image.',
      },
      {
        method: 'GET', path: '/api/v1/calculators/rss',
        desc: 'RSS feed of recently added calculators.',
      },
    ],
  },
  {
    title: 'Collections',
    icon: '📦',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/collections/me', auth: 'required',
        desc: 'Return your full collection (owned, wanted, for_sale entries).',
      },
      {
        method: 'GET', path: '/api/v1/collections/users/{username}',
        desc: "Return a public user's collection entries.",
      },
      {
        method: 'POST', path: '/api/v1/collections', auth: 'required',
        desc: 'Add a calculator to your collection.',
        params: [
          { name: 'calculator_id', in: 'body', desc: 'UUID of the calculator' },
          { name: 'status', in: 'body', desc: 'owned | wanted | for_sale' },
          { name: 'condition', in: 'body', desc: 'mint | excellent | good | fair | poor (optional)' },
          { name: 'acquired_price', in: 'body', desc: 'What you paid in USD (optional, used for price guide)' },
          { name: 'notes', in: 'body', desc: 'Private notes (optional)' },
        ],
      },
      {
        method: 'PATCH', path: '/api/v1/collections/{id}', auth: 'required',
        desc: 'Update a collection entry (condition, price, notes, status).',
      },
      {
        method: 'DELETE', path: '/api/v1/collections/{id}', auth: 'required',
        desc: 'Remove a calculator from your collection.',
      },
    ],
  },
  {
    title: 'Users',
    icon: '👤',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/users/{username}',
        desc: 'Public user profile — includes follower/following counts, badges, showcase.',
      },
      {
        method: 'GET', path: '/api/v1/users/{username}/stats',
        desc: 'Collection analytics — brand breakdown, decade spread, condition distribution, top tags.',
      },
      {
        method: 'GET', path: '/api/v1/users/leaderboard',
        desc: 'Top collectors by collection size.',
      },
      {
        method: 'GET', path: '/api/v1/users/search',
        desc: 'Search users by username or display name.',
        params: [{ name: 'q', in: 'query', desc: 'Search query' }],
      },
      {
        method: 'POST', path: '/api/v1/users/{username}/follow', auth: 'required',
        desc: 'Follow a user.',
      },
      {
        method: 'DELETE', path: '/api/v1/users/{username}/follow', auth: 'required',
        desc: 'Unfollow a user.',
      },
    ],
  },
  {
    title: 'Community',
    icon: '💬',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/calculators/{id}/comments',
        desc: 'Return comments for a calculator.',
      },
      {
        method: 'POST', path: '/api/v1/calculators/{id}/comments', auth: 'required',
        desc: 'Post a comment.',
        params: [
          { name: 'content', in: 'body', desc: 'Comment text' },
          { name: 'rating', in: 'body', desc: '1–5 star rating (optional)' },
        ],
      },
      {
        method: 'POST', path: '/api/v1/calculators/{id}/vote', auth: 'required',
        desc: 'Cast or update a rarity/weirdness vote.',
        params: [
          { name: 'rarity_score', in: 'query', desc: '1–10 rarity (optional)' },
          { name: 'weirdness_score', in: 'query', desc: '1–10 weirdness (optional)' },
        ],
      },
      {
        method: 'GET', path: '/api/v1/feed', auth: 'required',
        desc: 'Social feed — recent activity from people you follow.',
        params: [
          { name: 'limit', in: 'query', desc: 'Max items (default 20)' },
          { name: 'skip', in: 'query', desc: 'Pagination offset' },
        ],
      },
    ],
  },
  {
    title: 'Misc',
    icon: '⚡',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/stats',
        desc: 'Site-wide statistics — total calcs, users, collections.',
      },
      {
        method: 'GET', path: '/api/v1/stats/trending',
        desc: 'Most-viewed calculators this week.',
      },
      {
        method: 'POST', path: '/api/v1/calc-requests',
        desc: 'Submit a request for a calculator to be added to the catalog.',
        params: [
          { name: 'make', in: 'body', desc: 'Brand / manufacturer' },
          { name: 'model', in: 'body', desc: 'Model name/number' },
          { name: 'year', in: 'body', desc: 'Year introduced (optional)' },
          { name: 'notes', in: 'body', desc: 'Any helpful details (optional)' },
        ],
      },
      {
        method: 'GET', path: '/api/health',
        desc: 'Health check. Returns {"status":"ok"}.',
      },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    'text-sky-400 bg-sky-950/40 border-sky-900/40',
  POST:   'text-green-400 bg-green-950/40 border-green-900/40',
  PATCH:  'text-amber-400 bg-amber-950/40 border-amber-900/40',
  DELETE: 'text-red-400 bg-red-950/40 border-red-900/40',
};

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">← home</Link>
        <h1 className="text-3xl font-bold font-mono text-amber-400 mt-3">API Reference</h1>
        <p className="text-zinc-500 font-mono text-xs mt-2">
          Base URL: <code className="text-zinc-300">{BASE}</code>
        </p>
      </div>

      {/* Auth header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Authentication</p>
        <p className="text-sm font-mono text-zinc-300 mb-3">
          Pass your API key or JWT as a Bearer token in the <code className="text-amber-400">Authorization</code> header.
        </p>
        <div className="bg-zinc-800 rounded-xl px-4 py-3 font-mono text-xs text-zinc-400 overflow-x-auto">
          Authorization: Bearer &lt;your-token&gt;
        </div>
        <p className="text-xs font-mono text-zinc-600 mt-3">
          Get your API key from{' '}
          <Link href="/settings" className="text-amber-400 hover:underline">Settings → API key</Link>.
          Use <code className="text-zinc-400">POST /api/v1/auth/login</code> to get a short-lived JWT.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map(section => (
          <section key={section.title}>
            <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>{section.icon}</span> {section.title}
            </h2>
            <div className="space-y-3">
              {section.endpoints.map(ep => (
                <div key={ep.path + ep.method} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 ${METHOD_COLOR[ep.method]}`}>
                      {ep.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-sm text-zinc-200">{ep.path}</code>
                        {ep.auth && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            ep.auth === 'required'
                              ? 'text-amber-400 bg-amber-950/30 border-amber-900/40'
                              : 'text-zinc-500 bg-zinc-800 border-zinc-700'
                          }`}>
                            {ep.auth === 'required' ? '🔐 auth required' : '🔓 auth optional'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono mt-1">{ep.desc}</p>
                    </div>
                  </div>

                  {ep.params && ep.params.length > 0 && (
                    <div className="border-t border-zinc-800 px-4 py-3">
                      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Parameters</p>
                      <div className="space-y-1.5">
                        {ep.params.map(p => (
                          <div key={p.name} className="flex items-start gap-3 text-xs font-mono">
                            <code className="text-amber-400/80 flex-shrink-0 w-44 truncate">{p.name}</code>
                            <span className="text-[9px] text-zinc-700 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded flex-shrink-0">{p.in}</span>
                            <span className="text-zinc-500">{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ep.example && (
                    <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950/40">
                      <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-1.5">Example response</p>
                      <code className="text-[11px] font-mono text-zinc-500 whitespace-pre-wrap break-all">{ep.example}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Full OpenAPI link */}
      <div className="mt-10 border-t border-zinc-800 pt-8 text-center">
        <p className="text-zinc-600 font-mono text-xs mb-3">Looking for the full interactive spec?</p>
        <a href={`${BASE}/api/docs`} target="_blank" rel="noreferrer"
          className="inline-block text-xs font-mono bg-zinc-900 border border-zinc-700 hover:border-amber-400/50 text-zinc-300 hover:text-amber-400 px-4 py-2 rounded-xl transition-colors">
          Open Swagger UI ↗
        </a>
      </div>
    </div>
  );
}
