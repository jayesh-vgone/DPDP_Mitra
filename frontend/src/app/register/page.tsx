'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { authRegister } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { t, type TranslationKey } from '@/lib/translations';
import { LanguageToggle } from '@/components/chat/LanguageToggle';

const CATEGORY_OPTIONS: { value: 'school' | 'higher_ed' | 'edtech'; labelKey: TranslationKey }[] = [
  { value: 'school',     labelKey: 'categorySchool' },
  { value: 'higher_ed',  labelKey: 'categoryHigherEd' },
  { value: 'edtech',     labelKey: 'categoryEdtech' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { lang } = useLanguage();

  const [inviteCode, setInviteCode] = useState('');
  const [category, setCategory] = useState<'school' | 'higher_ed' | 'edtech'>('school');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('passwordShort', lang));
      return;
    }

    setLoading(true);
    try {
      const data = await authRegister({
        invite_code: inviteCode.trim(),
        category,
        admin_name: adminName.trim(),
        email,
        password,
      });
      if ('user' in data) {
        // EMAIL_VERIFICATION_ENABLED=false: session issued immediately
        setAuth(data.user, data.institution);
        router.replace('/dashboard');
      } else {
        // EMAIL_VERIFICATION_ENABLED=true: OTP was sent, redirect to verify screen
        router.replace(`/verify-otp?email=${encodeURIComponent(data.email)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('400') && msg.toLowerCase().includes('invite')) {
        setError(t('invalidInvite', lang));
      } else if (msg.includes('400') && msg.toLowerCase().includes('email')) {
        setError(t('emailTaken', lang));
      } else if (msg.includes('password')) {
        setError(t('passwordShort', lang));
      } else {
        setError(msg || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0E0D1A] flex flex-col items-center justify-center px-4 py-8">
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
          <h1 className="text-2xl font-bold text-[#1B1830] dark:text-gray-100">EduPrivacy AI</h1>
          <p className="text-sm text-[#4F46E5] font-medium mt-1">DPDP Copilot</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1A1828] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2B2740] p-8">
          <h2 className="text-xl font-bold text-[#1B1830] dark:text-gray-100 mb-1">{t('registerTitle', lang)}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('registerSubtitle', lang)}</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Invite code */}
            <div>
              <label className="block text-sm font-medium text-[#1B1830] dark:text-gray-200 mb-1.5">
                {t('inviteCodeLabel', lang)}
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] bg-white dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition font-mono tracking-wider"
                placeholder="SUNRISE-2024"
              />
            </div>

            {/* Institution category */}
            <div>
              <label className="block text-sm font-medium text-[#1B1830] dark:text-gray-200 mb-1.5">
                {t('categoryDropdownLabel', lang)}
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] text-sm bg-white dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
              >
                {CATEGORY_OPTIONS.map(({ value, labelKey }) => (
                  <option key={value} value={value}>{t(labelKey, lang)}</option>
                ))}
              </select>
            </div>

            {/* Admin name */}
            <div>
              <label className="block text-sm font-medium text-[#1B1830] dark:text-gray-200 mb-1.5">
                {t('adminNameLabel', lang)}
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] bg-white dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
                placeholder="Priya Sharma"
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#1B1830] dark:text-gray-200 mb-1.5">
                {t('passwordLabel', lang)}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] bg-white dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
            >
              {loading ? t('registerLoading', lang) : t('registerBtn', lang)}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t('haveAccount', lang)}{' '}
            <Link href="/login" className="text-[#4F46E5] font-medium hover:underline">
              {t('loginLink', lang)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
