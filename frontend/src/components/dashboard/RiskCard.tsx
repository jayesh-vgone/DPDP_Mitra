'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Risk, RiskLevel } from '@/lib/mockData';
import { useLanguage } from '@/context/LanguageContext';
import { t, type TranslationKey, RISK_NAME_HI, RISK_DESC_HI } from '@/lib/translations';

const LEVEL_STYLE: Record<
  RiskLevel,
  { badgeBg: string; borderColor: string; levelKey: TranslationKey; icon: React.ReactNode }
> = {
  LOW: {
    badgeBg: '#138808',
    borderColor: '#138808',
    levelKey: 'levelLow',
    icon: <TrendingDown size={14} className="text-[#138808]" />,
  },
  MEDIUM: {
    badgeBg: '#FF9933',
    borderColor: '#FF9933',
    levelKey: 'levelMedium',
    icon: <Minus size={14} className="text-[#FF9933]" />,
  },
  HIGH: {
    badgeBg: '#DC2626',
    borderColor: '#DC2626',
    levelKey: 'levelHigh',
    icon: <TrendingUp size={14} className="text-[#DC2626]" />,
  },
};

export function RiskCard({ name, level, description }: Risk) {
  const { lang } = useLanguage();
  const { badgeBg, borderColor, levelKey, icon } = LEVEL_STYLE[level];

  const displayName = lang === 'hi' ? (RISK_NAME_HI[name] ?? name) : name;
  const displayDesc = lang === 'hi' ? (RISK_DESC_HI[description] ?? description) : description;

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
      <p className="text-xs text-[#6B7280] leading-relaxed">{displayDesc}</p>
    </div>
  );
}
