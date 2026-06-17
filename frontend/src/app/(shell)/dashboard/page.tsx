'use client';

import { InstitutionHero } from '@/components/dashboard/InstitutionHero';
import { ComplianceScore } from '@/components/dashboard/ComplianceScore';
import { ScoreTrend } from '@/components/dashboard/ScoreTrend';
import { RiskCard } from '@/components/dashboard/RiskCard';
import { risks } from '@/lib/mockData';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

export default function DashboardPage() {
  const { lang } = useLanguage();

  return (
    <div style={{ zoom: 1.4 }} className="h-full overflow-y-auto bg-[#F9FAFB]">
      <InstitutionHero />

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <ComplianceScore />
          <ScoreTrend />
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0A0F2C] mb-4">{t('riskBreakdown', lang)}</h2>
          <div className="grid grid-cols-4 gap-4">
            {risks.map((risk) => (
              <RiskCard key={risk.name} {...risk} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
