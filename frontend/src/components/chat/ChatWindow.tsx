'use client';

import { useEffect, useRef } from 'react';
import { Scale } from 'lucide-react';
import type { Message } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
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
      <div className="w-20 h-20 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mb-6">
        <Scale size={40} className="text-[#FF9933]" />
      </div>
      <h2 className="text-[#111827] font-bold text-4xl mb-3">{t('chatTitle', lang)}</h2>
      <div className="w-10 h-px bg-[#1A2756] mb-5" />
      <p className="text-[#6B7280] text-base max-w-md leading-relaxed mb-6">
        {t('chatSubtitle', lang)}
      </p>
      <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
        {questions.map((q) => (
          <div
            key={q}
            onClick={() => onSend(q)}
            className="text-left px-5 py-3 bg-white border border-[#FF9933] rounded-lg text-sm text-[#0A0F2C] cursor-pointer hover:bg-[#FFF8F0] transition-colors"
          >
            {q}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatWindow({ messages, isLoading, onSend }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto bg-white py-4">
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
