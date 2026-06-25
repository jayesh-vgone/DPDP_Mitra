'use client';

import { useState, useEffect, useRef, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { verifyOtp, resendOtp } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';
import { LanguageToggle } from '@/components/chat/LanguageToggle';

function VerifyOtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuth();
  const { lang } = useLanguage();

  const email = params.get('email') ?? '';
  const shouldResendOnLoad = params.get('resend') === '1';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Cooldown countdown in seconds (0 = button enabled)
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // If navigated here from the login page with ?resend=1, trigger a resend automatically
  const didAutoResend = useRef(false);
  useEffect(() => {
    if (shouldResendOnLoad && email && !didAutoResend.current) {
      didAutoResend.current = true;
      handleResend();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Missing email parameter. <Link href="/register" className="text-[#4F46E5] underline">Register</Link></p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const data = await verifyOtp({ email, otp: otp.trim() });
      setAuth(data.user, data.institution);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('CODE_EXPIRED')) {
        setError(t('otpExpiredError', lang));
      } else if (msg.includes('TOO_MANY_ATTEMPTS')) {
        setError(t('otpTooManyError', lang));
      } else if (msg.includes('INVALID_OTP:')) {
        const remaining = msg.split('INVALID_OTP:')[1]?.match(/\d+/)?.[0] ?? '0';
        setError(t('otpInvalidError', lang).replace('{n}', remaining));
      } else if (msg.includes('ALREADY_VERIFIED')) {
        setError(t('otpAlreadyVerified', lang));
      } else {
        setError(msg || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setError('');
    setSuccessMsg('');
    setResending(true);
    try {
      const res = await resendOtp({ email });
      setSuccessMsg(t('otpResendSent', lang));
      startCooldown(res.retry_after_seconds ?? 60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('COOLDOWN:')) {
        const secs = parseInt(msg.split('COOLDOWN:')[1]?.match(/\d+/)?.[0] ?? '60', 10);
        startCooldown(secs);
        setError(''); // cooldown started — no error needed
      } else if (msg.includes('429') && msg.includes('COOLDOWN:')) {
        const secs = parseInt(msg.split('COOLDOWN:')[1]?.match(/\d+/)?.[0] ?? '60', 10);
        startCooldown(secs);
      } else if (msg.includes('ALREADY_VERIFIED')) {
        setError(t('otpAlreadyVerified', lang));
      } else {
        setError(msg || 'Something went wrong.');
      }
    } finally {
      setResending(false);
    }
  }

  const subtitleText = t('otpPageSubtitle', lang).replace('{email}', email);

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0E0D1A] flex flex-col items-center justify-center px-4">
      {/* Language toggle */}
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
          <h2 className="text-xl font-bold text-[#1B1830] dark:text-gray-100 mb-1">
            {t('otpPageTitle', lang)}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{subtitleText}</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1B1830] dark:text-gray-200 mb-1.5">
                {t('otpInputLabel', lang)}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-[#2B2740] bg-white dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 text-2xl font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
                placeholder={t('otpInputPlaceholder', lang)}
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
            >
              {loading ? t('otpSubmitting', lang) : t('otpSubmitBtn', lang)}
            </button>
          </form>

          {/* Resend section */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-sm text-[#4F46E5] font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
            >
              {cooldown > 0
                ? t('otpResendCooldown', lang).replace('{n}', String(cooldown))
                : resending
                  ? '…'
                  : t('otpResendBtn', lang)}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            <Link href="/login" className="text-[#4F46E5] font-medium hover:underline">
              ← {t('loginBtn', lang)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
