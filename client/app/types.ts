/**
 * TypeScript types matching the FastAPI backend Pydantic schemas.
 */

export interface TimelineStep {
  step: number;
  title: string;
  date: string;
  description: string;
  action_link: string;
}

export interface UserContext {
  state: string;
  district: string | null;
  voter_status: "first-time" | "returning" | "unknown";
}

export interface ChatResponse {
  user_context: UserContext;
  steps: TimelineStep[];
  summary: string;
  video_id?: string | null;
}

export interface ChatRequest {
  query: string;
  location_hint?: string | null;
}

/** UI-level message type for the chat interface */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: ChatResponse;
  isLoading?: boolean;
}

/** Text-to-Speech */
export interface TTSRequest {
  text: string;
  language_code: string;
}

export interface TTSResponse {
  audio_base64: string;
  content_type: string;
}

/** Translation */
export interface TranslateRequest {
  text: string;
  target_language: string;
}

export interface TranslateResponse {
  translated_text: string;
  source_language: string;
  target_language: string;
}

/** Supported language */
export interface SupportedLanguage {
  code: string;
  name: string;
  native: string;
}
