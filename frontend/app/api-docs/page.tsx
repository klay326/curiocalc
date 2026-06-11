import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Docs — CurioCalc',
  description: 'CurioCalc REST API documentation. Browse calculators, collections, and user data programmatically.',
};

const BASE = 'https://api.curiocalc.org';

type Endpoint = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  auth?: boolean;
  admin?: boolean;
  description: string;
  params?: { name: string; in: 'query' | 'path' | 'body'; type: string; required?: boolean; description: string }[];
  response?: string;
};

const SECTIONS: { title: string; endpoints: Endpoint[] }[] = [
  {
    title: 'Calculators',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/calculators',
        description: 'List all calculators with optional search, filtering, and pagination.',
        params: [
          { name: 'q', in: 'query', type: 'string', description: 'Full-text search across make, model, description' },
          { name: 'make', in: 'query', type: 'string', description: 'Filter by brand/make' },
          { name: 'calc_type', in: 'query', type: 'string', description: 'Filter by type (scientific, graphing, financial…)' },
          { name: 'tags', in: 'query', type: 'string', description: 'Comma-separated tags' },
          { name: 'limit', in: 'query', type: 'integer', description: 'Max results (default 50, max 200)' },
          { name: 'skip', in: 'query', type: 'integer', description: 'Pagination offset' },
          { name: 'sort', in: 'query', type: 'string', description: 'Sort field: newest, popular, rarity, weirdness' },
        ],
        response: 'Array of Calculator objects',
      },
      {
        method: 'GET', path: '/api/v1/calculators/{id}',
        description: 'Get a single calculator by ID.',
        params: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Calculator UUID' }],
        response: 'Calculator object',
      },
      {
        method: 'POST', path: '/api/v1/calculators', auth: true,
        description: 'Create a new calculator entry.',
        params: [
          { name: 'make', in: 'body', type: 'string', required: true, description: 'Brand name' },
          { name: 'model', in: 'body', type: 'string', required: true, description: 'Model name' },
          { name: 'calc_type', in: 'body', type: 'string', description: 'scientific | graphing | financial | programmable | databank | printing | novelty | other' },
          { name: 'year_introduced', in: 'body', type: 'integer', description: 'Year first sold' },
          { name: 'year_discontinued', in: 'body', type: 'integer', description: 'Year discontinued' },
          { name: 'description', in: 'body', type: 'string', description: 'Long description' },
          { name: 'tags', in: 'body', type: 'string[]', description: 'Array of tag strings' },
          { name: 'images', in: 'body', type: 'string[]', description: 'Array of image URLs' },
        ],
        response: 'Created Calculator object',
      },
      {
        method: 'PATCH', path: '/api/v1/calculators/{id}', auth: true,
        description: 'Update a calculator (admin or original submitter only). Partial updates supported.',
        params: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Calculator UUID' }],
        response: 'Updated Calculator object',
      },
      {
        method: 'DELETE', path: '/api/v1/calculators/{id}', auth: true, admin: true,
        description: 'Delete a calculator (admin only).',
        params: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Calculator UUID' }],
        response: '204 No Content',
      },
      {
        method: 'GET', path: '/api/v1/calculators/daily',
        description: 'Get the calculator of the day (deterministic daily rotation, or admin-pinned featured calc).',
        response: 'Calculator object',
      },
      {
        method: 'GET', path: '/api/v1/calculators/brands',
        description: 'List all brands/makes with calculator counts and a representative thumbnail.',
        response: 'Array of { make, count, thumbnail }',
      },
      {
        method: 'GET', path: '/api/v1/calculators/makes',
        description: 'Simple list of all make strings.',
        response: 'Array of strings',
      },
      {
        method: 'GET', path: '/api/v1/calculators/tags',
        description: 'All tags with usage counts.',
        response: 'Array of { tag, count }',
      },
    ],
  },
  {
    title: 'Collections',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/collection', auth: true,
        description: 'Get the authenticated user\'s collection entries.',
        params: [
          { name: 'status', in: 'query', type: 'string', description: 'Filter by status: owned | wishlist | sold | lost' },
        ],
        response: 'Array of CollectionEntry objects',
      },
      {
        method: 'POST', path: '/api/v1/collection', auth: true,
        description: 'Add a calculator to your collection.',
        params: [
          { name: 'calculator_id', in: 'body', type: 'string', required: true, description: 'Calculator UUID' },
          { name: 'status', in: 'body', type: 'string', required: true, description: 'owned | wishlist | sold | lost' },
          { name: 'condition', in: 'body', type: 'string', description: 'mint | excellent | good | fair | poor' },
          { name: 'notes', in: 'body', type: 'string', description: 'Personal notes' },
          { name: 'paid_price', in: 'body', type: 'number', description: 'Price paid (USD)' },
        ],
        response: 'Created CollectionEntry object',
      },
      {
        method: 'PATCH', path: '/api/v1/collection/{entry_id}', auth: true,
        description: 'Update a collection entry.',
        params: [{ name: 'entry_id', in: 'path', type: 'string', required: true, description: 'Entry UUID' }],
        response: 'Updated CollectionEntry object',
      },
      {
        method: 'DELETE', path: '/api/v1/collection/{entry_id}', auth: true,
        description: 'Remove a calculator from your collection.',
        params: [{ name: 'entry_id', in: 'path', type: 'string', required: true, description: 'Entry UUID' }],
        response: '204 No Content',
      },
    ],
  },
  {
    title: 'Comments & Ratings',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/calculators/{id}/comments',
        description: 'Get comments for a calculator.',
        params: [
          { name: 'id', in: 'path', type: 'string', required: true, description: 'Calculator UUID' },
          { name: 'limit', in: 'query', type: 'integer', description: 'Max results' },
          { name: 'skip', in: 'query', type: 'integer', description: 'Offset' },
        ],
        response: 'Array of Comment objects',
      },
      {
        method: 'POST', path: '/api/v1/calculators/{id}/comments', auth: true,
        description: 'Post a comment (and optional rating) on a calculator.',
        params: [
          { name: 'id', in: 'path', type: 'string', required: true, description: 'Calculator UUID' },
          { name: 'content', in: 'body', type: 'string', required: true, description: 'Comment text' },
          { name: 'rating', in: 'body', type: 'integer', description: '1–5 star rating' },
        ],
        response: 'Created Comment object',
      },
      {
        method: 'PATCH', path: '/api/v1/comments/{comment_id}', auth: true,
        description: 'Edit your own comment.',
        params: [
          { name: 'comment_id', in: 'path', type: 'string', required: true, description: 'Comment UUID' },
          { name: 'content', in: 'body', type: 'string', required: true, description: 'Updated text' },
          { name: 'rating', in: 'body', type: 'integer', description: 'Updated rating' },
        ],
        response: 'Updated Comment object',
      },
      {
        method: 'DELETE', path: '/api/v1/comments/{comment_id}', auth: true,
        description: 'Delete your own comment (admins can delete any).',
        params: [{ name: 'comment_id', in: 'path', type: 'string', required: true, description: 'Comment UUID' }],
        response: '204 No Content',
      },
    ],
  },
  {
    title: 'Users',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/users/{username}',
        description: 'Get a public user profile by username.',
        params: [{ name: 'username', in: 'path', type: 'string', required: true, description: 'Username' }],
        response: 'UserPublic object',
      },
      {
        method: 'GET', path: '/api/v1/users/me', auth: true,
        description: 'Get the authenticated user\'s full profile.',
        response: 'UserMe object',
      },
      {
        method: 'PATCH', path: '/api/v1/users/me', auth: true,
        description: 'Update profile fields.',
        params: [
          { name: 'display_name', in: 'body', type: 'string', description: 'Display name' },
          { name: 'bio', in: 'body', type: 'string', description: 'Profile bio' },
          { name: 'location', in: 'body', type: 'string', description: 'Location string' },
          { name: 'website', in: 'body', type: 'string', description: 'Website URL' },
          { name: 'avatar_url', in: 'body', type: 'string', description: 'Avatar image URL' },
        ],
        response: 'Updated UserMe object',
      },
      {
        method: 'POST', path: '/api/v1/users/me/avatar', auth: true,
        description: 'Upload an avatar image (multipart/form-data).',
        params: [{ name: 'file', in: 'body', type: 'File', required: true, description: 'Image file' }],
        response: 'Updated UserMe object',
      },
    ],
  },
  {
    title: 'Authentication',
    endpoints: [
      {
        method: 'POST', path: '/api/v1/auth/register',
        description: 'Create a new account. Rate limited: 5 requests/hour per IP.',
        params: [
          { name: 'username', in: 'body', type: 'string', required: true, description: 'Unique username' },
          { name: 'email', in: 'body', type: 'string', required: true, description: 'Email address' },
          { name: 'password', in: 'body', type: 'string', required: true, description: 'Password (min 8 chars)' },
        ],
        response: 'UserMe object',
      },
      {
        method: 'POST', path: '/api/v1/auth/login',
        description: 'Login and receive a JWT. Rate limited: 10 requests/5 minutes per IP.',
        params: [
          { name: 'username', in: 'body', type: 'string', required: true, description: 'Username or email' },
          { name: 'password', in: 'body', type: 'string', required: true, description: 'Password' },
        ],
        response: '{ access_token, token_type }',
      },
    ],
  },
  {
    title: 'Feed & Social',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/feed', auth: true,
        description: 'Get the activity feed for users you follow.',
        params: [
          { name: 'limit', in: 'query', type: 'integer', description: 'Max items (default 20)' },
          { name: 'skip', in: 'query', type: 'integer', description: 'Offset' },
        ],
        response: 'Array of FeedItem objects',
      },
      {
        method: 'POST', path: '/api/v1/users/{username}/follow', auth: true,
        description: 'Follow a user.',
        params: [{ name: 'username', in: 'path', type: 'string', required: true, description: 'Username to follow' }],
        response: '{ followed: true }',
      },
      {
        method: 'DELETE', path: '/api/v1/users/{username}/follow', auth: true,
        description: 'Unfollow a user.',
        params: [{ name: 'username', in: 'path', type: 'string', required: true, description: 'Username to unfollow' }],
        response: '{ followed: false }',
      },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-950/60 text-blue-400 border-blue-900/50',
  POST:   'bg-green-950/60 text-green-400 border-green-900/50',
  PATCH:  'bg-amber-950/60 text-amber-400 border-amber-900/50',
  PUT:    'bg-amber-950/60 text-amber-400 border-amber-900/50',
  DELETE: 'bg-red-950/60 text-red-400 border-red-900/50',
};

