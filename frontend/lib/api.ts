const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.19:8000';

export type Calculator = {
  id: string;
  make: string;
  model: string;
  year_introduced: number | null;
  year_discontinued: number | null;
  calc_type: string;
  display_type: string | null;
  power_source: string | null;
  num_keys: number | null;
  country_of_origin: string | null;
  description: string | null;
  fun_facts: string | null;
  images: string[];
  rarity_score: number | null;
  weirdness_score: number | null;
  is_verified: boolean;
  is_featured: boolean;
  status: string;
  tags: string[];
  manual_url: string | null;
  external_refs: Array<{ label: string; url: string }>;
  owner_count: number;
  want_count: number;
  variant_count: number;
  like_count: number;
  parent_id: string | null;
  variant_label: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  is_verified: boolean;
  is_superuser: boolean;
  is_curator: boolean;
  api_key: string | null;
  theme: string;
  collection_photos: string[];
  showcase_ids: string[];
  notification_prefs: Record<string, boolean>;
};

export type AdminUser = {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
  is_superuser: boolean;
  is_curator: boolean;
  is_active: boolean;
  created_at: string;
};

export type UserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
  owned_count: number;
  wanted_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  collection_photos: string[];
  showcase_ids: string[];
};

export type UserSearchEntry = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
  owned_count: number;
  follower_count: number;
  is_following: boolean;
};

export type CollectionGoal = {
  id: string;
  title: string;
  description: string | null;
  calc_ids: string[];
  target_count: number;
  owned_count: number;
  progress: number;
  created_at: string;
  completed_at: string | null;
};

export type UserCollectionStats = {
  owned_count: number;
  wanted_count: number;
  total_value: number | null;
  market_value: number | null;
  avg_price: number | null;
  brand_counts: Record<string, number>;
  decade_counts: Record<string, number>;
  condition_counts: Record<string, number>;
  top_tags: { tag: string; count: number }[];
  avg_rarity: number | null;
  avg_weirdness: number | null;
};

export type TradeMatch = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  they_have: { id: string; make: string; model: string; images: string[] }[];
  they_want: { id: string; make: string; model: string; images: string[] }[];
};

// ── Recently-viewed helpers (localStorage) ────────────────────────────────────
const RV_KEY = 'cc-recently-viewed';
const RV_MAX = 12;

export function recordRecentlyViewed(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(RV_KEY) || '[]');
    const next = [id, ...prev.filter(x => x !== id)].slice(0, RV_MAX);
    localStorage.setItem(RV_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function getRecentlyViewedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RV_KEY) || '[]'); }
  catch { return []; }
}

export type LeaderboardEntry = {
  rank: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  owned_count: number;
  brand_count: number;
};

export type FollowUser = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  read: boolean;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  calc_id: string | null;
  calc_make: string | null;
  calc_model: string | null;
  body: string | null;
  created_at: string;
};

export type FeedItem = {
  id: string;
  status: 'owned' | 'wanted' | 'for_sale';
  condition: string | null;
  notes: string | null;
  created_at: string;
  user: { username: string; display_name: string | null; avatar_url: string | null };
  calculator: {
    id: string;
    make: string;
    model: string;
    calc_type: string;
    images: string[];
    year_introduced: number | null;
  };
};

export type CollectionEntry = {
  id: string;
  calculator_id: string;
  user_id: string;
  status: 'owned' | 'wanted' | 'for_sale' | 'traded_away';
  condition: 'mint' | 'excellent' | 'good' | 'fair' | 'poor' | null;
  visibility: 'public' | 'followers' | 'private';
  notes: string | null;
  acquired_date: string | null;
  acquired_price: number | null;
  acquired_from: string | null;
  photos: string[];
  created_at: string;
};

export type SiteStats = {
  total_calcs: number;
  total_brands: number;
  total_users: number;
  total_owned: number;
  with_images: number;
  with_descriptions: number;
  top_brands: Array<{ make: string; count: number }>;
  decades: Array<{ decade: number; count: number }>;
  recent: Calculator[];
};

