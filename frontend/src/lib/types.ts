export type Language = 'en' | 'hi';
export type MessageRole = 'user' | 'assistant';
export type InputType = 'text' | 'voice';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  display_name: string | null;
  email: string | null;
  institution_id: string | null;
  role: string;
  language: Language;
}

export interface AuthInstitution {
  id: string;
  name: string;
  type: string;
  board: string | null;
  location: string | null;
  student_count: number | null;
  staff_count: number | null;
  invite_code: string;
  plan: string;
  category: 'school' | 'higher_ed' | 'edtech';
  institution_subtype: string | null;
  student_count_verified: boolean;
  staff_count_verified: boolean;
  institution_subtype_verified: boolean;
  location_verified: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  institution: AuthInstitution;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  input_type: InputType;
  language: Language;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  language: Language;
  assessment_mode: boolean;
  created_at: string;
}

export interface HistoryMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  conversation_id?: string;
  message: string;
  lang: Language;
  history: HistoryMessage[];
}

export interface ChatResponse {
  conversation_id: string;
  message: Message;
  audio_base64?: string;
  assessment_mode: boolean;
}

export interface VoiceRequest {
  conversation_id?: string;
  audio_base64: string;
  audio_format: string;
  lang: Language;
  history: HistoryMessage[];
}

export interface VoiceResponse {
  conversation_id: string;
  transcript: string;
  message: Message;
  audio_base64?: string;
  assessment_mode: boolean;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface InstitutionDetails {
  name: string;
  type: string;
  category: 'school' | 'higher_ed' | 'edtech';
  plan: string;
  board: string | null;
  location: string | null;
  student_count: number | null;
  staff_count: number | null;
  institution_subtype: string | null;
  location_verified: boolean;
  student_count_verified: boolean;
  staff_count_verified: boolean;
  institution_subtype_verified: boolean;
}

export interface ProfileResponse {
  name: string | null;
  email: string | null;
  institution?: InstitutionDetails | null;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface UpdateInstitutionDetailsRequest {
  location?: string | null;
  student_count?: number | null;
  staff_count?: number | null;
  institution_subtype?: string | null;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// ── Admin panel ─────────────────────────────────────────────────────────────

export type InstitutionCategory = 'school' | 'higher_ed' | 'edtech';

export interface AdminInstitution {
  id: string;
  name: string;
  category: InstitutionCategory;
  location: string | null;
  student_count: number | null;
  staff_count: number | null;
  institution_subtype: string | null;
  location_verified: boolean;
  student_count_verified: boolean;
  staff_count_verified: boolean;
  institution_subtype_verified: boolean;
  pending_count: number;
}

export interface AdminUser {
  id: string;
  email: string;
}

export interface AdminQuestion {
  id: string;
  institution_category: InstitutionCategory;
  category: string;
  question_text: string;
  dpdp_section: string | null;
  weight: number;
  order_index: number;
  answer_type: 'scale' | 'boolean';
  is_active: boolean;
}

export interface QuestionUpdate {
  question_text?: string;
  dpdp_section?: string | null;
  weight?: number;
  answer_type?: 'scale' | 'boolean';
  is_active?: boolean;
}

export interface QuestionCreate {
  institution_category: InstitutionCategory;
  category: string;
  question_text: string;
  dpdp_section?: string | null;
  weight: number;
  answer_type: 'scale' | 'boolean';
}

// ── Assessment ────────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QuestionOut {
  id: string;
  institution_category: string;
  category: string;
  question_text: string;
  dpdp_section: string | null;
  weight: number;
  order_index: number;
  answer_type: 'scale' | 'boolean';
}

export interface ResponseIn {
  question_id: string;
  answer_value: number;
}

export interface AttemptOut {
  id: string;
  institution_id: string;
  submitted_by_user_id: string | null;
  overall_score: number;
  category_scores: Record<string, number>;
  created_at: string;
}

export interface ScoresResponse {
  latest: AttemptOut | null;
  history: AttemptOut[];
}

export interface SubmitResponse {
  attempt_id: string;
  overall_score: number;
  category_scores: Record<string, number>;
  status_label: string;
}

export interface CategoryQuestionOut {
  question_text: string;
  dpdp_section: string | null;
  weight: number;
  answer_type: 'scale' | 'boolean';
  answer_value: number;
}

export interface CategoryDetailOut {
  category: string;
  score_pct: number;
  maturity_band: string;
  explanation: string;
  questions: CategoryQuestionOut[];
}

// ── Action Queue (remediation tracker) ──────────────────────────────────────

export type ActionStatus = 'not_started' | 'in_progress' | 'done';
export type ActionPriorityLevel = 'HIGH' | 'MED';

export interface ActionItem {
  id: string;
  institution_id: string;
  category: string;
  task_text: string;
  priority: string;
  priority_level: string;
  effort_estimate: string | null;
  status: ActionStatus;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateActionItemRequest {
  category: string;
  task_text: string;
  effort_estimate?: string | null;
  priority_level: ActionPriorityLevel;
}

export interface UpdateActionItemRequest {
  task_text?: string;
  category?: string;
  effort_estimate?: string | null;
  priority_level?: ActionPriorityLevel;
  status?: ActionStatus;
}
