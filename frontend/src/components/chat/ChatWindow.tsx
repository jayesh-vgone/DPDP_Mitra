'use client';

import { useEffect, useRef } from 'react';
import { Scale } from 'lucide-react';
import type { Message } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatHistorySkeleton } from './ChatSkeletons';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  /** True only while a saved conversation's history is being fetched. */
  isLoadingHistory?: boolean;
  onSend: (text: string) => void;
}

function EmptyState({ onSend }: { onSend: (text: string) => void }) {
  const { lang } = useLanguage();
  const questions = [
    t('suggestedQ1', lang),
    t('suggestedQ2', lang),
    t('suggestedQ3', lang),
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
      <div className="w-20 h-20 bg-[#EEEDFB] dark:bg-[#4F46E5]/10 rounded-2xl flex items-center justify-center mb-6">
        <Scale size={40} className="text-[#4F46E5]" />
      </div>
      <h2 className="text-[#111827] dark:text-gray-100 font-bold text-4xl mb-3">{t('chatTitle', lang)}</h2>
      <div className="w-10 h-px bg-[#2B2740] mb-5" />
      <p className="text-[#6B7280] dark:text-gray-400 text-base max-w-md leading-relaxed mb-6">
        {t('chatSubtitle', lang)}
      </p>
      <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
        {questions.map((q) => (
          <div
            key={q}
            onClick={() => onSend(q)}
            className="text-left px-5 py-3 bg-white dark:bg-[#1A1828] border border-[#4F46E5] rounded-lg text-sm text-[#1B1830] dark:text-gray-100 cursor-pointer hover:bg-[#FFF8F0] dark:hover:bg-[#2B2740] transition-colors"
          >
            {q}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatWindow({ messages, isLoading, isLoadingHistory = false, onSend }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetching a saved conversation's history — show skeleton bubbles, never the
  // empty state or the "AI generating" typing indicator.
  if (isLoadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0E0D1A] py-4">
        <ChatHistorySkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0E0D1A] py-4">
      {messages.length === 0 && !isLoading ? (
        <EmptyState onSend={onSend} />
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
