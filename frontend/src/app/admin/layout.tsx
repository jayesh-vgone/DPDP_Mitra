'use client';

import { AdminAuthProvider } from '@/context/AdminAuthContext';

/**
 * Admin section layout — deliberately NOT the institution AppShell.
 * No sidebar, no header, no bilingual toggle. English-only internal tool.
 * Just provides the separate AdminAuthProvider to everything under /admin.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
