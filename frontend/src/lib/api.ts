import type {
  AuthResponse,
  RegisterPendingResponse,
  ChatRequest,
  ChatResponse,
  Conversation,
  Message,
  VoiceRequest,
  VoiceResponse,
  ProfileResponse,
  UpdateProfileRequest,
  UpdateInstitutionDetailsRequest,
  InstitutionDetails,
  ChangePasswordRequest,
  QuestionOut,
  ResponseIn,
  ScoresResponse,
  SubmitResponse,
  CategoryDetailOut,
  ActionItem,
  CreateActionItemRequest,
  UpdateActionItemRequest,
  AdminUser,
  AdminQuestion,
  AdminInstitution,
  QuestionUpdate,
  QuestionCreate,
  InstitutionQuestionCreate,
  InstitutionCategory,
  InternalAuditStatus,
  AuditStartResponse,
  AuditSubmitRequest,
  AuditSubmitResponse,
  AuditHistoryItem,
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
}): Promise<AuthResponse | RegisterPendingResponse> {
  return apiFetch<AuthResponse | RegisterPendingResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyOtp(payload: {
  email: string;
  otp: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resendOtp(payload: {
  email: string;
}): Promise<{ message: string; retry_after_seconds: number }> {
  return apiFetch<{ message: string; retry_after_seconds: number }>('/auth/resend-otp', {
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

// ── Profile endpoints ──────────────────────────────────────────────────────────

export async function getProfile(): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>('/profile');
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateInstitutionDetails(
  payload: UpdateInstitutionDetailsRequest,
): Promise<InstitutionDetails> {
  return apiFetch<InstitutionDetails>('/profile/institution-details', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await apiFetch<void>('/profile/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ── Admin endpoints ────────────────────────────────────────────────────────────
// Use a distinct admin_session cookie (set by the backend); credentials:'include'
// in apiFetch carries it. Fully separate from the institution dpdp_session realm.

export async function adminLogin(payload: { email: string; password: string }): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminLogout(): Promise<void> {
  return apiFetch<void>('/admin/logout', { method: 'POST' });
}

export async function adminMe(): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/me');
}

export async function adminListQuestions(
  institutionCategory: InstitutionCategory,
): Promise<AdminQuestion[]> {
  return apiFetch<AdminQuestion[]>(`/admin/questions?institution_category=${institutionCategory}`);
}

export async function adminUpdateQuestion(
  questionId: string,
  payload: QuestionUpdate,
): Promise<AdminQuestion> {
  return apiFetch<AdminQuestion>(`/admin/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function adminCreateQuestion(payload: QuestionCreate): Promise<AdminQuestion> {
  return apiFetch<AdminQuestion>('/admin/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminListInstitutions(search?: string): Promise<AdminInstitution[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<AdminInstitution[]>(`/admin/institutions${qs}`);
}

export async function adminVerifyField(
  institutionId: string,
  field: 'location' | 'student_count' | 'staff_count' | 'institution_subtype',
): Promise<AdminInstitution> {
  return apiFetch<AdminInstitution>(`/admin/institutions/${institutionId}/verify-field`, {
    method: 'PATCH',
    body: JSON.stringify({ field }),
  });
}

// ── Per-institution question CRUD (super-admin) ─────────────────────────────────

export async function adminListInstitutionQuestions(
  institutionId: string,
): Promise<AdminQuestion[]> {
  return apiFetch<AdminQuestion[]>(`/admin/institutions/${institutionId}/questions`);
}

export async function adminUpdateInstitutionQuestion(
  institutionId: string,
  questionId: string,
  payload: QuestionUpdate,
): Promise<AdminQuestion> {
  return apiFetch<AdminQuestion>(
    `/admin/institutions/${institutionId}/questions/${questionId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function adminCreateInstitutionQuestion(
  institutionId: string,
  payload: InstitutionQuestionCreate,
): Promise<AdminQuestion> {
  return apiFetch<AdminQuestion>(`/admin/institutions/${institutionId}/questions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteInstitutionQuestion(
  institutionId: string,
  questionId: string,
): Promise<void> {
  return apiFetch<void>(
    `/admin/institutions/${institutionId}/questions/${questionId}`,
    { method: 'DELETE' },
  );
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

export async function getCategoryDetail(
  attemptId: string,
  categorySlug: string,
): Promise<CategoryDetailOut> {
  return apiFetch<CategoryDetailOut>(`/assessment/${attemptId}/categories/${categorySlug}`);
}

// ── Action Queue endpoints ─────────────────────────────────────────────────────

export async function getActionItems(): Promise<ActionItem[]> {
  return apiFetch<ActionItem[]>('/action-items');
}

export async function createActionItem(payload: CreateActionItemRequest): Promise<ActionItem> {
  return apiFetch<ActionItem>('/action-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateActionItem(
  id: string,
  payload: UpdateActionItemRequest,
): Promise<ActionItem> {
  return apiFetch<ActionItem>(`/action-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteActionItem(id: string): Promise<void> {
  await apiFetch<void>(`/action-items/${id}`, { method: 'DELETE' });
}

// ── Internal Audit endpoints ───────────────────────────────────────────────────

export async function getInternalAuditStatus(): Promise<InternalAuditStatus> {
  return apiFetch<InternalAuditStatus>('/internal-audit/status');
}

export async function startInternalAudit(): Promise<AuditStartResponse> {
  return apiFetch<AuditStartResponse>('/internal-audit/start', { method: 'POST' });
}

export async function submitInternalAudit(payload: AuditSubmitRequest): Promise<AuditSubmitResponse> {
  return apiFetch<AuditSubmitResponse>('/internal-audit/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getInternalAuditHistory(): Promise<AuditHistoryItem[]> {
  return apiFetch<AuditHistoryItem[]>('/internal-audit/history');
}

export async function downloadAssessmentReport(attemptId: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${base}/assessment/${attemptId}/report`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Report download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dpdp-compliance-report-${attemptId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
