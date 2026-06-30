'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck, ChevronDown, ChevronRight, Clock, Loader2, LogOut, Search, ShieldCheck,
  ListChecks,
} from 'lucide-react';
import { adminListInstitutions, adminVerifyField } from '@/lib/api';
import type { AdminInstitution, InstitutionCategory } from '@/lib/types';
import { useAdminAuth } from '@/context/AdminAuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<InstitutionCategory, string> = {
  school: 'School',
  higher_ed: 'Higher Ed',
  edtech: 'EdTech',
};

const VERIFIABLE_FIELDS: {
  key: 'location' | 'student_count' | 'staff_count' | 'institution_subtype';
  label: string;
  verifiedKey: keyof AdminInstitution;
}[] = [
  { key: 'location', label: 'Location', verifiedKey: 'location_verified' },
  { key: 'student_count', label: 'Student Count', verifiedKey: 'student_count_verified' },
  { key: 'staff_count', label: 'Staff Count', verifiedKey: 'staff_count_verified' },
  { key: 'institution_subtype', label: 'Institution Subtype', verifiedKey: 'institution_subtype_verified' },
];

// ── Verify button with loading state ─────────────────────────────────────────

function VerifyButton({
  institutionId,
  field,
  disabled,
  onVerified,
}: {
  institutionId: string;
  field: 'location' | 'student_count' | 'staff_count' | 'institution_subtype';
  disabled: boolean;
  onVerified: (updated: AdminInstitution) => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [flash, setFlash] = useState(false);
  const [err, setErr] = useState('');

  async function handleVerify() {
    setErr('');
    setVerifying(true);
    try {
      const updated = await adminVerifyField(institutionId, field);
      onVerified(updated);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setVerifying(false);
    }
  }

  if (flash) {
    return (
      <span className="text-xs text-[#138808] font-medium flex items-center gap-1">
        <BadgeCheck size={13} /> Verified
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleVerify}
        disabled={disabled || verifying}
        className="text-xs px-3 py-1 rounded-lg bg-[#FF9933]/10 text-[#FF9933] hover:bg-[#FF9933]/20 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
      >
        {verifying && <Loader2 size={11} className="animate-spin" />}
        {verifying ? 'Verifying…' : 'Verify'}
      </button>
      {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
    </div>
  );
}

// ── Expanded institution detail ────────────────────────────────────────────────

function InstitutionDetail({
  inst,
  onUpdate,
}: {
  inst: AdminInstitution;
  onUpdate: (updated: AdminInstitution) => void;
}) {
  return (
    <div className="border-t border-[#1A2756] mt-1 pt-4 pb-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {VERIFIABLE_FIELDS.map(({ key, label, verifiedKey }) => {
        const value = inst[key as keyof AdminInstitution];
        const verified = inst[verifiedKey] as boolean;
        const hasValue = value !== null && value !== undefined;

        return (
          <div key={key} className="flex items-start gap-3 bg-[#0A0F2C] rounded-xl px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-200 break-words">
                {hasValue ? String(value) : <span className="text-gray-600 italic">Not set</span>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
              {hasValue && (
                verified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[#138808] bg-green-900/20 px-2 py-0.5 rounded-full border border-green-800">
                    <BadgeCheck size={11} /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-800">
                    <Clock size={11} /> Pending
                  </span>
                )
              )}
              {hasValue && !verified && (
                <VerifyButton
                  institutionId={inst.id}
                  field={key}
                  disabled={false}
                  onVerified={onUpdate}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Institution row ────────────────────────────────────────────────────────────

function InstitutionRow({
  inst,
  onUpdate,
  onManageQuestions,
}: {
  inst: AdminInstitution;
  onUpdate: (updated: AdminInstitution) => void;
  onManageQuestions: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const updated = inst.last_updated
    ? new Date(inst.last_updated).toLocaleDateString()
    : '—';

  return (
    <div className="border border-[#1A2756] rounded-xl overflow-hidden">
      <div className="w-full flex items-center justify-between px-5 py-3.5 bg-[#0F1A3E]">
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-3 min-w-0 text-left flex-1 hover:opacity-90"
        >
          <span className="text-sm font-medium text-gray-100 truncate">{inst.name}</span>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#FF9933]/10 text-[#FF9933] border border-[#FF9933]/20">
            {CATEGORY_LABEL[inst.category]}
          </span>
        </button>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="hidden sm:inline text-xs text-gray-500" title={`Last updated ${updated}`}>
            {inst.question_count} question{inst.question_count !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onManageQuestions(inst.id)}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-[#FF9933]/10 text-[#FF9933] hover:bg-[#FF9933]/20 font-medium transition"
          >
            <ListChecks size={13} /> Questions
          </button>
          {inst.pending_count > 0 ? (
            <span className="hidden sm:inline text-xs px-2.5 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800">
              {inst.pending_count} pending
            </span>
          ) : (
            <span className="hidden sm:flex text-xs px-2.5 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-800 items-center gap-1">
              <BadgeCheck size={11} /> All clear
            </span>
          )}
          <button onClick={() => setOpen((p) => !p)} className="text-gray-400">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
      {open && <InstitutionDetail inst={inst} onUpdate={onUpdate} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminInstitutionsPage() {
  const router = useRouter();
  const { admin, isLoading, logout } = useAdminAuth();

  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoading && !admin) {
      router.replace('/admin/login');
    }
  }, [isLoading, admin, router]);

  function loadInstitutions(q: string) {
    setFetching(true);
    setFetchError('');
    adminListInstitutions(q || undefined)
      .then(setInstitutions)
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    if (!isLoading && admin) {
      loadInstitutions('');
    }
  }, [isLoading, admin]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadInstitutions(val), 350);
  }

  function handleUpdate(updated: AdminInstitution) {
    setInstitutions((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i)),
    );
  }

  async function handleLogout() {
    await logout();
    router.replace('/admin/login');
  }

  const displayed = pendingOnly
    ? institutions.filter((i) => i.pending_count > 0)
    : institutions;

  const totalPending = institutions.filter((i) => i.pending_count > 0).length;

  if (isLoading || (!admin && !isLoading)) {
    return (
      <div className="min-h-screen bg-[#0A0F2C] flex items-center justify-center">
        <Loader2 size={28} className="text-[#FF9933] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#0A0F2C]">
      {/* Header */}
      <header className="bg-[#0F1A3E] border-b border-[#1A2756] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#FF9933] p-1.5 rounded-lg">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">EduPrivacy Admin</h1>
            <p className="text-xs text-[#FF9933]">Institution Verification</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/questions')}
            className="text-xs text-gray-400 hover:text-gray-200 transition"
          >
            Templates
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Institutions</h2>
            {totalPending > 0 && (
              <p className="text-sm text-amber-400 mt-0.5">
                {totalPending} institution{totalPending !== 1 ? 's' : ''} with pending verifications
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by institution name…"
              className="w-full bg-[#0F1A3E] border border-[#1A2756] rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-[#FF9933] transition"
            />
          </div>
          <button
            onClick={() => setPendingOnly((p) => !p)}
            className={`shrink-0 text-xs px-4 py-2.5 rounded-xl border font-medium transition ${
              pendingOnly
                ? 'bg-amber-900/30 border-amber-700 text-amber-400'
                : 'bg-[#0F1A3E] border-[#1A2756] text-gray-400 hover:border-[#FF9933] hover:text-[#FF9933]'
            }`}
          >
            {pendingOnly ? '✕ Clear filter' : 'Pending only'}
          </button>
        </div>

        {/* Content */}
        {fetching ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="text-[#FF9933] animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-8 text-red-400 text-sm">{fetchError}</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {pendingOnly ? 'No institutions with pending verifications.' : 'No institutions found.'}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((inst) => (
              <InstitutionRow
                key={inst.id}
                inst={inst}
                onUpdate={handleUpdate}
                onManageQuestions={(id) => router.push(`/admin/institutions/${id}/questions`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
