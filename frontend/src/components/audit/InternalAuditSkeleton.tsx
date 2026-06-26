'use client';

import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';
import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for the Internal Audit page body (the page header is rendered
 * separately and stays put). Mirrors the status-panel card (cycle header + badge,
 * target-category chips, action button) plus a couple of history cards (cycle
 * label, completed date / score, category chips), matching the real layout so
 * nothing jumps when the audit data resolves.
 */

function ChipRow({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} width={`${5 + (i % 3)}rem`} height="1.5rem" rounded="rounded-full" />
      ))}
    </div>
  );
}

function HistoryCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line p-5 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonText width="8rem" height="0.85rem" />
        <div className="space-y-1.5 flex flex-col items-end">
          <SkeletonText width="9rem" height="0.7rem" />
          <SkeletonText width="5rem" height="0.7rem" />
        </div>
      </div>
      <ChipRow count={3} />
    </div>
  );
}

export function InternalAuditSkeleton() {
  const { lang } = useLanguage();
  return (
    <div className="space-y-8" role="status" aria-busy="true">
      <span className="sr-only">{t('dashboardLoading', lang)}</span>

      {/* Status panel card */}
      <div className="bg-surface rounded-2xl border border-line p-8 space-y-6">
        {/* Cycle header: icon tile + title/subtitle + status badge */}
        <div className="flex items-center gap-3">
          <SkeletonBlock width="2.5rem" height="2.5rem" rounded="rounded-xl" />
          <div className="space-y-2">
            <SkeletonText width="9rem" height="1.1rem" />
            <SkeletonText width="11rem" height="0.7rem" />
          </div>
          <SkeletonBlock width="6rem" height="1.5rem" rounded="rounded-full" className="ml-auto" />
        </div>

        {/* Target categories */}
        <div className="space-y-2">
          <SkeletonText width="7rem" height="0.65rem" />
          <ChipRow count={4} />
        </div>

        {/* Action button */}
        <SkeletonBlock height="3rem" rounded="rounded-xl" />
      </div>

      {/* History section */}
      <div className="space-y-4">
        <SkeletonText width="9rem" height="1rem" />
        <HistoryCardSkeleton />
        <HistoryCardSkeleton />
      </div>
    </div>
  );
}
