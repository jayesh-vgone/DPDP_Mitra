export type Language = 'en' | 'hi';
export type MessageRole = 'user' | 'assistant';
export type InputType = 'text' | 'voice';

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
}
