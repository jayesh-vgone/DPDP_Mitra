'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { adminLogin } from '@/lib/api';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { admin, isLoading, setAdmin } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → skip the form.
  useEffect(() => {
    if (!isLoading && admin) router.replace('/admin/questions');
  }, [isLoading, admin, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await adminLogin({ email, password });
      setAdmin(data);
      router.replace('/admin/questions');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('401') || msg.toLowerCase().includes('incorrect')
          ? 'Incorrect email or password'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F2C] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#FF9933] p-3 rounded-2xl mb-4 shadow-md">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">EduPrivacy Admin</h1>
          <p className="text-sm text-[#FF9933] font-medium mt-1">Question Bank Console</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-[#0A0F2C] mb-1">Admin sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Restricted — authorised experts only.</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#0A0F2C] mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933] focus:border-transparent transition"
                placeholder="admin@dpdp.in"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0A0F2C] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933] focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 hover:opacity-90"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
