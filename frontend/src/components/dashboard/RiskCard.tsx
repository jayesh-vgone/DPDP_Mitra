'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RiskLevel } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { t, type TranslationKey, RISK_CATEGORY_HI } from '@/lib/translations';

const LEVEL_STYLE: Record<
  RiskLevel,
  { badgeBg: string; borderColor: string; levelKey: TranslationKey; descKey: TranslationKey; icon: React.ReactNode }
> = {
  LOW: {
    badgeBg: '#138808',
    borderColor: '#138808',
    levelKey: 'levelLow',
    descKey: 'riskDescLow',
    icon: <TrendingDown size={14} className="text-[#138808]" />,
  },
  MEDIUM: {
    badgeBg: '#FF9933',
    borderColor: '#FF9933',
    levelKey: 'levelMedium',
    descKey: 'riskDescMedium',
    icon: <Minus size={14} className="text-[#FF9933]" />,
  },
  HIGH: {
    badgeBg: '#DC2626',
    borderColor: '#DC2626',
    levelKey: 'levelHigh',
    descKey: 'riskDescHigh',
    icon: <TrendingUp size={14} className="text-[#DC2626]" />,
  },
};

interface RiskCardProps {
  name: string;
  level: RiskLevel;
  score: number;
}

export function RiskCard({ name, level, score }: RiskCardProps) {
  const { lang } = useLanguage();
  const { badgeBg, borderColor, levelKey, descKey, icon } = LEVEL_STYLE[level];

  const displayName = lang === 'hi' ? (RISK_CATEGORY_HI[name] ?? name) : name;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#0A0F2C]">{displayName}</p>
        {icon}
      </div>
      <div
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mb-3 text-white"
        style={{ background: badgeBg }}
      >
        {t(levelKey, lang)}
      </div>
      <p className="text-xs text-[#6B7280] leading-relaxed">{t(descKey, lang)}</p>
      <p className="text-xs font-semibold mt-2" style={{ color: borderColor }}>
        {Math.round(score)}/100
      </p>
    </div>
  );
}
