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
  tags: string[];
  external_refs: Array<{ label: string; url: string }>;
  owner_count: number;
  want_count: number;
  variant_count: number;
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
  api_key: string | null;
  theme: string;
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
};

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
  },

  calculators: {
    list: (params?: {
      q?: string;
      calc_type?: string;
      make?: string;
      tag?: string;
      decade?: number;
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
      if (params?.decade != null) query.set('decade', String(params.decade));
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
    brands: () => request<BrandSummary[]>('/api/v1/calculators/brands'),
    needsWork: (limit = 24) => request<Calculator[]>(`/api/v1/calculators/needs-work?limit=${limit}`),
    ownersAlsoOwn: (id: string) => request<Calculator[]>(`/api/v1/calculators/${id}/owners-also-own`),
    create: (data: Partial<Calculator>) =>
      request<Calculator>('/api/v1/calculators', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Calculator>) =>
      request<Calculator>(`/api/v1/calculators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/v1/calculators/${id}`, { method: 'DELETE' }),
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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
    }) => request<AuthUser>('/api/v1/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    leaderboard: () => request<LeaderboardEntry[]>('/api/v1/users/leaderboard'),
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
  },

  stats: {
    get: () => request<SiteStats>('/api/v1/stats'),
    trending: () => request<TrendingCalcs>('/api/v1/stats/trending'),
  },

  admin: {
    stats: () => request<AdminStats>('/api/v1/admin/stats'),
  },

  comments: {
    list: (calcId: string) => request<Comment[]>(`/api/v1/calculators/${calcId}/comments`),
    create: (calcId: string, data: { content: string; rating?: number | null }) =>
      request<Comment>(`/api/v1/calculators/${calcId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (commentId: string) =>
      request<void>(`/api/v1/comments/${commentId}`, { method: 'DELETE' }),
  },

  trade: {
    listings: () => request<ForSaleListing[]>('/api/v1/collections/for-sale'),
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
};
