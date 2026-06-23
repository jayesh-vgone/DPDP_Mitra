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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        stream.getTracks().forEach((t) => t.stop());
        resolveRef.current?.(blob);
        resolveRef.current = null;
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('startRecording error:', err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      } else {
        resolve(null);
        resolveRef.current = null;
      }
      setIsRecording(false);
    });
  }, []);

  const playAudio = useCallback((base64: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audio.play().catch((err) => console.error('playAudio error:', err));
  }, []);

  const speakText = useCallback((text: string, lang: Language) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const targetLang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    const allVoices = window.speechSynthesis.getVoices();

    const matchedVoice = allVoices.find((v) => v.lang === targetLang)
      ?? allVoices.find((v) => v.lang.startsWith(lang === 'hi' ? 'hi' : 'en'));

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.rate = 0.9;

    utterance.onerror = (e) => console.error('SpeechSynthesis error:', e.error);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { isRecording, startRecording, stopRecording, playAudio, speakText, stopSpeaking };
}
