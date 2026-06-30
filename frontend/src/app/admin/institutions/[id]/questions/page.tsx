'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Loader2, ChevronDown, ChevronRight, Plus, LogOut, ShieldCheck, Check, X, Trash2,
} from 'lucide-react';
import {
  adminListInstitutionQuestions, adminUpdateInstitutionQuestion,
  adminCreateInstitutionQuestion, adminDeleteInstitutionQuestion,
  adminListInstitutions,
} from '@/lib/api';
import type { AdminQuestion, InstitutionQuestionCreate } from '@/lib/types';
import { useAdminAuth } from '@/context/AdminAuthContext';

// The 8 fixed risk categories — must match backend scoring.RISK_CATEGORIES.
const RISK_CATEGORIES = [
  'Consent Management',
  'Data Security',
  'Vendor / Data Processor Risk',
  'Data Retention',
  "Children's Data",
  'Breach Readiness',
  'Cross-Border Transfer',
  'Grievance Redressal',
];

// ── Editable question row (with delete) ──────────────────────────────────────

function QuestionRow({
  institutionId,
  question,
  onSaved,
  onDeleted,
}: {
  institutionId: string;
  question: AdminQuestion;
  onSaved: (q: AdminQuestion) => void;
  onDeleted: (id: string) => void;
}) {
  const [text, setText] = useState(question.question_text);
  const [section, setSection] = useState(question.dpdp_section ?? '');
  const [weight, setWeight] = useState(String(question.weight));
  const [answerType, setAnswerType] = useState<'scale' | 'boolean'>(question.answer_type);
  const [isActive, setIsActive] = useState(question.is_active);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');

  const dirty =
    text !== question.question_text ||
    section !== (question.dpdp_section ?? '') ||
    Number(weight) !== question.weight ||
    answerType !== question.answer_type ||
    isActive !== question.is_active;

  async function save() {
    setError('');
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) { setError('Weight must be a positive number'); return; }
    if (!text.trim()) { setError('Question text cannot be blank'); return; }
    setSaving(true);
    try {
      const updated = await adminUpdateInstitutionQuestion(institutionId, question.id, {
        question_text: text.trim(),
        dpdp_section: section.trim() || null,
        weight: w,
        answer_type: answerType,
        is_active: isActive,
      });
      onSaved(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^API \d+:\s*/, '') : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this question? If it has historical responses, deactivate it instead.')) return;
    setError('');
    setDeleting(true);
    try {
      await adminDeleteInstitutionQuestion(institutionId, question.id);
      onDeleted(question.id);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^API \d+:\s*/, '') : 'Delete failed');
      setDeleting(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isActive ? 'border-[#1A2756] bg-[#0F1A3E]' : 'border-[#1A2756] bg-[#0A0F2C] opacity-75'
      }`}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full text-sm text-gray-100 bg-[#0A0F2C] border border-[#1A2756] rounded-lg px-3 py-2 resize-y outline-none focus:border-[#FF9933]"
      />
      <div className="flex flex-wrap items-end gap-3 mt-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">DPDP Section</span>
          <input
            type="text" value={section} onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Section 8(5)"
            className="w-36 text-sm bg-[#0A0F2C] text-gray-100 border border-[#1A2756] rounded-lg px-3 py-1.5 outline-none focus:border-[#FF9933]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Weight</span>
          <input
            type="number" step="0.25" min="0.25" value={weight} onChange={(e) => setWeight(e.target.value)}
            className="w-24 text-sm bg-[#0A0F2C] text-gray-100 border border-[#1A2756] rounded-lg px-3 py-1.5 outline-none focus:border-[#FF9933]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Answer type</span>
          <select
            value={answerType} onChange={(e) => setAnswerType(e.target.value as 'scale' | 'boolean')}
            className="text-sm bg-[#0A0F2C] text-gray-100 border border-[#1A2756] rounded-lg px-3 py-1.5 outline-none focus:border-[#FF9933]"
          >
            <option value="scale">Scale (0–4)</option>
            <option value="boolean">Boolean (Yes/No)</option>
          </select>
        </label>

        <button
          type="button" onClick={() => setIsActive((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
            isActive ? 'border-[#138808] text-[#138808] bg-[#138808]/10' : 'border-gray-600 text-gray-400 bg-[#0A0F2C]'
          }`}
        >
          {isActive ? <Check size={13} /> : <X size={13} />}
          {isActive ? 'Active' : 'Inactive'}
        </button>

        <div className="ml-auto flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          {savedFlash && !dirty && (
            <span className="text-xs text-[#138808] font-medium flex items-center gap-1">
              <Check size={13} /> Saved
            </span>
          )}
          <button
            type="button" onClick={remove} disabled={deleting}
            title="Delete question"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
          <button
            type="button" onClick={save} disabled={!dirty || saving}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-40 transition hover:opacity-90"
            style={{ background: dirty ? 'linear-gradient(135deg, #FF9933, #138808)' : '#374151' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add-question inline form ─────────────────────────────────────────────────

function AddQuestionForm({
  institutionId,
  category,
  onCreated,
  onCancel,
}: {
  institutionId: string;
  category: string;
  onCreated: (q: AdminQuestion) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [section, setSection] = useState('');
  const [weight, setWeight] = useState('1.0');
  const [answerType, setAnswerType] = useState<'scale' | 'boolean'>('scale');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    setError('');
    const w = Number(weight);
    if (!text.trim()) { setError('Question text cannot be blank'); return; }
    if (!Number.isFinite(w) || w <= 0) { setError('Weight must be a positive number'); return; }
    setSaving(true);
    try {
      const payload: InstitutionQuestionCreate = {
        category,
        question_text: text.trim(),
        dpdp_section: section.trim() || null,
        weight: w,
        answer_type: answerType,
      };
      const created = await adminCreateInstitutionQuestion(institutionId, payload);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^API \d+:\s*/, '') : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-[#FF9933]/40 p-4 bg-[#FF9933]/5">
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={2}
        placeholder="New question text…"
        className="w-full text-sm text-gray-100 bg-[#0A0F2C] border border-[#1A2756] rounded-lg px-3 py-2 resize-y outline-none focus:border-[#FF9933]"
      />
      <div className="flex flex-wrap items-end gap-3 mt-3">
        <input
          type="text" value={section} onChange={(e) => setSection(e.target.value)}
          placeholder="DPDP Section"
          className="w-36 text-sm bg-[#0A0F2C] text-gray-100 border border-[#1A2756] rounded-lg px-3 py-1.5 outline-none focus:border-[#FF9933]"
        />
        <input
          type="number" step="0.25" min="0.25" value={weight} onChange={(e) => setWeight(e.target.value)}
          className="w-24 text-sm bg-[#0A0F2C] text-gray-100 border border-[#1A2756] rounded-lg px-3 py-1.5 outline-none focus:border-[#FF9933]"
        />
        <select
          value={answerType} onChange={(e) => setAnswerType(e.target.value as 'scale' | 'boolean')}
          className="text-sm bg-[#0A0F2C] text-gray-100 border border-[#1A2756] rounded-lg px-3 py-1.5 outline-none focus:border-[#FF9933]"
        >
          <option value="scale">Scale (0–4)</option>
          <option value="boolean">Boolean (Yes/No)</option>
        </select>
        <div className="ml-auto flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button type="button" onClick={onCancel} className="text-sm font-medium px-3 py-1.5 rounded-lg text-gray-400 hover:bg-white/5">
            Cancel
          </button>
          <button
            type="button" onClick={create} disabled={saving}
            style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50 hover:opacity-90"
          >
            {saving ? 'Adding…' : 'Add question'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Collapsible category section ─────────────────────────────────────────────

function CategorySection({
  category,
  institutionId,
  questions,
  onSaved,
  onCreated,
  onDeleted,
}: {
  category: string;
  institutionId: string;
  questions: AdminQuestion[];
  onSaved: (q: AdminQuestion) => void;
  onCreated: (q: AdminQuestion) => void;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const activeCount = questions.filter((q) => q.is_active).length;

  return (
    <div className="rounded-2xl border border-[#1A2756] bg-[#0F1A3E] overflow-hidden">
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#1A2756] transition"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
          <span className="font-semibold text-gray-100">{category}</span>
        </div>
        <span className="text-xs text-gray-500">{activeCount} active · {questions.length} total</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          {questions.map((q) => (
            <QuestionRow
              key={q.id} institutionId={institutionId} question={q}
              onSaved={onSaved} onDeleted={onDeleted}
            />
          ))}

          {adding ? (
            <AddQuestionForm
              institutionId={institutionId} category={category}
              onCreated={(q) => { onCreated(q); setAdding(false); }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button" onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#FF9933] hover:underline"
            >
              <Plus size={15} /> Add question to {category}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InstitutionQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const institutionId = String(params.id);
  const { admin, isLoading: authLoading, logout } = useAdminAuth();

  const [institutionName, setInstitutionName] = useState('');
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !admin) router.replace('/admin/login');
  }, [authLoading, admin, router]);

  useEffect(() => {
    if (!admin) return;
    setLoading(true);
    setError('');
    // Use allSettled so a questions 404 doesn't also kill the institution name fetch.
    Promise.allSettled([
      adminListInstitutionQuestions(institutionId),
      adminListInstitutions(),
    ]).then(([qsResult, instsResult]) => {
      if (qsResult.status === 'fulfilled') {
        setQuestions(qsResult.value);
      } else {
        setError('Failed to load questions — the institution may not exist or the server needs a restart.');
      }
      if (instsResult.status === 'fulfilled') {
        setInstitutionName(instsResult.value.find((i) => i.id === institutionId)?.name ?? '');
      }
    }).finally(() => setLoading(false));
  }, [institutionId, admin]);

  const grouped = useMemo(() => {
    const map: Record<string, AdminQuestion[]> = {};
    for (const cat of RISK_CATEGORIES) map[cat] = [];
    for (const q of questions) {
      if (!map[q.category]) map[q.category] = [];
      map[q.category].push(q);
    }
    return map;
  }, [questions]);

  function applyUpdate(updated: AdminQuestion) {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  }
  function applyCreate(created: AdminQuestion) {
    setQuestions((prev) => [...prev, created]);
  }
  function applyDelete(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleLogout() {
    await logout();
    router.replace('/admin/login');
  }

  if (authLoading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0F2C]">
        <Loader2 size={26} className="animate-spin text-[#FF9933]" />
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
            <h1 className="text-white font-bold text-lg leading-tight">Question Editor</h1>
            <p className="text-[#FF9933] text-xs">Per-institution question set</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-sm">{admin.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-5 flex items-center gap-1.5 flex-wrap">
          <button onClick={() => router.push('/admin/institutions')} className="hover:text-[#FF9933]">Admin</button>
          <span>›</span>
          <button onClick={() => router.push('/admin/institutions')} className="hover:text-[#FF9933]">Institutions</button>
          <span>›</span>
          <span className="text-gray-300">{institutionName || '…'}</span>
          <span>›</span>
          <span className="text-gray-300">Questions</span>
        </nav>

        <p className="text-xs text-gray-500 mb-5">
          These questions belong to <strong className="text-gray-300">{institutionName || '…'}</strong> only.
          Edits here affect just this institution and only <strong>future</strong> assessments — past
          attempts keep the question text and weight they were taken with. They are independent of the
          category template.
        </p>

        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
            <Loader2 size={22} className="animate-spin text-[#FF9933]" />
            <span className="text-sm">Loading questions…</span>
          </div>
        )}

        {error && !loading && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {RISK_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat} category={cat} institutionId={institutionId}
                questions={grouped[cat] ?? []}
                onSaved={applyUpdate} onCreated={applyCreate} onDeleted={applyDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
