'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { t, type TranslationKey, RISK_CATEGORY_HI, CATEGORY_TO_SLUG } from '@/lib/translations';

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

// Maturity band → risk-framing display label. PRESENTATION ONLY — the underlying
// score bands and scoring.py thresholds are unchanged. Good→LOW, Moderate→MEDIUM,
// Critical→HIGH.
function bandDisplay(score: number): { levelKey: TranslationKey; color: string } {
  if (score > 70) return { levelKey: 'levelLow', color: 'var(--risk-low)' };
  if (score > 40) return { levelKey: 'levelMedium', color: 'var(--risk-med)' };
  return { levelKey: 'levelHigh', color: 'var(--risk-high)' };
}

export function CategoryTable({
  latest,
  previous,
  attemptId,
}: {
  latest: Record<string, number>;
  previous: Record<string, number> | null;
  attemptId: string;
}) {
  const { lang } = useLanguage();

  return (
    <div className="bg-surface rounded-2xl border border-line p-6">
      <h3 className="font-semibold text-ink text-base mb-4">{t('catTableTitle', lang)}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-line">
              <th className="py-2 pr-3 font-medium">{t('catColCategory', lang)}</th>
              <th className="py-2 pr-3 font-medium w-2/5">{t('catColScore', lang)}</th>
              <th className="py-2 pr-3 font-medium">{t('catColLevel', lang)}</th>
              <th className="py-2 font-medium text-center">{t('catColTrend', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {RISK_CATEGORIES.map((cat) => {
              const score = latest[cat] ?? 0;
              const { levelKey, color } = bandDisplay(score);
              const displayName = lang === 'hi' ? RISK_CATEGORY_HI[cat] ?? cat : cat;
              const slug = CATEGORY_TO_SLUG[cat];

              // Trend: compare against second-latest attempt if present.
              let trend: 'up' | 'down' | 'flat' = 'flat';
              if (previous && previous[cat] !== undefined) {
                const diff = score - previous[cat];
                trend = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat';
              }

              return (
                <tr key={cat} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-3 align-middle">
                    {slug ? (
                      <Link
                        href={`/assessment/${attemptId}/category/${slug}`}
                        className="text-ink hover:text-accent font-medium transition"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <span className="text-ink font-medium">{displayName}</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="text-ink font-semibold w-9 tabular-nums">{Math.round(score)}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden min-w-[60px]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: color }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-bold text-white"
                      style={{ background: color }}
                    >
                      {t(levelKey, lang)}
                    </span>
                  </td>
                  <td className="py-3 align-middle text-center">
                    {trend === 'up' && <TrendingUp size={16} className="inline" style={{ color: 'var(--risk-low)' }} />}
                    {trend === 'down' && <TrendingDown size={16} className="inline" style={{ color: 'var(--risk-high)' }} />}
                    {trend === 'flat' && <Minus size={16} className="inline text-muted" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
