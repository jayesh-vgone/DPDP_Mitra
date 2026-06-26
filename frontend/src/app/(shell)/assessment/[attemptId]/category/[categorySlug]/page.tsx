'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Tag } from 'lucide-react';
import { getCategoryDetail } from '@/lib/api';
import type { CategoryDetailOut } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { t, RISK_CATEGORY_HI } from '@/lib/translations';

function MaturityBadge({ band }: { band: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Critical: { bg: '#FEE2E2', text: '#DC2626' },
    Moderate: { bg: '#EEEDFB', text: '#4F46E5' },
    Good:     { bg: '#DCFCE7', text: '#138808' },
  };
  const style = colors[band] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold"
      style={{ background: style.bg, color: style.text }}
    >
      {band}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score > 70 ? '#138808' : score > 40 ? '#4F46E5' : '#DC2626';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 dark:bg-[#2B2740] rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all"
          style={{ width: `${Math.max(score, 2)}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold w-12 text-right" style={{ color }}>
        {Math.round(score)}%
      </span>
    </div>
  );
}

function AnswerDisplay({ answerType, value, lang }: { answerType: 'scale' | 'boolean'; value: number; lang: 'en' | 'hi' }) {
  if (answerType === 'boolean') {
    return value >= 2
      ? <span className="text-[#138808] font-semibold">{t('answerYes', lang)}</span>
      : <span className="text-[#DC2626] font-semibold">{t('answerNo', lang)}</span>;
  }
  const labels: Record<number, 'scale0' | 'scale1' | 'scale2' | 'scale3' | 'scale4'> = {
    0: 'scale0', 1: 'scale1', 2: 'scale2', 3: 'scale3', 4: 'scale4',
  };
  const key = labels[Math.round(value)] ?? 'scale0';
  const textColor = value >= 3 ? '#138808' : value >= 2 ? '#4F46E5' : '#DC2626';
  return <span className="font-semibold" style={{ color: textColor }}>{t(key, lang)}</span>;
}

export default function CategoryDrillPage() {
  const { lang } = useLanguage();
  const params = useParams<{ attemptId: string; categorySlug: string }>();
  const { attemptId, categorySlug } = params;

  const [detail, setDetail] = useState<CategoryDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!attemptId || !categorySlug) return;
    setLoading(true);
    setError(false);
    getCategoryDetail(attemptId, categorySlug)
      .then((d) => setDetail(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [attemptId, categorySlug]);

  const categoryDisplayName = detail
    ? (lang === 'hi' ? (RISK_CATEGORY_HI[detail.category] ?? detail.category) : detail.category)
    : '';

  return (
    <div className="h-full overflow-y-auto bg-[#F9FAFB] dark:bg-[#0E0D1A]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A1828] border-b border-gray-200 dark:border-[#2B2740] px-4 sm:px-8 py-5">
        <Link href="/dashboard" className="text-xs font-medium text-[#4F46E5] hover:underline">
          {t('drillBackToDashboard', lang)}
        </Link>
        {detail && (
          <div className="mt-3 flex flex-col gap-2">
            <h2 className="text-xl font-bold text-[#1B1830] dark:text-gray-100">{categoryDisplayName}</h2>
            <div className="flex items-center gap-3 max-w-sm">
              <ScoreBar score={detail.score_pct} />
              <MaturityBadge band={detail.maturity_band} />
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin text-[#4F46E5]" />
          <span className="text-sm">{t('drillLoading', lang)}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">{t('drillError', lang)}</p>
        </div>
      )}

      {detail && !loading && (
        <div className="px-4 sm:px-8 py-8 space-y-6 max-w-4xl">
          {/* Explanation */}
          <div className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{detail.explanation}</p>
          </div>

          {/* Questions table */}
          <div>
            <h3 className="font-semibold text-[#1B1830] dark:text-gray-100 text-sm mb-4">
              {t('drillQuestionsTitle', lang)}
            </h3>
            <div className="space-y-3">
              {detail.questions.map((q, i) => (
                <div key={i} className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-5">
                  <p className="text-sm font-medium text-[#1B1830] dark:text-gray-100 leading-snug mb-3">
                    {q.question_text}
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{t('drillAnswerLabel', lang)}:</span>
                      <AnswerDisplay answerType={q.answer_type} value={q.answer_value} lang={lang} />
                    </span>
                    {q.dpdp_section && (
                      <span className="flex items-center gap-1.5">
                        <Tag size={11} className="text-[#4F46E5]" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('drillDpdpSection', lang)}:</span>
                        <span className="text-[#4F46E5] font-semibold">{q.dpdp_section}</span>
                      </span>
                    )}
                    <span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{t('drillWeight', lang)}:</span>{' '}
                      {q.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
