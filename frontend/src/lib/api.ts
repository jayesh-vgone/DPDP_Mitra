import type {
  ChatRequest,
  ChatResponse,
  VoiceRequest,
  VoiceResponse,
  Conversation,
  Message,
} from './types';
import {
  mockSendChat,
  mockSendVoice,
  mockGetConversations,
  mockGetMessages,
} from './mockApi';

function useMock(): boolean {
  return process.env.NEXT_PUBLIC_API_URL === 'mock';
}

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const url = `${base}${path}`;
  console.log('Calling real API:', url);
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  if (useMock()) return mockSendChat(req);
  return apiFetch<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function sendVoice(req: VoiceRequest): Promise<VoiceResponse> {
  if (useMock()) return mockSendVoice(req);
  return apiFetch<VoiceResponse>('/voice', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getConversations(): Promise<Conversation[]> {
  if (useMock()) return mockGetConversations();
  return apiFetch<Conversation[]>('/conversations');
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (useMock()) return mockGetMessages(conversationId);
  return apiFetch<Message[]>(`/conversations/${conversationId}/messages`);
}
