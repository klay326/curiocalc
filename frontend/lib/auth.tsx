'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, type AuthUser } from './api';
import { useTheme, type Theme, THEMES } from './theme';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.19:8000';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

/** Try to get a new access token using the stored refresh token. Returns true on success. */
async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const applyUser = (u: AuthUser) => {
    setUser(u);
    if (u.theme && THEMES.includes(u.theme as Theme)) {
      setTheme(u.theme as Theme);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // No access token — try refresh token instead
      tryRefresh().then(ok => {
        if (ok) {
          api.auth.me().then(applyUser).catch(() => {}).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
      return;
    }
    api.auth.me()
      .then(applyUser)
      .catch(async () => {
        // Access token invalid/expired — try to refresh
        const ok = await tryRefresh();
        if (ok) {
          api.auth.me().then(applyUser).catch(() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          });
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token, refresh_token } = await api.auth.login(email, password);
    localStorage.setItem('access_token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    const me = await api.auth.me();
    applyUser(me);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await api.auth.me();
      applyUser(me);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
