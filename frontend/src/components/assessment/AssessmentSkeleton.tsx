'use client';

import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';
import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for the Assessment wizard. Mirrors a real category step
 * (header, progress bar + step dots, step-title card, and a few question cards
 * with a 0–4 answer control) inside the same `max-w-2xl` column the real wizard
 * uses, so there is no layout jump when the questions resolve.
 */

function QuestionCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] p-5 space-y-4">
      <div className="flex gap-3">
        <SkeletonBlock width="1.5rem" height="1.5rem" rounded="rounded-full" className="shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonText width="90%" />
          <SkeletonText width="60%" />
        </div>
      </div>
      {/* 0–4 scale control: five option blocks */}
      <div className="pl-9 flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} width="70px" height="3.25rem" rounded="rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AssessmentSkeleton() {
  const { lang } = useLanguage();
  return (
    <div className="h-full overflow-y-auto bg-[#F9FAFB] dark:bg-[#0E0D1A]">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6" role="status" aria-busy="true">
        <span className="sr-only">{t('wizardLoadingText', lang)}</span>

        {/* Header */}
        <div className="space-y-2">
          <SkeletonText width="12rem" height="1.5rem" />
          <SkeletonText width="18rem" height="0.7rem" />
        </div>

        {/* Progress bar + step dots */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <SkeletonText width="6rem" height="0.75rem" />
            <SkeletonText width="2rem" height="0.75rem" />
          </div>
          <SkeletonBlock height="0.5rem" rounded="rounded-full" />
          <div className="flex gap-1.5 mt-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} height="0.25rem" rounded="rounded-full" className="flex-1" />
            ))}
          </div>
        </div>

        {/* Step-title card */}
        <div className="bg-white dark:bg-[#1A1828] rounded-2xl border border-gray-100 dark:border-[#2B2740] px-6 py-4 space-y-2">
          <SkeletonText width="7rem" height="0.65rem" />
          <SkeletonText width="14rem" height="1.25rem" />
        </div>

        {/* Question cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <QuestionCardSkeleton key={i} />
        ))}

        {/* Nav button */}
        <SkeletonBlock height="2.75rem" rounded="rounded-xl" />
      </div>
    </div>
  );
}
