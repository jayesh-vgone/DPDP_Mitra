'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /admin → questions console (which itself redirects to /admin/login if needed).
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/questions');
  }, [router]);
  return null;
}
