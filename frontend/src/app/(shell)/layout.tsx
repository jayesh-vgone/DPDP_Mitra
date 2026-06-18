'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/context/AuthContext';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Show nothing while the session check is in flight — avoids a flash of
  // the authenticated shell before the redirect fires.
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="flex items-center gap-3 text-[#0A0F2C]">
          <div className="w-5 h-5 rounded-full border-2 border-[#FF9933] border-t-transparent animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // user is null and redirect is queued — render nothing while navigation happens
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ zoom: 1.0 }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
