'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, Conversation, Language, HistoryMessage } from '@/lib/types';
import { sendChat, sendVoice, getConversations, getMessages } from '@/lib/api';
import { useSpeech } from '@/lib/useSpeech';
import { useLanguage } from '@/context/LanguageContext';

interface ChatHook {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  startNewConversation: () => void;
  selectConversation: (id: string) => Promise<void>;
}

function toHistory(messages: Message[]): HistoryMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export function useChat(): ChatHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { lang } = useLanguage();
  const { playAudio, speakText } = useSpeech();
  const activeConvRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  activeConvRef.current = activeConversationId;
  messagesRef.current = messages;

  useEffect(() => {
    getConversations().then(setConversations).catch(console.error);
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch {
      // non-critical
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const optimisticId = crypto.randomUUID();
      const optimistic: Message = {
        id: optimisticId,
        conversation_id: activeConvRef.current ?? '',
        role: 'user',
        content: trimmed,
        input_type: 'text',
        language: lang as Language,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setIsLoading(true);

      try {
        const res = await sendChat({
          conversation_id: activeConvRef.current ?? undefined,
          message: trimmed,
          lang: lang as Language,
          history: toHistory(messagesRef.current),
        });

        if (!activeConvRef.current) {
          setActiveConversationId(res.conversation_id);
        }

        setMessages((prev) => {
          const without = prev.filter((m) => m.id !== optimisticId);
          const confirmed: Message = { ...optimistic, conversation_id: res.conversation_id };
          return [...without, confirmed, res.message];
        });

        if (res.audio_base64) playAudio(res.audio_base64);

        await refreshConversations();
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.error('sendMessage error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, lang, playAudio, refreshConversations],
  );

  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      if (isLoading) return;
      setIsLoading(true);

      try {
        console.log('[VOICE DIAG] sendVoiceMessage — blob.size:', audioBlob.size, '| blob.type:', audioBlob.type);

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const data = result.split(',')[1];
            console.log('[VOICE DIAG] base64 length before send:', data.length);
            resolve(data);
          };
          reader.readAsDataURL(audioBlob);
        });

        // Derive format from MIME type (e.g. "audio/webm;codecs=opus" → "webm")
        const mimeType = audioBlob.type || 'audio/webm';
        const audioFormat = mimeType.split('/')[1].split(';')[0] || 'webm';
        console.log('[VOICE DIAG] audioFormat derived:', audioFormat, '| mimeType:', mimeType);

        const res = await sendVoice({
          conversation_id: activeConvRef.current ?? undefined,
          audio_base64: base64,
          audio_format: audioFormat,
          lang: lang as Language,
          history: toHistory(messagesRef.current),
        });

        if (!activeConvRef.current) {
          setActiveConversationId(res.conversation_id);
        }

        const userMsg: Message = {
          id: crypto.randomUUID(),
          conversation_id: res.conversation_id,
          role: 'user',
          content: res.transcript,
          input_type: 'voice',
          language: lang as Language,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg, res.message]);

        console.log('[VOICE DIAG] voice response — transcript:', res.transcript,
          '| reply length:', res.message.content.length,
          '| audio_base64 present:', !!res.audio_base64);

        if (res.audio_base64) {
          playAudio(res.audio_base64);
        } else {
          speakText(res.message.content, lang as Language);
        }

        await refreshConversations();
      } catch (err) {
        console.error('[VOICE DIAG] sendVoiceMessage error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, lang, playAudio, speakText, refreshConversations],
  );

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    setIsLoading(true);
    try {
      const msgs = await getMessages(id);
      setMessages(msgs);
    } catch (err) {
      console.error('selectConversation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    sendMessage,
    sendVoiceMessage,
    startNewConversation,
    selectConversation,
  };
}
