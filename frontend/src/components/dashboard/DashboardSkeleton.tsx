'use client';

import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';
import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for the Compliance Overview dashboard. Mirrors the real
 * `LiveDashboard` layout (page header, four stat cards, Overall Score donut card,
 * Compliance-by-Category table, Action Queue) so there is no layout jump when the
 * real data resolves.
 *
 * NOTE: this assumes the returning-user path (an assessment exists → LiveDashboard).
 * For a brand-new user with no attempt yet, the page swaps this skeleton for the
 * centred empty-state CTA — a full-placeholder swap, not a content jump.
 */

function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line p-5">
      <div className="flex items-center gap-2 mb-3">
        {/* icon tile (real card uses w-8 h-8 rounded-lg) */}
        <SkeletonBlock width="2rem" height="2rem" rounded="rounded-lg" />
        <SkeletonText width="45%" />
      </div>
      {/* big number */}
      <SkeletonBlock width="3rem" height="1.75rem" rounded="rounded-md" />
      <SkeletonText width="65%" height="0.7rem" className="mt-2" />
    </div>
  );
}

function OverallScoreCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <SkeletonText width="40%" height="1rem" />
        <SkeletonText width="4rem" height="0.75rem" />
      </div>
      {/* donut footprint — a ring matching ComplianceScore's w-48 h-48 */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div
          aria-hidden="true"
          className="w-48 h-48 rounded-full border-[18px] border-[var(--skeleton)] motion-safe:animate-pulse"
        />
      </div>
      {/* stat rows beneath the donut */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <SkeletonText width="40%" height="0.75rem" />
            <SkeletonText width="20%" height="0.75rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryTableSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line p-6">
      <SkeletonText width="35%" height="1rem" className="mb-5" />
      {/* header row */}
      <div className="flex items-center gap-3 pb-2 border-b border-line">
        <SkeletonText width="25%" height="0.7rem" />
        <SkeletonText width="35%" height="0.7rem" />
        <SkeletonText width="15%" height="0.7rem" />
        <SkeletonText width="10%" height="0.7rem" />
      </div>
      {/* 8 category rows: name · score+bar · level badge · trend */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5 border-b border-line/60 last:border-0">
          <SkeletonText width="22%" />
          <div className="flex items-center gap-2 w-2/5">
            <SkeletonText width="1.75rem" />
            <SkeletonBlock height="0.5rem" rounded="rounded-full" className="flex-1" />
          </div>
          <SkeletonBlock width="3.5rem" height="1.25rem" rounded="rounded-full" />
          <SkeletonCircleInline />
        </div>
      ))}
    </div>
  );
}

// Small inline trend-arrow placeholder (kept local to avoid an extra import).
function SkeletonCircleInline() {
  return (
    <div
      aria-hidden="true"
      className="w-4 h-4 rounded bg-[var(--skeleton)] motion-safe:animate-pulse ml-auto"
    />
  );
}

function ActionQueueSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line p-6">
      <div className="flex items-center justify-between mb-5">
        <SkeletonText width="30%" height="1rem" />
        <SkeletonText width="5rem" height="0.75rem" />
      </div>
      {/* header row */}
      <div className="flex items-center gap-3 pb-2 border-b border-line">
        <SkeletonText width="12%" height="0.7rem" />
        <SkeletonText width="32%" height="0.7rem" />
        <SkeletonText width="18%" height="0.7rem" />
        <SkeletonText width="12%" height="0.7rem" />
        <SkeletonText width="14%" height="0.7rem" />
      </div>
      {/* 4 task rows: priority badge · task · category · effort · status */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5 border-b border-line/60 last:border-0">
          <SkeletonBlock width="3.5rem" height="1.25rem" rounded="rounded-md" />
          <SkeletonText width="30%" />
          <SkeletonText width="16%" height="0.75rem" />
          <SkeletonText width="10%" height="0.75rem" />
          <SkeletonBlock width="6rem" height="1.5rem" rounded="rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  const { lang } = useLanguage();
  return (
    <div className="px-4 sm:px-8 py-6 space-y-6" role="status" aria-busy="true">
      <span className="sr-only">{t('dashboardLoading', lang)}</span>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <SkeletonText width="14rem" height="1.5rem" />
          <SkeletonText width="20rem" height="0.85rem" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SkeletonBlock width="7rem" height="2.5rem" rounded="rounded-lg" />
          <SkeletonBlock width="9rem" height="2.5rem" rounded="rounded-lg" />
        </div>
      </div>

      {/* Four stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Score card + category table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <OverallScoreCardSkeleton />
        </div>
        <div className="lg:col-span-2">
          <CategoryTableSkeleton />
        </div>
      </div>

      {/* Action Queue */}
      <ActionQueueSkeleton />
    </div>
  );
}
