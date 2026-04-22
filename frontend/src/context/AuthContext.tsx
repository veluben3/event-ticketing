import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authApi } from '../api/endpoints';
import { setAccessToken } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role?: 'USER' | 'ORGANIZER';
    companyName?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshProfile().catch(() => void 0);
      setReady(true);
    })();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: Parameters<typeof authApi.register>[0]) => {
      const res = await authApi.register(data);
      await login(data.email, data.password);
      return res.user;
    },
    [login],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => void 0);
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
