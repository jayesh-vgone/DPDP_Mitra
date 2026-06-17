'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { InputBar } from '@/components/chat/InputBar';
import { useChat } from '@/hooks/useChat';

export default function ChatCopilotPage() {
  const {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    sendMessage,
    sendVoiceMessage,
    startNewConversation,
    selectConversation,
  } = useChat();

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={startNewConversation}
        onSelectConversation={selectConversation}
      />
      <main className="flex flex-col flex-1 overflow-hidden bg-white">
        <ChatWindow messages={messages} isLoading={isLoading} onSend={sendMessage} />
        <InputBar
          onSend={sendMessage}
          onVoice={sendVoiceMessage}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
