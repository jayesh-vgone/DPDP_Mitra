'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  SearchCheck,
  CalendarClock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  getInternalAuditStatus,
  startInternalAudit,
  submitInternalAudit,
  getInternalAuditHistory,
} from '@/lib/api';
import type {
  InternalAuditStatus,
  AuditStartResponse,
  AuditSubmitResponse,
  AuditHistoryItem,
  QuestionOut,
  ResponseIn,
} from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { t, QUESTION_HI, RISK_CATEGORY_HI } from '@/lib/translations';

// ── Scale / Boolean controls (duplicated from assessment page to keep the
// audit wizard self-contained — they're small presentational-only components)

const SCALE_OPTIONS = [0, 1, 2, 3, 4] as const;
const SCALE_LABEL_KEYS = ['scale0', 'scale1', 'scale2', 'scale3', 'scale4'] as const;

function scaleColor(v: number): string {
  if (v === 0) return '#DC2626';
  if (v === 1) return '#F97316';
  if (v === 2) return '#EAB308';
  if (v === 3) return '#84CC16';
  return '#138808';
}

function ScaleControl({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const { lang } = useLanguage();
  return (
    <div className="flex gap-2 flex-wrap">
      {SCALE_OPTIONS.map((opt, i) => {
        const selected = value === opt;
        const color = scaleColor(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all min-w-[70px]"
            style={{
              borderColor: selected ? color : '#E5E7EB',
              background: selected ? color : 'white',
              color: selected ? 'white' : '#374151',
            }}
          >
            <span className="text-base font-bold">{opt}</span>
            <span className="text-[10px] font-normal leading-tight text-center">
              {t(SCALE_LABEL_KEYS[i], lang).replace(/^\d — /, '')}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BooleanControl({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const { lang } = useLanguage();
  return (
    <div className="flex gap-3">
      {([4, 0] as const).map((opt) => {
        const isYes = opt === 4;
        const selected = value === opt;
        const color = isYes ? '#138808' : '#DC2626';
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="px-8 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all"
            style={{
              borderColor: selected ? color : '#E5E7EB',
              background: selected ? color : 'white',
              color: selected ? 'white' : '#374151',
            }}
          >
            {isYes ? t('answerYes', lang) : t('answerNo', lang)}
          </button>
        );
      })}
    </div>
  );
}

function QuestionRow({
  question, value, onChange, index,
}: { question: QuestionOut; value: number | undefined; onChange: (v: number) => void; index: number }) {
  const { lang } = useLanguage();
  const displayText = lang === 'hi' ? (QUESTION_HI[question.question_text] ?? question.question_text) : question.question_text;
  return (
    <div className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-5 space-y-4">
      <div className="flex gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-[#EEEDFB] dark:bg-[#4F46E5]/10 flex items-center justify-center text-xs font-bold text-[#4F46E5]">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#1B1830] dark:text-gray-100 leading-relaxed">{displayText}</p>
          {question.dpdp_section && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('wizardDpdpSection', lang)}: {question.dpdp_section}
            </p>
          )}
        </div>
      </div>
      <div className="pl-9">
        {question.answer_type === 'boolean' ? (
          <BooleanControl value={value} onChange={onChange} />
        ) : (
          <ScaleControl value={value} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

// ── Status panel (not yet due / pending) ──────────────────────────────────────

function StatusPanel({ status }: { status: InternalAuditStatus }) {
  const { lang } = useLanguage();
  const isDue = status.is_due;
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  // When start succeeds we receive the question data — lift it to the page via callback
  const [startData, setStartData] = useState<AuditStartResponse | null>(null);

  async function handleStart() {
    setStarting(true);
    setStartError('');
    try {
      const data = await startInternalAudit();
      setStartData(data);
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : 'Failed to start audit.');
      setStarting(false);
    }
  }

  if (startData) {
    return <AuditWizard startData={startData} />;
  }

  const dueStr = status.due_date
    ? new Date(status.due_date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  const daysUntil = status.due_date
    ? Math.max(0, Math.ceil((new Date(status.due_date + 'T00:00:00').getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="bg-surface rounded-2xl border border-line p-8 space-y-6">
      {/* Cycle header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent-soft">
          <SearchCheck size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="font-bold text-ink text-lg">
            {t('auditCycleLabel', lang)} #{status.sequence_number ?? 1}
          </h2>
          <p className="text-xs text-muted">
            {t('auditDueDateLabel', lang)}: <span className="font-semibold">{dueStr}</span>
          </p>
        </div>
        <div className="ml-auto">
          {isDue ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              {t('auditDueSince', lang).replace('{n}', String(status.days_overdue))}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-2 text-muted">
              {t('auditAvailableIn', lang).replace('{n}', String(daysUntil ?? 0))}
            </span>
          )}
        </div>
      </div>

      {/* Target categories */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          {t('auditTargetCategories', lang)}
        </p>
        {status.target_categories.length === 0 ? (
          <p className="text-sm text-muted italic">{t('auditTargetEmpty', lang)}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {status.target_categories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1 rounded-full text-xs font-medium bg-surface-2 text-ink"
              >
                {lang === 'hi' ? (RISK_CATEGORY_HI[cat] ?? cat) : cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Start button */}
      {startError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          {startError}
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!isDue || starting}
        style={isDue ? { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' } : {}}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${
          isDue
            ? 'text-white hover:opacity-90 disabled:opacity-60'
            : 'bg-surface-2 text-muted cursor-not-allowed'
        }`}
      >
        {starting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {lang === 'hi' ? 'शुरू हो रहा है…' : 'Starting…'}
          </>
        ) : isDue ? (
          <>
            <SearchCheck size={16} />
            {t('auditTakeBtn', lang)}
          </>
        ) : (
          <>
            <Clock size={16} />
            {t('auditLockedBtn', lang)}
          </>
        )}
      </button>
    </div>
  );
}

// ── In-progress resume panel ──────────────────────────────────────────────────

function InProgressPanel() {
  const { lang } = useLanguage();
  const [resuming, setResuming] = useState(false);
  const [resumeData, setResumeData] = useState<AuditStartResponse | null>(null);
  const [resumeError, setResumeError] = useState('');

  async function handleResume() {
    setResuming(true);
    setResumeError('');
    try {
      const data = await startInternalAudit(); // returns current questions even if in_progress
      setResumeData(data);
    } catch (err: unknown) {
      setResumeError(err instanceof Error ? err.message : 'Failed to resume audit.');
      setResuming(false);
    }
  }

  if (resumeData) {
    return <AuditWizard startData={resumeData} />;
  }

  return (
    <div className="bg-surface rounded-2xl border border-line p-8 space-y-4 text-center">
      <div className="inline-flex w-12 h-12 rounded-xl items-center justify-center bg-amber-100 dark:bg-amber-900/20 mx-auto">
        <Clock size={22} className="text-amber-600 dark:text-amber-400" />
      </div>
      <h2 className="font-bold text-ink text-lg">{t('auditInProgressTitle', lang)}</h2>
      <p className="text-sm text-muted">{t('auditInProgressBody', lang)}</p>
      {resumeError && (
        <p className="text-sm text-red-600">{resumeError}</p>
      )}
      <button
        type="button"
        onClick={handleResume}
        disabled={resuming}
        style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition"
      >
        {resuming ? <Loader2 size={16} className="animate-spin" /> : <SearchCheck size={16} />}
        {t('auditResumeBtn', lang)}
      </button>
    </div>
  );
}

// ── Audit wizard (embedded on the same page) ──────────────────────────────────

function AuditWizard({ startData }: { startData: AuditStartResponse }) {
  const { lang } = useLanguage();
  const { questions, target_categories, sequence_number } = startData;

  // Group questions by risk category in the order they appear in target_categories
  const grouped: Record<string, QuestionOut[]> = {};
  for (const cat of target_categories) grouped[cat] = [];
  for (const q of questions) {
    if (grouped[q.category] !== undefined) grouped[q.category].push(q);
  }
  const steps = target_categories.filter((cat) => (grouped[cat]?.length ?? 0) > 0);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<AuditSubmitResponse | null>(null);

  const isReview = stepIndex >= steps.length;
  const currentCategory = isReview ? null : steps[stepIndex];
  const currentQuestions = currentCategory ? (grouped[currentCategory] ?? []) : [];

  function setAnswer(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setStepError('');
  }

  function handleNext() {
    const unanswered = currentQuestions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setStepError(t('wizardAnswerAll', lang));
      return;
    }
    setStepError('');
    setStepIndex((i) => i + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setStepError('');
    setSubmitError('');
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const responses: ResponseIn[] = Object.entries(answers).map(
        ([question_id, answer_value]) => ({ question_id, answer_value }),
      );
      const res = await submitInternalAudit({ responses });
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : t('auditSubmitError', lang));
      setSubmitting(false);
    }
  }

  // ── Result screen ─────────────────────────────────────────────────────────

  if (result) {
    const nextDueStr = new Date(result.next_due_date + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    return (
      <div className="bg-surface rounded-2xl border border-line p-8 space-y-6 text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mx-auto"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
          <CheckCircle size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-ink">{t('auditResultTitle', lang)}</h2>
        <p className="text-sm text-muted">
          {t('auditResultBody', lang)} <span className="font-semibold text-ink">{nextDueStr}</span>
        </p>
        {/* Score summary */}
        <div className="text-left grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {Object.entries(result.category_scores).map(([cat, score]) => {
            const band = score <= 40 ? 'HIGH' : score <= 70 ? 'MEDIUM' : 'LOW';
            const color = band === 'HIGH' ? '#DC2626' : band === 'MEDIUM' ? '#F59E0B' : '#16A34A';
            const catName = lang === 'hi' ? (RISK_CATEGORY_HI[cat] ?? cat) : cat;
            return (
              <div key={cat} className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2 border border-line">
                <span className="text-xs text-ink font-medium truncate mr-2">{catName}</span>
                <span className="text-xs font-bold shrink-0" style={{ color }}>
                  {Math.round(score)}/100
                </span>
              </div>
            );
          })}
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          <BarChart3 size={16} />
          {t('auditGoToDashboard', lang)}
        </Link>
      </div>
    );
  }

  // ── Review screen ─────────────────────────────────────────────────────────

  if (isReview) {
    return (
      <div className="space-y-6">
        <div className="bg-surface rounded-2xl border border-line p-6">
          <h2 className="text-xl font-bold text-ink mb-1">{t('wizardReviewTitle', lang)}</h2>
          <p className="text-sm text-muted">{t('wizardReviewBody', lang)}</p>
        </div>

        {steps.map((cat) => {
          const qs = grouped[cat] ?? [];
          const answered = qs.filter((q) => answers[q.id] !== undefined).length;
          const catName = lang === 'hi' ? (RISK_CATEGORY_HI[cat] ?? cat) : cat;
          return (
            <div key={cat} className="bg-surface rounded-2xl border border-line p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ink text-sm">{catName}</h3>
                <span className="text-xs text-muted">{answered}/{qs.length}</span>
              </div>
              <div className="space-y-2">
                {qs.map((q, i) => {
                  const v = answers[q.id];
                  const displayText = lang === 'hi' ? (QUESTION_HI[q.question_text] ?? q.question_text) : q.question_text;
                  return (
                    <div key={q.id} className="flex items-start gap-2 text-xs">
                      <span className="text-muted shrink-0 mt-0.5">{i + 1}.</span>
                      <span className="flex-1 text-ink/70 leading-relaxed line-clamp-2">{displayText}</span>
                      <span className="shrink-0 font-bold ml-2" style={{ color: v !== undefined ? scaleColor(v) : '#9CA3AF' }}>
                        {v !== undefined
                          ? q.answer_type === 'boolean'
                            ? v === 4 ? t('answerYes', lang) : t('answerNo', lang)
                            : String(v)
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {submitError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-line text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50 transition"
          >
            <ChevronLeft size={16} />
            {t('wizardBack', lang)}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('auditSubmitting', lang)}
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                {t('auditSubmit', lang)}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Category step ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-surface rounded-2xl border border-line p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-0.5">
              {t('auditWizardTitle', lang)} — {t('wizardStepLabel', lang)} {stepIndex + 1} / {steps.length}
            </p>
            <h2 className="text-lg font-bold text-ink">
              {lang === 'hi' ? (RISK_CATEGORY_HI[currentCategory!] ?? currentCategory) : currentCategory}
            </h2>
          </div>
          <span className="text-xs text-muted">{Math.round((stepIndex / steps.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
              width: `${(stepIndex / steps.length) * 100}%`,
            }}
          />
        </div>
        <div className="text-xs text-muted">
          {t('auditWizardSubtitle', lang).replace('{n}', String(steps.length))}
        </div>
      </div>

      {/* Questions */}
      {currentQuestions.map((q, i) => (
        <QuestionRow
          key={q.id}
          question={q}
          value={answers[q.id]}
          onChange={(v) => setAnswer(q.id, v)}
          index={i}
        />
      ))}

      {stepError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertCircle size={16} className="shrink-0" />
          {stepError}
        </div>
      )}

      <div className="flex gap-3">
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-line text-sm font-medium text-ink hover:bg-surface-2 transition"
          >
            <ChevronLeft size={16} />
            {t('wizardBack', lang)}
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-90"
        >
          {stepIndex === steps.length - 1 ? t('wizardReviewBtn', lang) : t('wizardNext', lang)}
          {stepIndex < steps.length - 1 && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── History section ───────────────────────────────────────────────────────────

function HistorySection({ history }: { history: AuditHistoryItem[] }) {
  const { lang } = useLanguage();
  if (history.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-line p-6 text-center">
        <p className="text-sm text-muted">{t('auditHistoryEmpty', lang)}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {history.map((h) => {
        const completedStr = new Date(h.completed_at).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        });
        const avgScore = h.target_categories.length > 0
          ? Object.values(h.audit_score_snapshot).reduce((a, b) => a + b, 0) / Object.values(h.audit_score_snapshot).length
          : null;
        return (
          <div key={h.id} className="bg-surface rounded-2xl border border-line p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500 shrink-0" />
                <span className="text-sm font-semibold text-ink">
                  {t('auditHistoryCycle', lang)} #{h.sequence_number}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">{t('auditHistoryCompleted', lang)}: {completedStr}</p>
                {avgScore !== null && (
                  <p className="text-xs font-semibold text-accent">{Math.round(avgScore)}/100 avg</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {h.target_categories.map((cat) => {
                const score = h.audit_score_snapshot[cat];
                const color = score <= 40 ? '#DC2626' : score <= 70 ? '#F59E0B' : '#16A34A';
                const catName = lang === 'hi' ? (RISK_CATEGORY_HI[cat] ?? cat) : cat;
                return (
                  <span key={cat} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 text-xs">
                    <span className="text-ink/80">{catName}</span>
                    {score !== undefined && (
                      <span className="font-bold" style={{ color }}>{Math.round(score)}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InternalAuditPage() {
  const { lang } = useLanguage();
  const [status, setStatus] = useState<InternalAuditStatus | null>(null);
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        getInternalAuditStatus(),
        getInternalAuditHistory().catch(() => [] as AuditHistoryItem[]),
      ]);
      setStatus(s);
      setHistory(h);
    } catch {
      // leave status null, handled below
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="h-full overflow-y-auto bg-app">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            <SearchCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">{t('auditPageTitle', lang)}</h1>
            <p className="text-xs text-muted mt-0.5">{t('auditPageSubtitle', lang)}</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-accent" />
          </div>
        )}

        {/* Content */}
        {!loading && status && (
          <>
            {/* Not applicable — no assessment yet */}
            {status.status === 'not_applicable' && (
              <div className="bg-surface rounded-2xl border border-line p-8 text-center space-y-4">
                <div className="inline-flex w-12 h-12 rounded-xl items-center justify-center bg-accent-soft mx-auto">
                  <CalendarClock size={22} className="text-accent" />
                </div>
                <h2 className="font-bold text-ink text-lg">{t('auditNotApplicableTitle', lang)}</h2>
                <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                  {t('auditNotApplicableBody', lang)}
                </p>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                >
                  {t('auditGoToAssessment', lang)}
                </Link>
              </div>
            )}

            {/* Pending (due or not yet due) */}
            {status.status === 'pending' && <StatusPanel status={status} />}

            {/* In progress */}
            {status.status === 'in_progress' && <InProgressPanel />}
          </>
        )}

        {/* History (always shown if available, below the current status) */}
        {!loading && history.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-ink">{t('auditHistoryTitle', lang)}</h2>
            <HistorySection history={history} />
          </div>
        )}

      </div>
    </div>
  );
}
