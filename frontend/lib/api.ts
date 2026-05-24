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
  external_refs: Record<string, string>;
  owner_count: number;
  want_count: number;
  created_at: string;
  updated_at: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_superuser: boolean;
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
    register: (data: { email: string; username: string; password: string; display_name?: string }) =>
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
      if (params?.skip != null) query.set('skip', String(params.skip));
      if (params?.limit != null) query.set('limit', String(params.limit));
      return request<Calculator[]>(`/api/v1/calculators?${query}`);
    },
    get: (id: string) => request<Calculator>(`/api/v1/calculators/${id}`),
    related: (id: string) => request<Calculator[]>(`/api/v1/calculators/related/${id}`),
    makes: () => request<string[]>('/api/v1/calculators/makes'),
    tags: () => request<string[]>('/api/v1/calculators/tags'),
    create: (data: Partial<Calculator>) =>
      request<Calculator>('/api/v1/calculators', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Calculator>) =>
      request<Calculator>(`/api/v1/calculators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/v1/calculators/${id}`, { method: 'DELETE' }),
  },

  collection: {
    mine: () => request<CollectionEntry[]>('/api/v1/collections/me'),
    forUser: (username: string) =>
      request<CollectionEntry[]>(`/api/v1/collections/users/${username}`),
    add: (data: { calculator_id: string; status: string; condition?: string; notes?: string }) =>
      request<CollectionEntry>('/api/v1/collections', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CollectionEntry>) =>
      request<CollectionEntry>(`/api/v1/collections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/v1/collections/${id}`, { method: 'DELETE' }),
  },

  users: {
    get: (username: string) => request<UserProfile>(`/api/v1/users/${username}`),
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
};
