import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AuthUser {
  id: string;
  name: string;
  role: string;
  mobile: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dcroper_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('dcroper_user');
      if (raw && raw !== 'undefined') return JSON.parse(raw);
      // Fall back: decode role/id from the stored JWT
      const t = localStorage.getItem('dcroper_token');
      if (!t) return null;
      const payload = JSON.parse(atob(t.split('.')[1]));
      return { id: payload.id, name: '', role: payload.role ?? 'surveyor', mobile: payload.mobile ?? '' };
    } catch {
      return null;
    }
  });

  const login = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem('dcroper_token', t);
    localStorage.setItem('dcroper_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dcroper_token');
    localStorage.removeItem('dcroper_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
