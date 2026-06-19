'use client';

import { useRef, useState, useCallback } from 'react';
import type { Language } from './types';

interface SpeechHook {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  playAudio: (base64: string) => void;
  speakText: (text: string, lang: Language) => void;
  stopSpeaking: () => void;
}

export function useSpeech(): SpeechHook {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      console.log('[VOICE DIAG] recorder created. mimeType:', recorder.mimeType);

      recorder.ondataavailable = (e) => {
        console.log('[VOICE DIAG] ondataavailable chunk size:', e.data.size, 'type:', e.data.type);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        console.log('[VOICE DIAG] onstop — chunks:', chunksRef.current.length,
          '| blob.size:', blob.size, '| blob.type:', blob.type);
        stream.getTracks().forEach((t) => t.stop());
        resolveRef.current?.(blob);
        resolveRef.current = null;
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      console.log('[VOICE DIAG] recording started');
    } catch (err) {
      console.error('[VOICE DIAG] startRecording error:', err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (recorderRef.current?.state === 'recording') {
        console.log('[VOICE DIAG] stopping recorder, current state:', recorderRef.current.state);
        recorderRef.current.stop();
      } else {
        console.log('[VOICE DIAG] stopRecording called but recorder not in recording state:',
          recorderRef.current?.state);
        resolve(null);
        resolveRef.current = null;
      }
      setIsRecording(false);
    });
  }, []);

  const playAudio = useCallback((base64: string) => {
    console.log('[VOICE DIAG] playAudio called, base64 length:', base64.length);
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audio.play().catch((err) => console.error('[VOICE DIAG] playAudio error:', err));
  }, []);

  const speakText = useCallback((text: string, lang: Language) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[VOICE DIAG] SpeechSynthesis not available');
      return;
    }

    const targetLang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    const allVoices = window.speechSynthesis.getVoices();
    console.log('[VOICE DIAG] speakText called. lang:', lang, '| targetLang:', targetLang,
      '| voices loaded:', allVoices.length,
      '| voices:', allVoices.map((v) => `${v.name} (${v.lang})`));

    const matchedVoice = allVoices.find((v) => v.lang === targetLang)
      ?? allVoices.find((v) => v.lang.startsWith(lang === 'hi' ? 'hi' : 'en'));

    if (!matchedVoice) {
      const uniqueLangs = allVoices.map((v) => v.lang).filter((l, i, arr) => arr.indexOf(l) === i);
      console.warn('[VOICE DIAG] No voice found for', targetLang,
        '— available langs:', uniqueLangs);
    } else {
      console.log('[VOICE DIAG] Using voice:', matchedVoice.name, '(', matchedVoice.lang, ')');
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.rate = 0.9;

    utterance.onstart = () => console.log('[VOICE DIAG] SpeechSynthesis started');
    utterance.onend = () => console.log('[VOICE DIAG] SpeechSynthesis finished');
    utterance.onerror = (e) => console.error('[VOICE DIAG] SpeechSynthesis error:', e.error);

    window.speechSynthesis.speak(utterance);
    console.log('[VOICE DIAG] speechSynthesis.speak() called. pending:', window.speechSynthesis.pending,
      'speaking:', window.speechSynthesis.speaking);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { isRecording, startRecording, stopRecording, playAudio, speakText, stopSpeaking };
}
