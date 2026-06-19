'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { getAssessmentScores } from '@/lib/api';
import type { ScoresResponse, AttemptOut, RiskLevel } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/translations';
import { ComplianceScore } from '@/components/dashboard/ComplianceScore';
import { ScoreTrend } from '@/components/dashboard/ScoreTrend';
import { RiskCard } from '@/components/dashboard/RiskCard';

// Canonical risk category order — must match scoring.py RISK_CATEGORIES
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

function scoreToLevel(score: number): RiskLevel {
  if (score > 70) return 'LOW';
  if (score > 40) return 'MEDIUM';
  return 'HIGH';
}

// ── Institution hero ──────────────────────────────────────────────────────────

function InstitutionHero() {
  const { institution } = useAuth();
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6">
      <h2 className="text-2xl font-bold text-[#0A0F2C]">{institution?.name ?? '—'}</h2>
      <div className="flex flex-wrap gap-2 mt-3">
        {institution?.type && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FFF3E0] text-[#FF9933] border border-[#FF9933]/30">
            {institution.type}
          </span>
        )}
        {institution?.location && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {institution.location}
          </span>
        )}
        {institution?.board && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {institution.board}
          </span>
        )}
        {institution?.student_count != null && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {institution.student_count.toLocaleString()} students
          </span>
        )}
        {institution?.staff_count != null && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {institution.staff_count} staff
          </span>
        )}
        {institution?.plan && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#0A0F2C] text-[#FF9933]">
            {institution.plan}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Dashboard content ─────────────────────────────────────────────────────────

function LiveDashboard({ scores }: { scores: ScoresResponse }) {
  const { lang } = useLanguage();
  const latest: AttemptOut = scores.latest!;

  return (
    <div className="px-8 py-8 space-y-6">
      {/* Score + trend row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComplianceScore score={latest.overall_score} />
        <ScoreTrend history={scores.history} />
      </div>

      {/* Risk breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#0A0F2C] text-base">{t('dashboardRiskTitle', lang)}</h3>
          <Link
            href="/assessment"
            className="text-xs font-medium text-[#FF9933] hover:underline"
          >
            {t('dashboardTakeAgain', lang)}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RISK_CATEGORIES.map((cat) => {
            const score = latest.category_scores[cat] ?? 0;
            const level = scoreToLevel(score);
            return (
              <RiskCard key={cat} name={cat} level={level} score={score} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { lang } = useLanguage();
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssessmentScores()
      .then((data) => setScores(data))
      .catch(() => setScores({ latest: null, history: [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-[#F9FAFB]">
      <InstitutionHero />

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
          <Loader2 size={28} className="animate-spin text-[#FF9933]" />
          <p className="text-sm">{t('dashboardLoading', lang)}</p>
        </div>
      )}

      {!loading && !scores?.latest && (
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <div className="bg-[#FFF3E0] p-5 rounded-2xl mb-6">
            <ClipboardCheck size={40} className="text-[#FF9933]" />
          </div>
          <h3 className="text-xl font-bold text-[#0A0F2C] mb-3">
            {t('dashboardBlankTitle', lang)}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-8">
            {t('dashboardBlankBody', lang)}
          </p>
          <Link
            href="/assessment"
            style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition"
          >
            <ClipboardCheck size={16} />
            {t('dashboardBlankCta', lang)}
          </Link>
        </div>
      )}

      {!loading && scores?.latest && <LiveDashboard scores={scores} />}
    </div>
  );
}
