'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, Eye, EyeOff } from 'lucide-react';
import { getProfile, updateProfile, updateInstitutionDetails, changePassword } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/translations';
import type { InstitutionDetails } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDetail(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.match(/"detail"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
    return err.message;
  }
  return 'Something went wrong';
}

// ── Verification badge ────────────────────────────────────────────────────────

function VerifiedBadge({ verified, lang }: { verified: boolean; lang: 'en' | 'hi' }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#138808] bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
        <BadgeCheck size={11} />
        {t('badgeVerified', lang)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
      <Clock size={11} />
      {t('badgePendingVerification', lang)}
    </span>
  );
}

// ── Subtype options per category ──────────────────────────────────────────────

const SUBTYPES: Record<string, string[]> = {
  higher_ed: [
    'Government (State)',
    'Government (Central)',
    'Deemed to be University',
    'Private University',
    'Institute of National Importance',
  ],
  school: ['State Board', 'CBSE', 'ICSE'],
  edtech: [],
};

// ── Institution details section ───────────────────────────────────────────────

function InstitutionDetailsSection() {
  const { lang } = useLanguage();
  const [inst, setInst] = useState<InstitutionDetails | null>(null);
  const [location, setLocation] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [staffCount, setStaffCount] = useState('');
  const [subtype, setSubtype] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (p.institution) {
          setInst(p.institution);
          setLocation(p.institution.location ?? '');
          setStudentCount(p.institution.student_count != null ? String(p.institution.student_count) : '');
          setStaffCount(p.institution.staff_count != null ? String(p.institution.staff_count) : '');
          setSubtype(p.institution.institution_subtype ?? '');
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccess('');
    setError('');

    const scNum = studentCount.trim() ? parseInt(studentCount, 10) : null;
    const sfNum = staffCount.trim() ? parseInt(staffCount, 10) : null;

    if (scNum !== null && (isNaN(scNum) || scNum < 0)) {
      setError(lang === 'hi' ? 'छात्र संख्या एक वैध धनात्मक संख्या होनी चाहिए' : 'Student count must be a valid non-negative number');
      return;
    }
    if (sfNum !== null && (isNaN(sfNum) || sfNum < 0)) {
      setError(lang === 'hi' ? 'कर्मचारी संख्या एक वैध धनात्मक संख्या होनी चाहिए' : 'Staff count must be a valid non-negative number');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateInstitutionDetails({
        location: location.trim() || null,
        student_count: scNum,
        staff_count: sfNum,
        institution_subtype: subtype || null,
      });
      setInst(updated);
      setSuccess(t('profileInstSaved', lang));
    } catch (err) {
      setError(extractDetail(err));
    } finally {
      setSaving(false);
    }
  }

  if (!inst) return null;

  const category = inst.category as 'school' | 'higher_ed' | 'edtech';
  const subtypeOptions = SUBTYPES[category] ?? [];
  const isEdtech = category === 'edtech';

  const inputClass =
    'w-full rounded-xl border border-gray-200 dark:border-[#363152] bg-[#F9FAFB] dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition';

  return (
    <section className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-6">
      {/* Read-only overview */}
      <h2 className="text-base font-semibold text-[#1B1830] dark:text-gray-100 mb-4">
        {t('profileInstReadOnly', lang)}
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm">
        {[
          [t('profileInstName', lang), inst.name],
          [t('profileInstType', lang), inst.type],
          [t('profileInstCategory', lang), inst.category],
          [t('profileInstPlan', lang), inst.plan],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-[#1B1830] dark:text-gray-200">{value}</p>
          </div>
        ))}
      </div>

      {/* Editable fields */}
      <div className="border-t border-gray-100 dark:border-[#2B2740] pt-5">
        <h3 className="text-sm font-semibold text-[#1B1830] dark:text-gray-100 mb-4">
          {t('profileInstSection', lang)}
        </h3>
        <form onSubmit={handleSave} className="space-y-5 max-w-sm">

          {/* Location */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-[#374151] dark:text-gray-300">
                {t('profileInstLocation', lang)}
              </label>
              {inst.location != null && (
                <VerifiedBadge verified={inst.location_verified} lang={lang} />
              )}
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setSuccess(''); setError(''); }}
              className={inputClass}
              placeholder={t('profileInstLocationPrompt', lang)}
            />
          </div>

          {/* Student count */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-[#374151] dark:text-gray-300">
                {t('profileInstStudentCount', lang)}
              </label>
              {inst.student_count != null && (
                <VerifiedBadge verified={inst.student_count_verified} lang={lang} />
              )}
            </div>
            <input
              type="number"
              min="0"
              value={studentCount}
              onChange={(e) => { setStudentCount(e.target.value); setSuccess(''); setError(''); }}
              className={inputClass}
              placeholder="e.g. 1200"
            />
          </div>

          {/* Staff count */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-[#374151] dark:text-gray-300">
                {t('profileInstStaffCount', lang)}
              </label>
              {inst.staff_count != null && (
                <VerifiedBadge verified={inst.staff_count_verified} lang={lang} />
              )}
            </div>
            <input
              type="number"
              min="0"
              value={staffCount}
              onChange={(e) => { setStaffCount(e.target.value); setSuccess(''); setError(''); }}
              className={inputClass}
              placeholder="e.g. 80"
            />
          </div>

          {/* Institution subtype */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-[#374151] dark:text-gray-300">
                {t('profileInstSubtype', lang)}
              </label>
              {inst.institution_subtype != null && (
                <VerifiedBadge verified={inst.institution_subtype_verified} lang={lang} />
              )}
            </div>
            {isEdtech ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                {t('profileInstSubtypeNA', lang)}
              </p>
            ) : (
              <select
                value={subtype}
                onChange={(e) => { setSubtype(e.target.value); setSuccess(''); setError(''); }}
                className={inputClass}
              >
                <option value="">{t('profileInstSubtypePrompt', lang)}</option>
                {subtypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          {success && (
            <p className="text-sm text-[#138808] font-medium">{success}</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || isEdtech && !location && !studentCount && !staffCount}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            {saving ? t('profileInstSaving', lang) : t('profileInstSaveBtn', lang)}
          </button>
        </form>
      </div>
    </section>
  );
}

// ── Account information section ───────────────────────────────────────────────

function AccountSection() {
  const { lang } = useLanguage();
  const { user, setAuth, institution } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProfile()
      .then((p) => {
        setName(p.name ?? '');
        setEmail(p.email ?? '');
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccess('');
    setError('');
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      if (user && institution) {
        setAuth(
          { ...user, display_name: updated.name, email: updated.email },
          institution,
        );
      }
      setSuccess(t('profileSaved', lang));
    } catch (err) {
      const detail = extractDetail(err);
      setError(
        detail.toLowerCase().includes('email already')
          ? t('profileEmailInUse', lang)
          : detail,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-6">
      <h2 className="text-base font-semibold text-[#1B1830] dark:text-gray-100 mb-5">
        {t('profileAccountSection', lang)}
      </h2>
      <form onSubmit={handleSave} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-1">
            {t('profileNameLabel', lang)}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSuccess(''); setError(''); }}
            className="w-full rounded-xl border border-gray-200 dark:border-[#363152] bg-[#F9FAFB] dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-1">
            {t('profileEmailLabel', lang)}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSuccess(''); setError(''); }}
            className="w-full rounded-xl border border-gray-200 dark:border-[#363152] bg-[#F9FAFB] dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition"
          />
        </div>

        {success && (
          <p className="text-sm text-[#138808] font-medium">{success}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          {saving ? t('profileSaving', lang) : t('profileSaveBtn', lang)}
        </button>
      </form>
    </section>
  );
}

// ── Change password section ───────────────────────────────────────────────────

function PasswordSection() {
  const { lang } = useLanguage();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changing, setChanging] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (newPw !== confirmPw) {
      setError(t('profilePwMismatch', lang));
      return;
    }

    setChanging(true);
    try {
      await changePassword({ old_password: oldPw, new_password: newPw });
      setSuccess(t('profilePwChanged', lang));
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      const detail = extractDetail(err);
      setError(
        detail.toLowerCase().includes('incorrect')
          ? t('profilePwWrong', lang)
          : detail,
      );
    } finally {
      setChanging(false);
    }
  }

  function PasswordInput({
    value,
    onChange,
    label,
    show,
    onToggle,
  }: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    show: boolean;
    onToggle: () => void;
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-1">
          {label}
        </label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => { onChange(e.target.value); setSuccess(''); setError(''); }}
            className="w-full rounded-xl border border-gray-200 dark:border-[#363152] bg-[#F9FAFB] dark:bg-[#0E0D1A] text-[#111827] dark:text-gray-100 px-4 py-2.5 pr-14 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition"
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            tabIndex={-1}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-6">
      <h2 className="text-base font-semibold text-[#1B1830] dark:text-gray-100 mb-5">
        {t('profilePasswordSection', lang)}
      </h2>
      <form onSubmit={handleChange} className="space-y-4 max-w-sm">
        <PasswordInput
          value={oldPw}
          onChange={setOldPw}
          label={t('profileCurrentPw', lang)}
          show={showOld}
          onToggle={() => setShowOld((p) => !p)}
        />
        <PasswordInput
          value={newPw}
          onChange={setNewPw}
          label={t('profileNewPw', lang)}
          show={showNew}
          onToggle={() => setShowNew((p) => !p)}
        />
        <PasswordInput
          value={confirmPw}
          onChange={setConfirmPw}
          label={t('profileConfirmPw', lang)}
          show={showNew}
          onToggle={() => setShowNew((p) => !p)}
        />

        {success && (
          <p className="text-sm text-[#138808] font-medium">{success}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={changing || !oldPw || !newPw || !confirmPw}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          {changing ? t('profileChangingPw', lang) : t('profileChangePwBtn', lang)}
        </button>
      </form>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div className="h-full overflow-y-auto bg-[#F9FAFB] dark:bg-[#0E0D1A] px-8 py-8 space-y-6">
      <AccountSection />
      <InstitutionDetailsSection />
      <PasswordSection />
    </div>
  );
}
