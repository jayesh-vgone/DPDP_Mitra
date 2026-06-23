'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Mic } from 'lucide-react';
import type { Message } from '@/lib/types';

// react-markdown + remark-gfm are lazy-loaded into a separate chunk so they
// are not part of the initial /chat route bundle. The Suspense fallback renders
// the raw message text while the chunk loads (typically imperceptible).
const MarkdownContent = dynamic(() => import('./MarkdownContent'), { ssr: false });

interface MessageBubbleProps {
  message: Message;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 px-4">
        <div className="max-w-[70%]">
          <div className="bg-[#4F46E5] text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
            {message.input_type === 'voice' && (
              <div className="flex items-center gap-1.5 mb-1 opacity-70">
                <Mic size={12} />
                <span className="text-xs">Voice</span>
              </div>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <p className="text-xs text-[#9CA3AF] text-right mt-1 mr-1">
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 mb-4 px-4">
      {/* Avatar */}
      <div className="w-8 h-8 bg-[#EEEDFB] dark:bg-[#4F46E5]/10 rounded-full flex items-center justify-center shrink-0">
        <span className="text-[#4F46E5] text-xs font-bold select-none">M</span>
      </div>

      <div className="max-w-[75%]">
        <div
          className="bg-[#EEEDFB] dark:bg-[#1A1828] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"
          style={{ borderLeft: '3px solid var(--accent)' }}
        >
          {message.input_type === 'voice' && (
            <div className="flex items-center gap-1.5 mb-1.5 text-[#6B7280] dark:text-gray-400">
              <Mic size={12} />
              <span className="text-xs">Voice response</span>
            </div>
          )}
          <div className="assistant-content text-sm text-[#111827] dark:text-gray-200 leading-relaxed">
            <Suspense
              fallback={
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              }
            >
              <MarkdownContent content={message.content} />
            </Suspense>
          </div>
        </div>
        <p className="text-xs text-[#9CA3AF] mt-1 ml-1">{formatTime(message.created_at)}</p>
      </div>
    </div>
  );
}
