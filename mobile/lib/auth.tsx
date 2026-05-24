import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, AuthUser } from './api';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    display_name?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

const TOKEN_KEY = 'curiocalc_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore token on mount
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then(async (stored) => {
        if (stored) {
          try {
            const me = await api.auth.me(stored);
            setToken(stored);
            setUser(me);
          } catch {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.auth.login(email, password);
    const me = await api.auth.me(access_token);
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await api.auth.logout(token).catch(() => {});
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const register = useCallback(
    async (data: {
      email: string;
      username: string;
      password: string;
      display_name?: string;
    }) => {
      await api.auth.register(data);
      await login(data.email, data.password);
    },
    [login],
  );

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
