'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import { getAssessmentQuestions, submitAssessment } from '@/lib/api';
import type { QuestionOut, ResponseIn } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { t, QUESTION_HI, RISK_CATEGORY_HI } from '@/lib/translations';
import { AssessmentSkeleton } from '@/components/assessment/AssessmentSkeleton';

// Canonical risk-category order — must match scoring.py RISK_CATEGORIES
const RISK_CATEGORIES = [
  'Consent Management',
  'Data Security',
  'Vendor / Data Processor Risk',
  'Data Retention',
  "Children's Data",
  'Breach Readiness',
  'Cross-Border Transfer',
  'Grievance Redressal',
] as const;

const SCALE_OPTIONS = [0, 1, 2, 3, 4] as const;
const SCALE_LABEL_KEYS = ['scale0', 'scale1', 'scale2', 'scale3', 'scale4'] as const;

function scaleColor(v: number): string {
  if (v === 0) return '#DC2626';
  if (v === 1) return '#F97316';
  if (v === 2) return '#EAB308';
  if (v === 3) return '#84CC16';
  return '#138808';
}

// ── ScaleControl ──────────────────────────────────────────────────────────────

function ScaleControl({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
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

// ── BooleanControl ────────────────────────────────────────────────────────────

function BooleanControl({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
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

// ── QuestionRow ───────────────────────────────────────────────────────────────

function QuestionRow({
  question,
  value,
  onChange,
  index,
}: {
  question: QuestionOut;
  value: number | undefined;
  onChange: (v: number) => void;
  index: number;
}) {
  const { lang } = useLanguage();
  const displayText =
    lang === 'hi' ? (QUESTION_HI[question.question_text] ?? question.question_text) : question.question_text;

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

// ── ReviewScreen ──────────────────────────────────────────────────────────────

function ReviewScreen({
  grouped,
  answers,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  grouped: Record<string, QuestionOut[]>;
  answers: Record<string, number>;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
}) {
  const { lang } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-6">
        <h2 className="text-xl font-bold text-[#1B1830] dark:text-gray-100 mb-2">{t('wizardReviewTitle', lang)}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wizardReviewBody', lang)}</p>
      </div>

      {RISK_CATEGORIES.map((cat) => {
        const questions = grouped[cat] ?? [];
        if (!questions.length) return null;
        const catName = lang === 'hi' ? (RISK_CATEGORY_HI[cat] ?? cat) : cat;
        const answered = questions.filter((q) => answers[q.id] !== undefined).length;
        return (
          <div key={cat} className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#1B1830] dark:text-gray-100 text-sm">{catName}</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {answered}/{questions.length}
              </span>
            </div>
            <div className="space-y-2">
              {questions.map((q, i) => {
                const v = answers[q.id];
                const displayText =
                  lang === 'hi' ? (QUESTION_HI[q.question_text] ?? q.question_text) : q.question_text;
                return (
                  <div key={q.id} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="flex-1 text-gray-600 leading-relaxed line-clamp-2">{displayText}</span>
                    <span
                      className="shrink-0 font-bold ml-2"
                      style={{ color: v !== undefined ? scaleColor(v) : '#9CA3AF' }}
                    >
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
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2B2740] disabled:opacity-50 transition"
        >
          <ChevronLeft size={16} />
          {t('wizardBack', lang)}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t('wizardSubmitting', lang)}
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              {t('wizardSubmit', lang)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main wizard page ──────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [questions, setQuestions] = useState<QuestionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [stepIndex, setStepIndex] = useState(0); // 0-7 = categories; 8 = review
  const [stepError, setStepError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const qs = await getAssessmentQuestions();
      setQuestions(qs);
    } catch {
      setLoadError(t('wizardErrorText', lang));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // Group questions by risk category, preserving canonical order
  const grouped: Record<string, QuestionOut[]> = {};
  for (const cat of RISK_CATEGORIES) grouped[cat] = [];
  for (const q of questions) {
    if (grouped[q.category] !== undefined) grouped[q.category].push(q);
  }

  const steps = RISK_CATEGORIES.filter((cat) => (grouped[cat]?.length ?? 0) > 0);
  const totalSteps = steps.length; // Should be 8
  const isReview = stepIndex >= totalSteps;
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
      const responses: ResponseIn[] = Object.entries(answers).map(([question_id, answer_value]) => ({
        question_id,
        answer_value,
      }));
      await submitAssessment(responses);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setSubmitError(msg || t('wizardSubmitError', lang));
      setSubmitting(false);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return <AssessmentSkeleton />;
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm text-gray-600">{loadError}</p>
        <button
          onClick={loadQuestions}
          className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          {t('wizardRetry', lang)}
        </button>
      </div>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto bg-[#F9FAFB] dark:bg-[#0E0D1A]">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1B1830] dark:text-gray-100">{t('wizardTitle', lang)}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('wizardNoPartial', lang)}</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {isReview
                ? t('wizardReviewTitle', lang)
                : `${t('wizardStepLabel', lang)} ${stepIndex + 1} ${t('wizardOfLabel', lang)} ${totalSteps}`}
            </span>
            <span>{isReview ? '100%' : `${Math.round(((stepIndex) / totalSteps) * 100)}%`}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-[#2B2740] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                width: isReview ? '100%' : `${((stepIndex) / totalSteps) * 100}%`,
              }}
            />
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all"
                style={{
                  background:
                    i < stepIndex ? '#138808'
                    : i === stepIndex && !isReview ? '#4F46E5'
                    : '#E5E7EB',
                }}
              />
            ))}
          </div>
        </div>

        {/* Review screen */}
        {isReview && (
          <ReviewScreen
            grouped={grouped}
            answers={answers}
            onBack={handleBack}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}

        {/* Category step */}
        {!isReview && currentCategory && (
          <div className="space-y-4">
            {/* Step title */}
            <div className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] px-6 py-4">
              <p className="text-xs font-medium text-[#4F46E5] uppercase tracking-wider mb-1">
                {t('wizardStepLabel', lang)} {stepIndex + 1} — {steps.length} {t('wizardOfLabel', lang)}
              </p>
              <h2 className="text-lg font-bold text-[#1B1830] dark:text-gray-100">
                {lang === 'hi' ? (RISK_CATEGORY_HI[currentCategory] ?? currentCategory) : currentCategory}
              </h2>
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

            {/* Validation error */}
            {stepError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                <AlertCircle size={16} className="shrink-0" />
                {stepError}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-[#2B2740] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2B2740] transition"
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
                {stepIndex === totalSteps - 1 ? t('wizardReviewBtn', lang) : t('wizardNext', lang)}
                {stepIndex < totalSteps - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
