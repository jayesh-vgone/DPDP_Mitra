'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthInstitution, AuthUser } from '@/lib/types';
import { authLogout, authMe } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  institution: AuthInstitution | null;
  isLoading: boolean;
  // Called by login/register pages after a successful auth response
  setAuth: (user: AuthUser, institution: AuthInstitution) => void;
  // Logs out and clears state
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [institution, setInstitution] = useState<AuthInstitution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: validate the session cookie with GET /auth/me.
  // If valid: populate state. If 401: leave state null (triggers redirect to /login).
  useEffect(() => {
    authMe()
      .then((data) => {
        setUser(data.user);
        setInstitution(data.institution);
      })
      .catch(() => {
        setUser(null);
        setInstitution(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setAuth = useCallback((u: AuthUser, inst: AuthInstitution) => {
    setUser(u);
    setInstitution(inst);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // Even if the request fails, clear local state so the UI reflects signed-out.
    }
    setUser(null);
    setInstitution(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, institution, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
