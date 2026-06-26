'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useCountUp } from '@/hooks/useCountUp';
import { t, type TranslationKey } from '@/lib/translations';

const RADIUS = 70;
const CX = 100;
const CY = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getStatus(score: number): { labelKey: TranslationKey; color: string } {
  if (score > 70) return { labelKey: 'statusGood', color: 'var(--risk-low)' };
  if (score > 40) return { labelKey: 'statusModerate', color: 'var(--risk-med)' };
  return { labelKey: 'statusCritical', color: 'var(--risk-high)' };
}

/**
 * Pure donut visual (no card chrome) so it can be embedded inside the
 * Dashboard's Overall Score card. Arc re-themed to the indigo→violet accent:
 * indigo fills 0–50%, violet fills 50–score%.
 */
export function ComplianceScore({ score }: { score: number }) {
  const { lang } = useLanguage();
  // Status word/colour stay on the final score so they don't flicker through
  // bands while the ring fills.
  const { labelKey, color } = getStatus(score);

  // Animate ring + centre number together from 0 → score on every mount.
  const animated = useCountUp(score);

  const firstEnd = Math.min(animated, 50);
  const firstFilled = (firstEnd / 100) * CIRCUMFERENCE;
  const secondEnd = Math.max(0, animated - 50);
  const secondFilled = (secondEnd / 100) * CIRCUMFERENCE;
  const arc1Rotate = -90;
  const arc2Rotate = (firstEnd / 100) * 360 - 90;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Background track */}
        <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="var(--chart-track)" strokeWidth="18" />
        {/* Arc 1: indigo, 0–50% */}
        {firstFilled > 0 && (
          <circle
            cx={CX} cy={CY} r={RADIUS} fill="none"
            stroke="var(--accent)" strokeWidth="18" strokeLinecap="round"
            strokeDasharray={`${firstFilled} ${CIRCUMFERENCE}`}
            transform={`rotate(${arc1Rotate} ${CX} ${CY})`}
          />
        )}
        {/* Arc 2: violet, 50–score% */}
        {secondFilled > 0 && (
          <circle
            cx={CX} cy={CY} r={RADIUS} fill="none"
            stroke="var(--accent-violet)" strokeWidth="18" strokeLinecap="round"
            strokeDasharray={`${secondFilled} ${CIRCUMFERENCE}`}
            transform={`rotate(${arc2Rotate} ${CX} ${CY})`}
          />
        )}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold leading-none" style={{ color: 'var(--score-center-text)' }}>
          {Math.round(animated)}
        </span>
        <span className="text-xs text-muted mt-1">{t('outOf100', lang)}</span>
        <span className="text-sm font-semibold mt-1" style={{ color }}>
          {t(labelKey, lang)}
        </span>
      </div>
    </div>
  );
}
