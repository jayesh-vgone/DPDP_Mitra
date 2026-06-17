'use client';

import { PlusCircle, MessageSquare } from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
}: SidebarProps) {
  const { lang } = useLanguage();

  return (
    <aside className="w-64 bg-[#0A0F2C] flex flex-col border-r border-[#1A2756] shrink-0">
      {/* New chat button */}
      <div className="p-3 border-b border-[#1A2756]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ background: 'linear-gradient(135deg, #FF9933, #138808)' }}
        >
          <PlusCircle size={16} />
          {t('newConversation', lang)}
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-[#9CA3AF] text-xs text-center mt-6 px-3 leading-relaxed">
            {t('noConversations', lang)}
            <br />
            {t('startNewAbove', lang)}
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors group ${
                activeConversationId === conv.id
                  ? 'bg-[#FF9933]/20 text-white border border-[#FF9933]/40'
                  : 'text-white/60 hover:bg-[#0F1A3E] hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare
                  size={13}
                  className={`mt-0.5 shrink-0 ${
                    activeConversationId === conv.id ? 'text-[#FF9933]' : 'opacity-50'
                  }`}
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 leading-snug font-medium text-[0.72rem]">
                    {conv.title || 'Untitled conversation'}
                  </p>
                  <p className="text-[0.65rem] opacity-50 mt-0.5">{formatDate(conv.created_at)}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#1A2756]">
        <p className="text-[0.65rem] text-[#9CA3AF] text-center leading-tight">
          {t('footerAct', lang)}
          <br />
          <span className="text-[#9CA3AF]">{t('footerDisclaimer', lang)}</span>
        </p>
      </div>
    </aside>
  );
}
