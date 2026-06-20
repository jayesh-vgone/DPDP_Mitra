'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AdminUser } from '@/lib/types';
import { adminLogout, adminMe } from '@/lib/api';

/**
 * Admin auth context — completely separate from the institution AuthContext.
 * Backed by the admin_session cookie (not dpdp_session), so an admin and an
 * institution user can be signed in simultaneously in the same browser.
 */
interface AdminAuthState {
  admin: AdminUser | null;
  isLoading: boolean;
  setAdmin: (admin: AdminUser) => void;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdminState] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate the admin session cookie on mount.
  useEffect(() => {
    adminMe()
      .then((data) => setAdminState(data))
      .catch(() => setAdminState(null))
      .finally(() => setIsLoading(false));
  }, []);

  const setAdmin = useCallback((a: AdminUser) => setAdminState(a), []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } catch {
      // Clear local state regardless so the UI reflects signed-out.
    }
    setAdminState(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, isLoading, setAdmin, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
