/**
 * API client for the CivicAgent FastAPI backend.
 */

import type {
  ChatRequest,
  ChatResponse,
  TTSRequest,
  TTSResponse,
  TranslateRequest,
  TranslateResponse,
  SupportedLanguage,
} from "../types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Send a chat query to the backend triage engine.
 */
export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

/**
 * Convert text to speech via Cloud TTS.
 */
export async function textToSpeech(
  request: TTSRequest
): Promise<TTSResponse> {
  const res = await fetch(`${API_BASE_URL}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`TTS error ${res.status}`);
  }

  return res.json();
}

/**
 * Translate text to a regional Indian language.
 */
export async function translateText(
  request: TranslateRequest
): Promise<TranslateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Translation error ${res.status}`);
  }

  return res.json();
}

/**
 * Get supported languages for translation.
 */
export async function getLanguages(): Promise<SupportedLanguage[]> {
  const res = await fetch(`${API_BASE_URL}/api/languages`);
  if (!res.ok) throw new Error(`Languages error ${res.status}`);
  const data = await res.json();
  return data.languages;
}

/**
 * Reverse geocode browser GPS coordinates → Indian state.
 */
export async function geocodeLocation(
  lat: number,
  lng: number
): Promise<{ state: string; district: string | null; formatted_address: string; source: string }> {
  const form = new FormData();
  form.append("lat", lat.toString());
  form.append("lng", lng.toString());

  const res = await fetch(`${API_BASE_URL}/api/geocode`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(`Geocode error ${res.status}`);
  return res.json();
}

/**
 * Convert voice audio to text via Cloud Speech-to-Text.
 */
export async function voiceToText(
  audioBlob: Blob,
  language: string = "en-IN"
): Promise<{ text: string; confidence: number; language: string }> {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");
  form.append("language", language);

  const res = await fetch(`${API_BASE_URL}/api/voice`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(`Voice error ${res.status}`);
  return res.json();
}

/**
 * Fetch live election news via Gemini + Google Search.
 */
export async function fetchElectionNews(
  state: string = "India"
): Promise<{ state: string; news: string; sources: { title: string; uri: string }[]; generated_at: string }> {
  const res = await fetch(`${API_BASE_URL}/api/news?state=${encodeURIComponent(state)}`);
  if (!res.ok) throw new Error(`News error ${res.status}`);
  return res.json();
}

/**
 * Health check.
 */
export async function checkHealth(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
