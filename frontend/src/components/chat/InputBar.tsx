'use client';

import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useSpeech } from '@/lib/useSpeech';
import { useLanguage } from '@/context/LanguageContext';
import { t } from '@/lib/translations';

interface InputBarProps {
  onSend: (text: string) => void;
  onVoice: (blob: Blob) => void;
  isLoading: boolean;
}

export function InputBar({ onSend, onVoice, isLoading }: InputBarProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, startRecording, stopRecording } = useSpeech();
  const { lang } = useLanguage();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isLoading, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleVoiceStart = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  const handleVoiceEnd = useCallback(async () => {
    const blob = await stopRecording();
    if (blob && blob.size > 0) {
      onVoice(blob);
    }
  }, [stopRecording, onVoice]);

  const placeholder = t('inputPlaceholder', lang);
  const hint = t('inputHint', lang);

  return (
    <div className="bg-white dark:bg-[#1A1828] border-t border-[#2B2740] px-4 py-3 shrink-0">
      <div
        className={`flex items-end gap-3 bg-[#F9FAFB] dark:bg-[#0E0D1A] border rounded-2xl px-4 py-3 transition-all ${
          isRecording
            ? 'border-red-300 ring-2 ring-red-100'
            : 'border-[#2B2740] focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/20'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? t('recordingLabel', lang) : placeholder}
          disabled={isLoading || isRecording}
          rows={1}
          className="flex-1 bg-transparent resize-none text-sm text-[#111827] dark:text-gray-100 placeholder:text-[#9CA3AF] outline-none min-h-[24px] max-h-[120px] leading-6 disabled:opacity-60"
        />

        <div className="flex items-center gap-2 shrink-0">
          {/* Voice button */}
          <div className="relative inline-flex">
            <button
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceEnd}
              onMouseLeave={isRecording ? handleVoiceEnd : undefined}
              onTouchStart={(e) => {
                e.preventDefault();
                handleVoiceStart();
              }}
              onTouchEnd={handleVoiceEnd}
              disabled={isLoading}
              title={isRecording ? 'Release to send voice' : 'Hold to record voice'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative z-10 ${
                isRecording
                  ? 'bg-red-500 text-white scale-110 shadow-md shadow-red-200'
                  : 'bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50 pointer-events-none" />
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isLoading}
            title="Send message"
            className="w-9 h-9 bg-[#0E0D1A] text-white rounded-full flex items-center justify-center hover:bg-[#2B2740] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <p className="text-xs text-[#9CA3AF] mt-1.5 text-center">
        {isRecording ? (
          <span className="text-red-500 font-medium">{t('recordingHint', lang)}</span>
        ) : (
          hint
        )}
      </p>
    </div>
  );
}
