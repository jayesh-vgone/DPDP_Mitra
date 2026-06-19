import type {
  AuthResponse,
  ChatRequest,
  ChatResponse,
  Conversation,
  Message,
  VoiceRequest,
  VoiceResponse,
  QuestionOut,
  ResponseIn,
  ScoresResponse,
  SubmitResponse,
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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    // credentials: 'include' sends the session cookie on every request
    // and allows the Set-Cookie header from /auth/* to be stored.
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${text}`);
  }
  // 204 No Content (logout) has no body
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth endpoints ─────────────────────────────────────────────────────────────

export async function authRegister(payload: {
  invite_code: string;
  category: string;
  admin_name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function authLogin(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function authLogout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export async function authMe(): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/me');
}

// ── Chat endpoints ─────────────────────────────────────────────────────────────

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

// ── Assessment endpoints ───────────────────────────────────────────────────────

export async function getAssessmentQuestions(): Promise<QuestionOut[]> {
  return apiFetch<QuestionOut[]>('/assessment/questions');
}

export async function submitAssessment(responses: ResponseIn[]): Promise<SubmitResponse> {
  return apiFetch<SubmitResponse>('/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({ responses }),
  });
}

export async function getAssessmentScores(): Promise<ScoresResponse> {
  return apiFetch<ScoresResponse>('/assessment/scores');
}