export type BrandSummary = {
  make: string;
  count: number;
  image: string | null;
  flagship: string | null;
};

export type AdminStats = {
  users: {
    total: number;
    new_today: number;
    new_this_week: number;
    new_this_month: number;
    recent: Array<{
      id: string;
      username: string;
      email: string;
      created_at: string;
      is_superuser: boolean;
    }>;
  };
  calculators: {
    total: number;
    added_this_week: number;
    added_this_month: number;
    recent_additions: Array<{ id: string; make: string; model: string; created_at: string }>;
    by_type: Array<{ type: string; count: number }>;
  };
  collections: {
    total_entries: number;
    new_this_week: number;
    top_collectors: Array<{ username: string; display_name: string | null; owned: number }>;
    most_collected: Array<{ id: string; make: string; model: string; total: number }>;
  };
};

export type Comment = {
  id: string;
  calculator_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  content: string;
  rating: number | null;
  like_count: number;
  created_at: string;
};

export type TrendingCalcs = {
  trending_owned: Calculator[];
  trending_wanted: Calculator[];
  new_this_week: Calculator[];
};

export type ForSaleListing = {
  entry_id: string;
  calculator_id: string;
  make: string;
  model: string;
  images: string[];
  calc_type: string;
  year_introduced: number | null;
  condition: string | null;
  notes: string | null;
  acquired_price: number | null;
  seller_username: string;
  seller_display_name: string | null;
  seller_avatar: string | null;
  listed_at: string;
};

export type WantedListing = {
  entry_id: string;
  calculator_id: string;
  make: string;
  model: string;
  images: string[];
  calc_type: string;
  year_introduced: number | null;
  notes: string | null;
  wisher_username: string;
  wisher_display_name: string | null;
  wisher_avatar: string | null;
  wanted_since: string;
};

export type TradeOffer = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_username: string;
  from_display_name: string | null;
  to_username: string;
  to_display_name: string | null;
  offering_ids: string[];
  requesting_ids: string[];
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  created_at: string;
};

export type Report = {
  id: string;
  target_type: 'comment' | 'user';
  reporter_username: string;
  comment_id: string | null;
  comment_content: string | null;
  reported_username: string | null;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  recipient_id: string;
  recipient_username: string;
  recipient_display_name: string | null;
  calc_id: string | null;
  calc_make: string | null;
  calc_model: string | null;
  body: string;
  read: boolean;
  created_at: string;
};

export type Conversation = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  last_body: string;
  last_created_at: string;
  last_from_me: boolean;
  unread_count: number;
};

export type EditSuggestion = {
  id: string;
  calculator_id: string;
  submitted_by_id: string | null;
  submitted_by_username: string | null;
  proposed_changes: Partial<Calculator>;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  calculator_make: string | null;
  calculator_model: string | null;
};

export type ImageSubmission = {
  id: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_note: string | null;
  created_at: string;
  calculator_id: string;
  calculator_make: string;
  calculator_model: string;
  submitted_by_username: string | null;
};

export type PriceGuide = {
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
  recent: { price: number; date: string }[];
};

