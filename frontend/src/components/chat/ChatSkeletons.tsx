'use client';

import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';
import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

/**
 * Skeletons for the Chat Copilot. Used ONLY for "data not yet fetched" states:
 *  - ChatHistorySkeleton — while a previously-saved conversation's messages load
 *    (selectConversation → getMessages).
 *  - ConversationListSkeleton — while the sidebar conversation list loads on mount.
 *
 * The existing TypingIndicator (AI is generating a reply) is deliberately NOT
 * replaced — that is a different state and is driven by a separate `isLoading` flag.
 */

// One assistant bubble (avatar + left-aligned bubble), matching MessageBubble.
function AssistantBubbleSkeleton() {
  return (
    <div className="flex items-end gap-3 mb-4 px-4">
      <SkeletonBlock width="2rem" height="2rem" rounded="rounded-full" className="shrink-0" />
      <div className="max-w-[75%] space-y-2 bg-[#EEEDFB] dark:bg-[#1A1828] rounded-2xl rounded-bl-sm px-4 py-3">
        <SkeletonText width="16rem" />
        <SkeletonText width="12rem" />
        <SkeletonText width="9rem" />
      </div>
    </div>
  );
}

// One user bubble (right-aligned, no avatar), matching MessageBubble.
function UserBubbleSkeleton() {
  return (
    <div className="flex justify-end mb-4 px-4">
      <div className="max-w-[70%] space-y-2 bg-[#4F46E5]/15 rounded-2xl rounded-br-sm px-4 py-3">
        <SkeletonText width="11rem" />
        <SkeletonText width="7rem" />
      </div>
    </div>
  );
}

export function ChatHistorySkeleton() {
  const { lang } = useLanguage();
  return (
    <div className="py-2" role="status" aria-busy="true">
      <span className="sr-only">{t('dashboardLoading', lang)}</span>
      <AssistantBubbleSkeleton />
      <UserBubbleSkeleton />
      <AssistantBubbleSkeleton />
      <UserBubbleSkeleton />
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-0.5" role="status" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-3 py-2.5 rounded-xl border border-transparent">
          <div className="flex items-start gap-2">
            <SkeletonBlock width="0.8rem" height="0.8rem" rounded="rounded" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <SkeletonText width="85%" height="0.7rem" />
              <SkeletonText width="40%" height="0.6rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
