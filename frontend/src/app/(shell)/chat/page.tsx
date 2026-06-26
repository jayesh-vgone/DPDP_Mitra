'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { InputBar } from '@/components/chat/InputBar';
import { useChat } from '@/hooks/useChat';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

export default function ChatCopilotPage() {
  const {
    messages,
    conversations,
    activeConversationId,
    assessmentMode,
    isLoading,
    isLoadingHistory,
    conversationsLoading,
    sendMessage,
    sendVoiceMessage,
    startNewConversation,
    selectConversation,
  } = useChat();

  const { lang } = useLanguage();

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        loading={conversationsLoading}
        onNewChat={startNewConversation}
        onSelectConversation={selectConversation}
      />
      <main className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-[#0E0D1A]">
        {assessmentMode && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#EEEDFB] border-b border-[#4F46E5]/30 text-sm font-medium text-[#4F46E5] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
            <span>{t('assessmentModeActive', lang)}</span>
            <span className="text-[#9CA3AF] font-normal">·</span>
            <span className="text-[#9CA3AF] font-normal">{t('assessmentModeHint', lang)}</span>
          </div>
        )}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          isLoadingHistory={isLoadingHistory}
          onSend={sendMessage}
        />
        <InputBar
          onSend={sendMessage}
          onVoice={sendVoiceMessage}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
