const BASE_URL = 'https://api.curiocalc.org';

export type Calculator = {
  id: string;
  make: string;
  model: string;
  year_introduced: number | null;
  year_discontinued: number | null;
  calc_type: string | null;
  display_type: string | null;
  power_source: string | null;
  num_keys: number | null;
  country_of_origin: string | null;
  description: string | null;
  fun_facts: string[] | null;
  tags: string[] | null;
  images: string[] | null;
  rarity_score: number | null;
  weirdness_score: number | null;
  added_by_id: string | null;
  created_at: string;
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

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type PaginatedCalculators = {
  items: Calculator[];
  total: number;
  page: number;
  size: number;
  pages: number;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  calculators: {
    list: (params: {
      page?: number;
      size?: number;
      search?: string;
      calc_type?: string;
      make?: string;
    } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.size) q.set('size', String(params.size));
      if (params.search) q.set('search', params.search);
      if (params.calc_type) q.set('calc_type', params.calc_type);
      if (params.make) q.set('make', params.make);
      return request<PaginatedCalculators>(`/api/v1/calculators?${q}`);
    },
    get: (id: string) =>
      request<Calculator>(`/api/v1/calculators/${id}`),
  },

  auth: {
    login: (email: string, password: string) => {
      const body = new URLSearchParams({ username: email, password });
      return fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`${res.status}: ${text}`);
        }
        return res.json() as Promise<TokenResponse>;
      });
    },
    register: (data: {
      email: string;
      username: string;
      password: string;
      display_name?: string;
    }) => request<AuthUser>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: (token: string) =>
      request<AuthUser>('/api/v1/auth/me', {}, token),
    logout: (token: string) =>
      request<void>('/api/v1/auth/logout', { method: 'POST' }, token),
  },
};
