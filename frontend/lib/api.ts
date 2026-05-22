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
    list: (params?: { q?: string; calc_type?: string; skip?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.q) query.set('q', params.q);
      if (params?.calc_type) query.set('calc_type', params.calc_type);
      if (params?.skip != null) query.set('skip', String(params.skip));
      if (params?.limit != null) query.set('limit', String(params.limit));
      return request<Calculator[]>(`/api/v1/calculators?${query}`);
    },
    get: (id: string) => request<Calculator>(`/api/v1/calculators/${id}`),
    create: (data: Partial<Calculator>) =>
      request<Calculator>('/api/v1/calculators', { method: 'POST', body: JSON.stringify(data) }),
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
};
