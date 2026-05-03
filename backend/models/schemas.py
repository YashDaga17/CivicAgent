"""
Pydantic schemas defining the API request/response contract.

Every chat response is structured JSON — never raw text — so the
frontend can render rich interactive components (timelines, cards, etc.).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Chat ─────────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    """Incoming user message."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's natural-language question about election processes.",
    )
    location_hint: str | None = Field(
        default=None,
        description="Optional state name, abbreviation, city, or PIN code to pre-seed location detection.",
    )


class TimelineStep(BaseModel):
    """A single step in the election process timeline."""

    step: int = Field(..., description="1-based ordinal position in the timeline.")
    title: str = Field(..., description="Short label, e.g. 'Voter Registration'.")
    date: str = Field(
        ...,
        description="Relevant deadline or date range.",
    )
    description: str = Field(
        ...,
        description="Plain-language explanation of this step.",
    )
    action_link: str = Field(
        default="",
        description="URL where the user can take action.",
    )


class UserContext(BaseModel):
    """Detected / inferred information about the voter."""

    state: str = Field(..., description="Full Indian state or UT name.")
    district: str | None = Field(
        default=None,
        description="Lok Sabha or Vidhan Sabha constituency, if resolved.",
    )
    voter_status: str = Field(
        default="first-time",
        description="Inferred voter status: first-time | returning | unknown.",
    )


class ChatResponse(BaseModel):
    """Structured response returned by the /api/chat endpoint."""

    user_context: UserContext
    steps: list[TimelineStep]
    summary: str = Field(
        ...,
        description="A short, empathetic text summary of the guidance provided.",
    )
    video_id: str | None = Field(
        default=None,
        description="Optional YouTube video ID for an official ECI tutorial.",
    )


# ── Text-to-Speech ──────────────────────────────────────────────────────────


class TTSRequest(BaseModel):
    """Request to convert text to speech."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Text to convert to speech.",
    )
    language_code: str = Field(
        default="en-IN",
        description="BCP-47 language code (e.g. 'en-IN', 'hi-IN', 'ta-IN').",
    )


class TTSResponse(BaseModel):
    """Audio response from Text-to-Speech."""

    audio_base64: str = Field(..., description="Base64-encoded MP3 audio.")
    content_type: str = Field(default="audio/mp3", description="MIME type of the audio.")


# ── Translation ──────────────────────────────────────────────────────────────


class TranslateRequest(BaseModel):
    """Request to translate text."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Text to translate.",
    )
    target_language: str = Field(
        ...,
        description="Target language code (e.g. 'hi', 'ta', 'te', 'kn').",
    )


class TranslateResponse(BaseModel):
    """Translated text response."""

    translated_text: str = Field(..., description="The translated text.")
    source_language: str = Field(default="en", description="Detected source language.")
    target_language: str = Field(..., description="Target language code.")


# ── Languages ────────────────────────────────────────────────────────────────

SUPPORTED_LANGUAGES = [
    {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা"},
    {"code": "mr", "name": "Marathi", "native": "मराठी"},
    {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી"},
    {"code": "ml", "name": "Malayalam", "native": "മലയാളം"},
    {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ"},
    {"code": "or", "name": "Odia", "native": "ଓଡ଼ିଆ"},
    {"code": "en", "name": "English", "native": "English"},
]
