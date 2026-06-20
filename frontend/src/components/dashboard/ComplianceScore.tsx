'use client';

import { useLanguage } from '@/context/LanguageContext';
import { t, type TranslationKey } from '@/lib/translations';

const RADIUS = 70;
const CX = 100;
const CY = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getStatus(score: number): { labelKey: TranslationKey; color: string } {
  if (score > 70) return { labelKey: 'statusGood',     color: '#138808' };
  if (score > 40) return { labelKey: 'statusModerate', color: '#FF9933' };
  return              { labelKey: 'statusCritical',  color: '#DC2626' };
}

export function ComplianceScore({ score }: { score: number }) {
  const { lang } = useLanguage();
  const { labelKey, color } = getStatus(score);

  // Split arc: saffron fills 0–50%, India Green fills 50–score%
  const firstEnd = Math.min(score, 50);
  const firstFilled = (firstEnd / 100) * CIRCUMFERENCE;
  const secondEnd = Math.max(0, score - 50);
  const secondFilled = (secondEnd / 100) * CIRCUMFERENCE;
  const arc1Rotate = -90;
  const arc2Rotate = (firstEnd / 100) * 360 - 90;

  return (
    <div className="relative bg-white dark:bg-[#0F1A3E] rounded-2xl border border-gray-100 dark:border-[#1A2756] p-6 flex flex-col overflow-hidden">
      <h3 className="font-semibold text-[#0A0F2C] dark:text-gray-100 text-base mb-4">{t('dashboardScoreTitle', lang)}</h3>

      {/* Ashoka Chakra watermark */}
      <div
        className="absolute bottom-1 right-2 select-none pointer-events-none text-[120px] leading-none"
        style={{ color: '#000080', opacity: 0.07 }}
        aria-hidden="true"
      >
        ☸
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Background track */}
            <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="var(--chart-track)" strokeWidth="18" />
            {/* Arc 1: saffron, 0–50% */}
            {firstFilled > 0 && (
              <circle
                cx={CX} cy={CY} r={RADIUS} fill="none"
                stroke="#FF9933" strokeWidth="18" strokeLinecap="round"
                strokeDasharray={`${firstFilled} ${CIRCUMFERENCE}`}
                transform={`rotate(${arc1Rotate} ${CX} ${CY})`}
              />
            )}
            {/* Arc 2: India Green, 50–score% */}
            {secondFilled > 0 && (
              <circle
                cx={CX} cy={CY} r={RADIUS} fill="none"
                stroke="#138808" strokeWidth="18" strokeLinecap="round"
                strokeDasharray={`${secondFilled} ${CIRCUMFERENCE}`}
                transform={`rotate(${arc2Rotate} ${CX} ${CY})`}
              />
            )}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold leading-none" style={{ color: 'var(--score-center-text)' }}>{Math.round(score)}</span>
            <span className="text-xs text-[#9CA3AF] mt-1">{t('outOf100', lang)}</span>
            <span className="text-sm font-semibold mt-1" style={{ color }}>
              {t(labelKey, lang)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
