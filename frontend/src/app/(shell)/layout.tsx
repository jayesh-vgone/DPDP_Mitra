'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/context/AuthContext';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Mobile nav drawer state (sidebar is a static column on lg+, an off-canvas
  // overlay below lg). Auto-close on route change so it never lingers after a tap.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Show nothing while the session check is in flight — avoids a flash of
  // the authenticated shell before the redirect fires.
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-app">
        <div className="flex items-center gap-3 text-ink">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // user is null and redirect is queued — render nothing while navigation happens
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ zoom: 1.0 }}>
      <AppSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppHeader onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
