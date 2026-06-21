'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { authLogin } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';
import { LanguageToggle } from '@/components/chat/LanguageToggle';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { lang } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authLogin({ email, password });
      setAuth(data.user, data.institution);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401') || msg.toLowerCase().includes('incorrect')) {
        setError(t('invalidCreds', lang));
      } else {
        setError(msg || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0E0D1A] flex flex-col items-center justify-center px-4">
      {/* Language toggle — top right */}
      <div className="absolute top-4 right-6">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#4F46E5] p-3 rounded-2xl mb-4 shadow-md">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1B1830]">EduPrivacy AI</h1>
          <p className="text-sm text-[#4F46E5] font-medium mt-1">DPDP Copilot</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1A1828] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2B2740] p-8">
          <h2 className="text-xl font-bold text-[#1B1830] dark:text-gray-100 mb-1">{t('loginTitle', lang)}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('loginSubtitle', lang)}</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1B1830] dark:text-gray-200 mb-1.5">
                {t('emailLabel', lang)}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] bg-white dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
                placeholder="you@school.edu.in"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1B1830] dark:text-gray-200 mb-1.5">
                {t('passwordLabel', lang)}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] bg-white dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
            >
              {loading ? t('loginLoading', lang) : t('loginBtn', lang)}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t('noAccount', lang)}{' '}
            <Link href="/register" className="text-[#4F46E5] font-medium hover:underline">
              {t('registerLink', lang)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