export type CalcRequest = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  notes: string | null;
  status: 'pending' | 'fulfilled' | 'declined';
  created_at: string;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) => {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      return request<{ access_token: string; refresh_token: string }>(
        '/api/v1/auth/login',
        { method: 'POST', body: form.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    },
    register: (data: { email: string; username: string; password: string; display_name?: string; theme?: string }) =>
      request<AuthUser>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<AuthUser>('/api/v1/users/me'),
    forgotPassword: (email: string) =>
      request<void>('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, new_password: string) =>
      request<void>('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
    sendVerification: () =>
      request<void>('/api/v1/auth/send-verification', { method: 'POST' }),
    verifyEmail: (token: string) =>
      request<void>('/api/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  },

  calculators: {
    list: (params?: {
      q?: string;
      calc_type?: string;
      make?: string;
      tag?: string;
      tags?: string[];
      decade?: number;
      year_from?: number;
      year_to?: number;
      min_rarity?: number;
      max_rarity?: number;
      display_type?: string;
      sort?: string;
      order?: string;
      include_variants?: boolean;
      skip?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.q) query.set('q', params.q);
      if (params?.calc_type) query.set('calc_type', params.calc_type);
      if (params?.make) query.set('make', params.make);
      if (params?.tag) query.set('tag', params.tag);
      if (params?.tags) params.tags.forEach(t => query.append('tags', t));
      if (params?.decade != null) query.set('decade', String(params.decade));
      if (params?.year_from != null) query.set('year_from', String(params.year_from));
      if (params?.year_to != null) query.set('year_to', String(params.year_to));
      if (params?.min_rarity != null) query.set('min_rarity', String(params.min_rarity));
      if (params?.max_rarity != null) query.set('max_rarity', String(params.max_rarity));
      if (params?.display_type) query.set('display_type', params.display_type);
      if (params?.sort) query.set('sort', params.sort);
      if (params?.order) query.set('order', params.order);
      if (params?.include_variants) query.set('include_variants', 'true');
      if (params?.skip != null) query.set('skip', String(params.skip));
      if (params?.limit != null) query.set('limit', String(params.limit));
      return request<Calculator[]>(`/api/v1/calculators?${query}`);
    },
    get: (id: string) => request<Calculator>(`/api/v1/calculators/${id}`),
    batch: (ids: string[]) => {
      if (!ids.length) return Promise.resolve([] as Calculator[]);
      return request<Calculator[]>(`/api/v1/calculators/batch?ids=${ids.join(',')}`);
    },
    variants: (id: string) => request<Calculator[]>(`/api/v1/calculators/${id}/variants`),
    related: (id: string) => request<Calculator[]>(`/api/v1/calculators/related/${id}`),
    makes: () => request<string[]>('/api/v1/calculators/makes'),
    tags: () => request<string[]>('/api/v1/calculators/tags'),
    random: () => request<Calculator>('/api/v1/calculators/random'),
    daily: () => request<Calculator>('/api/v1/calculators/daily'),
    alsoOwned: (id: string) => request<Calculator[]>(`/api/v1/calculators/${id}/also-owned`),
    fetchWiki: (id: string) => request<{ description: string | null; title: string | null }>(`/api/v1/calculators/${id}/wiki-description`),
    brands: () => request<BrandSummary[]>('/api/v1/calculators/brands'),
    needsWork: (limit = 24) => request<Calculator[]>(`/api/v1/calculators/needs-work?limit=${limit}`),
    ownersAlsoOwn: (id: string) => request<Calculator[]>(`/api/v1/calculators/${id}/owners-also-own`),
    owners: (id: string) => request<{username:string;display_name:string|null;avatar_url:string|null}[]>(`/api/v1/calculators/${id}/owners`),
    create: (data: Partial<Calculator>) =>
      request<Calculator>('/api/v1/calculators', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Calculator>) =>
      request<Calculator>(`/api/v1/calculators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/v1/calculators/${id}`, { method: 'DELETE' }),
    liked: (id: string) => request<{ liked: boolean; count: number }>(`/api/v1/calculators/${id}/liked`),
    like: (id: string) => request<void>(`/api/v1/calculators/${id}/like`, { method: 'POST' }),
    unlike: (id: string) => request<void>(`/api/v1/calculators/${id}/like`, { method: 'DELETE' }),
    myVote: (id: string) => request<{ rarity_score: number | null; weirdness_score: number | null }>(`/api/v1/calculators/${id}/my-vote`),
    vote: (id: string, data: { rarity_score?: number; weirdness_score?: number }) => {
      const q = new URLSearchParams();
      if (data.rarity_score != null) q.set('rarity_score', String(data.rarity_score));
      if (data.weirdness_score != null) q.set('weirdness_score', String(data.weirdness_score));
      return request<Calculator>(`/api/v1/calculators/${id}/vote?${q}`, { method: 'POST' });
    },
    priceGuide: (id: string) => request<PriceGuide>(`/api/v1/calculators/${id}/price-guide`),
    submitImage: async (id: string, file: File): Promise<void> => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/v1/calculators/${id}/submit-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Upload failed');
      }
    },
    uploadImage: async (id: string, file: File): Promise<Calculator> => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/v1/calculators/${id}/images`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Upload failed');
      }
      return res.json();
    },
  },

  collection: {
    mine: () => request<CollectionEntry[]>('/api/v1/collections/me'),
    forUser: (username: string) =>
      request<CollectionEntry[]>(`/api/v1/collections/users/${username}`),
    add: (data: {
      calculator_id: string;
      status: string;
      condition?: string | null;
      notes?: string | null;
      acquired_from?: string | null;
      acquired_price?: number | null;
      acquired_date?: string | null;
    }) =>
      request<CollectionEntry>('/api/v1/collections', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CollectionEntry>) =>
      request<CollectionEntry>(`/api/v1/collections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/v1/collections/${id}`, { method: 'DELETE' }),
    uploadPhoto: async (entryId: string, file: File): Promise<CollectionEntry> => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/v1/collections/${entryId}/photos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Upload failed');
      }
      return res.json();
    },
    removePhoto: (entryId: string, index: number) =>
      request<CollectionEntry>(`/api/v1/collections/${entryId}/photos/${index}`, { method: 'DELETE' }),
  },

  users: {
    get: (username: string) => request<UserProfile>(`/api/v1/users/${username}`),
    updateMe: (data: {
      display_name?: string | null;
      bio?: string | null;
      location?: string | null;
      website?: string | null;
      avatar_url?: string | null;
      theme?: string | null;
      showcase_ids?: string[];
      notification_prefs?: Record<string, boolean>;
    }) => request<AuthUser>('/api/v1/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    leaderboard: () => request<LeaderboardEntry[]>('/api/v1/users/leaderboard'),
    search: (q: string) => request<UserSearchEntry[]>(`/api/v1/users/search?q=${encodeURIComponent(q)}`),
    suggested: (limit?: number) => request<UserSearchEntry[]>(`/api/v1/users/suggested${limit ? `?limit=${limit}` : ''}`),
    follow: (username: string) =>
      request<void>(`/api/v1/users/${username}/follow`, { method: 'POST' }),
    unfollow: (username: string) =>
      request<void>(`/api/v1/users/${username}/follow`, { method: 'DELETE' }),
    followers: (username: string) => request<FollowUser[]>(`/api/v1/users/${username}/followers`),
    following: (username: string) => request<FollowUser[]>(`/api/v1/users/${username}/following`),
    feed: (params?: { limit?: number; skip?: number }) => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.skip) q.set('skip', String(params.skip));
      return request<FeedItem[]>(`/api/v1/feed?${q}`);
    },
    generateApiKey: () =>
      request<AuthUser>('/api/v1/users/me/api-key', { method: 'POST' }),
    uploadAvatar: async (file: File): Promise<AuthUser> => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/v1/users/me/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Upload failed');
      }
      return res.json();
    },
    uploadShelfPhoto: async (file: File): Promise<AuthUser> => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/v1/users/me/collection-photos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Upload failed');
      }
      return res.json();
    },
    removeShelfPhoto: (index: number) =>
      request<AuthUser>(`/api/v1/users/me/collection-photos/${index}`, { method: 'DELETE' }),
    collectionStats: (username: string) =>
      request<UserCollectionStats>(`/api/v1/users/${username}/stats`),
  },

  stats: {
    get: () => request<SiteStats>('/api/v1/stats'),
    trending: () => request<TrendingCalcs>('/api/v1/stats/trending'),
  },

  admin: {
    stats: () => request<AdminStats>('/api/v1/admin/stats'),
    users: (q?: string) => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      return request<AdminUser[]>(`/api/v1/admin/users${qs}`);
    },
    updateUser: (id: string, data: { is_superuser?: boolean; is_curator?: boolean; is_active?: boolean }) =>
      request<AdminUser>(`/api/v1/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    merge: (keepId: string, removeId: string) =>
      request<Calculator>('/api/v1/admin/calculators/merge', {
        method: 'POST',
        body: JSON.stringify({ keep_id: keepId, remove_id: removeId }),
      }),
    imageSubmissions: (status?: string) => {
      const q = status ? `?status=${status}` : '';
      return request<ImageSubmission[]>(`/api/v1/admin/image-submissions${q}`);
    },
    reviewImageSubmission: (id: string, status: 'approved' | 'rejected', reviewer_note?: string) =>
      request<ImageSubmission>(`/api/v1/admin/image-submissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewer_note }),
      }),
    featureCalculator: (id: string) =>
      request<Calculator>(`/api/v1/admin/calculators/${id}/feature`, { method: 'POST' }),
    unfeatureCalculator: (id: string) =>
      request<void>(`/api/v1/admin/calculators/${id}/feature`, { method: 'DELETE' }),
    importCsv: async (file: File): Promise<{ created: number; skipped: number; errors: string[] }> => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/v1/admin/calculators/import-csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Import failed');
      }
      return res.json();
    },
    pendingSubmissions: () => request<Calculator[]>('/api/v1/admin/submissions'),
    approveSubmission: (id: string) =>
      request<Calculator>(`/api/v1/admin/calculators/${id}/approve`, { method: 'POST' }),
    rejectSubmission: (id: string) =>
      request<void>(`/api/v1/admin/calculators/${id}/reject`, { method: 'POST' }),
    emailStatus: () => request<{ configured: boolean; smtp_host: string | null; smtp_user: string | null }>('/api/v1/admin/email-status'),
    calcRequests: (status?: string) =>
      request<CalcRequest[]>(`/api/v1/calc-requests/admin${status ? `?status=${status}` : ''}`),
    updateCalcRequest: (id: string, status: string) =>
      request<CalcRequest>(`/api/v1/calc-requests/admin/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },

  calcRequests: {
    create: (data: { make: string; model: string; year?: number | null; notes?: string | null }) =>
      request<CalcRequest>('/api/v1/calc-requests', { method: 'POST', body: JSON.stringify(data) }),
  },

  comments: {
    list: (calcId: string) => request<Comment[]>(`/api/v1/calculators/${calcId}/comments`),
    create: (calcId: string, data: { content: string; rating?: number | null }) =>
      request<Comment>(`/api/v1/calculators/${calcId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
    update: (commentId: string, data: { content: string; rating?: number | null }) =>
      request<Comment>(`/api/v1/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (commentId: string) =>
      request<void>(`/api/v1/comments/${commentId}`, { method: 'DELETE' }),
    liked: (commentId: string) =>
      request<{ liked: boolean; count: number }>(`/api/v1/comments/${commentId}/liked`),
    like: (commentId: string) =>
      request<void>(`/api/v1/comments/${commentId}/like`, { method: 'POST' }),
    unlike: (commentId: string) =>
      request<void>(`/api/v1/comments/${commentId}/like`, { method: 'DELETE' }),
  },

  trade: {
    listings: () => request<ForSaleListing[]>('/api/v1/collections/for-sale'),
    wanted: () => request<WantedListing[]>('/api/v1/collections/wanted'),
    matches: () => request<TradeMatch[]>('/api/v1/collections/trade-matches'),
  },

  tradeOffers: {
    create: (data: { to_username: string; offering_ids: string[]; requesting_ids: string[]; message?: string }) =>
      request<TradeOffer>('/api/v1/trade-offers', { method: 'POST', body: JSON.stringify(data) }),
    list: (direction?: 'sent' | 'received' | 'all') => {
      const q = direction ? `?direction=${direction}` : '';
      return request<TradeOffer[]>(`/api/v1/trade-offers${q}`);
    },
    respond: (id: string, action: 'accept' | 'decline' | 'withdraw') =>
      request<TradeOffer>(`/api/v1/trade-offers/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }),
    pendingCount: () => request<{ pending_received: number }>('/api/v1/trade-offers/count'),
  },

  digest: {
    sendMe: () => request<{ sent: boolean; reason?: string }>('/api/v1/digest/send-me', { method: 'POST' }),
  },

  devices: {
    register: (data: { token: string; platform?: string }) =>
      request<void>('/api/v1/devices/register', { method: 'POST', body: JSON.stringify(data) }),
    unregister: (token: string) =>
      request<void>(`/api/v1/devices/${token}`, { method: 'DELETE' }),
  },

  reports: {
    create: (data: { target_type: 'comment' | 'user'; comment_id?: string; reported_username?: string; reason: string }) =>
      request<Report>('/api/v1/reports', { method: 'POST', body: JSON.stringify(data) }),
    list: (status?: 'pending' | 'resolved' | 'dismissed') =>
      request<Report[]>(`/api/v1/reports${status ? `?status_filter=${status}` : ''}`),
    resolve: (id: string, action: 'dismiss' | 'remove_content') =>
      request<{ status: string }>(`/api/v1/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }),
  },

  messages: {
    send: (data: { recipient_username: string; body: string; calc_id?: string }) =>
      request<Message>('/api/v1/messages', { method: 'POST', body: JSON.stringify(data) }),
    inbox: () => request<{ unread: number; messages: Message[] }>('/api/v1/messages/inbox'),
    sent: () => request<Message[]>('/api/v1/messages/sent'),
    unreadCount: () => request<{ count: number }>('/api/v1/messages/unread-count'),
    markRead: (id: string) => request<void>(`/api/v1/messages/${id}/read`, { method: 'PATCH' }),
    delete: (id: string) => request<void>(`/api/v1/messages/${id}`, { method: 'DELETE' }),
    conversations: () => request<Conversation[]>('/api/v1/messages/conversations'),
    thread: (username: string) => request<Message[]>(`/api/v1/messages/thread/${username}`),
  },

  suggestions: {
    submit: (calcId: string, data: { proposed_changes: Partial<Calculator>; reason?: string }) =>
      request<EditSuggestion>(`/api/v1/calculators/${calcId}/suggestions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (status?: string) => {
      const q = status ? `?status=${status}` : '';
      return request<EditSuggestion[]>(`/api/v1/suggestions${q}`);
    },
    review: (id: string, data: { status: 'approved' | 'rejected'; reviewer_note?: string }) =>
      request<EditSuggestion>(`/api/v1/suggestions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  notifications: {
    list: () => request<{ unread: number; notifications: NotificationItem[] }>('/api/v1/notifications'),
    unreadCount: () => request<number>('/api/v1/notifications/unread-count').then((r: unknown) => (r as { count: number }).count),
    markRead: () => request<void>('/api/v1/notifications/mark-read', { method: 'POST' }),
    dismiss: (id: string) => request<void>(`/api/v1/notifications/${id}`, { method: 'DELETE' }),
  },

  goals: {
    list: () => request<CollectionGoal[]>('/api/v1/collection-goals'),
    create: (data: { title: string; description?: string; calc_ids?: string[] }) =>
      request<CollectionGoal>('/api/v1/collection-goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; description?: string; calc_ids?: string[]; completed?: boolean }) =>
      request<CollectionGoal>(`/api/v1/collection-goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/v1/collection-goals/${id}`, { method: 'DELETE' }),
  },
};
