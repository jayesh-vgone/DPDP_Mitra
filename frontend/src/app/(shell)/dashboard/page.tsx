'use client';

import { ClipboardCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/translations';

export default function DashboardPage() {
  const { lang } = useLanguage();
  const { institution } = useAuth();

  return (
    <div className="h-full overflow-y-auto bg-[#F9FAFB]">
      {/* Institution hero — reads from real auth data */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h2 className="text-2xl font-bold text-[#0A0F2C]">
          {institution?.name ?? '—'}
        </h2>
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

      {/* Blank state — no assessment scores yet */}
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

        {/* CTA — links to Assessment (coming soon) */}
        <button
          disabled
          title={t('dashboardBlankSoon', lang)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white opacity-50 cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
        >
          <ClipboardCheck size={16} />
          {t('dashboardBlankCta', lang)}
        </button>
        <p className="text-xs text-gray-400 mt-3">{t('dashboardBlankSoon', lang)}</p>
      </div>
    </div>
  );
}