export default function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono text-amber-400 mb-2">API Reference</h1>
        <p className="text-zinc-400 font-mono text-sm">
          Base URL: <code className="text-amber-400/80 bg-zinc-900 px-2 py-0.5 rounded">{BASE}</code>
        </p>
        <p className="text-zinc-500 font-mono text-xs mt-2">
          Authenticate with a Bearer token:{' '}
          <code className="text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>
          {' '}— or use an API key from{' '}
          <Link href="/settings" className="text-amber-400/80 hover:text-amber-300 transition-colors">Settings</Link>.
        </p>
      </div>

      <div className="space-y-10">
        {SECTIONS.map(section => (
          <section key={section.title}>
            <h2 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">
              {section.title}
            </h2>
            <div className="space-y-3">
              {section.endpoints.map((ep, i) => (
                <details key={i} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-zinc-800/40 transition-colors">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 w-14 text-center ${METHOD_COLORS[ep.method]}`}>
                      {ep.method}
                    </span>
                    <code className="text-zinc-300 font-mono text-sm flex-1">{ep.path}</code>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {ep.auth && (
                        <span className="text-[9px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-500 px-1.5 py-0.5 rounded">auth</span>
                      )}
                      {ep.admin && (
                        <span className="text-[9px] font-mono bg-amber-950/40 border border-amber-900/40 text-amber-600 px-1.5 py-0.5 rounded">admin</span>
                      )}
                    </div>
                    <span className="text-zinc-600 font-mono text-[10px] ml-auto hidden sm:block">{ep.description.split('.')[0]}</span>
                    <span className="text-zinc-700 ml-2 group-open:rotate-180 transition-transform">▾</span>
                  </summary>

                  <div className="px-4 pb-4 pt-2 border-t border-zinc-800 space-y-4">
                    <p className="text-zinc-400 font-mono text-xs">{ep.description}</p>

                    {ep.params && ep.params.length > 0 && (
                      <div>
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Parameters</p>
                        <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                          <table className="w-full text-xs font-mono">
                            <thead>
                              <tr className="border-b border-zinc-800">
                                <th className="text-left px-3 py-2 text-zinc-600 font-normal text-[10px]">Name</th>
                                <th className="text-left px-3 py-2 text-zinc-600 font-normal text-[10px]">In</th>
                                <th className="text-left px-3 py-2 text-zinc-600 font-normal text-[10px]">Type</th>
                                <th className="text-left px-3 py-2 text-zinc-600 font-normal text-[10px]">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ep.params.map((p, j) => (
                                <tr key={j} className="border-b border-zinc-800/50 last:border-0">
                                  <td className="px-3 py-2">
                                    <span className="text-amber-400/80">{p.name}</span>
                                    {p.required && <span className="text-red-500 ml-0.5">*</span>}
                                  </td>
                                  <td className="px-3 py-2 text-zinc-500">{p.in}</td>
                                  <td className="px-3 py-2 text-zinc-500">{p.type}</td>
                                  <td className="px-3 py-2 text-zinc-400">{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {ep.response && (
                      <div>
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Response</p>
                        <p className="text-zinc-500 font-mono text-xs">{ep.response}</p>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold font-mono text-zinc-300 mb-2">Rate Limits</h2>
        <div className="space-y-1.5">
          {[
            { endpoint: 'POST /auth/register', limit: '5 req / hour per IP' },
            { endpoint: 'POST /auth/login', limit: '10 req / 5 minutes per IP' },
            { endpoint: 'POST /auth/forgot-password', limit: '5 req / hour per IP' },
          ].map(r => (
            <div key={r.endpoint} className="flex items-center justify-between text-xs font-mono">
              <code className="text-zinc-400">{r.endpoint}</code>
              <span className="text-zinc-600">{r.limit}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-zinc-600 mt-4">
          All other endpoints are unrestricted for authenticated users.
          API key auth bypasses IP-based rate limits.
        </p>
      </div>

      <div className="mt-6 text-center">
        <a
          href={`${BASE}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-zinc-600 hover:text-amber-400 transition-colors"
        >
          Interactive Swagger UI ↗
        </a>
      </div>
    </div>
  );
}
