'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /admin → institutions list (the primary admin landing; redirects to
// /admin/login itself if there's no admin session).
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/institutions');
  }, [router]);
  return null;
}
