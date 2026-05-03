"""
CivicAgent — FastAPI application entry point.

Exposes:
    POST /api/chat       → Process a voter query through the agentic triage engine
    POST /api/tts        → Convert text to speech (Cloud TTS)
    POST /api/translate  → Translate text to regional language (Cloud Translation)
    POST /api/geocode    → Reverse geocode lat/lng to Indian state (Geocoding API)
    POST /api/voice      → Convert voice audio to text (Cloud Speech-to-Text)
    GET  /api/news       → Fetch live election news via Gemini + Google Search
    GET  /api/languages  → List supported Indian languages
    GET  /api/health     → Liveness check with service status
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from engine.triage import process_query
from models.schemas import (
    SUPPORTED_LANGUAGES,
    ChatRequest,
    ChatResponse,
    TTSRequest,
    TTSResponse,
    TranslateRequest,
    TranslateResponse,
)

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-25s │ %(levelname)-7s │ %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown hooks."""
    logger.info("🚀 CivicAgent backend starting")
    logger.info("   Mock mode   : %s", settings.use_mock_mode)
    logger.info("   GCP project : %s", settings.gcp_project_id)
    logger.info("   Gemini model: %s", settings.gemini_model_name)
    logger.info("   Gemini key  : %s", "set" if settings.google_api_key else "not set")
    logger.info("   TTS enabled : %s", settings.enable_tts)
    logger.info("   Translation : %s", settings.enable_translation)
    logger.info("   Geocoding   : %s", settings.enable_geocoding)
    logger.info("   CORS origins: %s", settings.cors_origin_list)
    yield
    logger.info("👋 CivicAgent backend shutting down")


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CivicAgent API",
    description="Agentic election process education assistant powered by Google Cloud AI.",
    version="0.2.0",
    lifespan=lifespan,
)

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check() -> dict:
    """Liveness probe with service status overview."""
    gemini_status = "mock"
    if not settings.use_mock_mode:
        if settings.google_api_key:
            gemini_status = "api_key"
        elif settings.has_gemini_credentials:
            gemini_status = "vertex"
        else:
            gemini_status = "fallback"

    return {
        "status": "healthy",
        "service": "civicagent-backend",
        "version": "0.2.0",
        "mock_mode": settings.use_mock_mode,
        "services": {
            "gemini": gemini_status,
            "tts": "enabled" if settings.enable_tts else "disabled",
            "translation": "enabled" if settings.enable_translation else "disabled",
            "geocoding": "enabled" if settings.enable_geocoding else "disabled",
            "firestore": "enabled",
        },
    }


@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat(request: Request, chat_req: ChatRequest) -> ChatResponse:
    """Process a voter query through the agentic triage engine."""
    try:
        response = await process_query(chat_req)
        logger.info(
            "Chat response for state=%s (%d steps)",
            response.user_context.state,
            len(response.steps),
        )
        return response
    except Exception as exc:
        logger.exception("Unhandled error in /api/chat")
        raise HTTPException(status_code=500, detail="An error occurred. Please try again.") from exc


@app.post("/api/tts", response_model=TTSResponse)
@limiter.limit("30/minute")
async def text_to_speech(request: Request, tts_req: TTSRequest) -> TTSResponse:
    """Convert text to speech using Google Cloud Text-to-Speech."""
    from tools.tts_tool import synthesize_speech

    audio = synthesize_speech(text=tts_req.text, language_code=tts_req.language_code)
    if audio is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Text-to-Speech service unavailable. To enable: "
                "1) Run 'gcloud auth application-default login', "
                "2) Enable 'Cloud Text-to-Speech API' in GCP Console, "
                "3) Ensure ENABLE_TTS=true in .env"
            ),
        )
    return TTSResponse(audio_base64=audio)


@app.post("/api/translate", response_model=TranslateResponse)
@limiter.limit("50/minute")
async def translate(request: Request, trans_req: TranslateRequest) -> TranslateResponse:
    """Translate text to an Indian regional language."""
    from tools.translate_tool import translate_text

    translated, source = translate_text(
        text=trans_req.text,
        target_language=trans_req.target_language,
    )
    return TranslateResponse(
        translated_text=translated,
        source_language=source,
        target_language=trans_req.target_language,
    )


@app.get("/api/languages")
async def get_languages() -> dict:
    """List supported Indian languages for translation."""
    return {"languages": SUPPORTED_LANGUAGES}


@app.post("/api/geocode")
@limiter.limit("20/minute")
async def geocode(request: Request, lat: float = Form(...), lng: float = Form(...)) -> dict:
    """Reverse geocode browser GPS coordinates to Indian state."""
    from tools.geocoding_tool import (
        approximate_state_from_coordinates,
        geocode_coordinates,
    )

    result = geocode_coordinates(lat, lng)
    if result and result.get("state"):
        return {
            "state": result["state"],
            "district": result.get("district"),
            "formatted_address": result.get("formatted_address", ""),
            "source": "geocoding_api",
        }

    approximate = approximate_state_from_coordinates(lat, lng)
    if approximate and approximate.get("state"):
        return {
            "state": approximate["state"],
            "district": approximate.get("district"),
            "formatted_address": approximate.get("formatted_address", ""),
            "source": "approximate_bounds",
        }

    raise HTTPException(
        status_code=404,
        detail="Could not determine your state from the current coordinates.",
    )


@app.post("/api/voice")
@limiter.limit("15/minute")
async def voice_to_text(request: Request, audio: UploadFile = File(...), language: str = Form(default="en-IN")) -> dict:
    """
    Convert voice audio to text using Google Cloud Speech-to-Text.
    Accepts audio files (webm, wav, mp3) from the browser's MediaRecorder.
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(audio_bytes) > 10 * 1024 * 1024:  # 10MB max
        raise HTTPException(status_code=413, detail="Audio file too large (max 10MB)")

    try:
        from google.cloud import speech

        client = speech.SpeechClient()

        # Detect encoding from content type
        content_type = audio.content_type or ""
        if "webm" in content_type:
            encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
        elif "wav" in content_type:
            encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
        elif "mp3" in content_type or "mpeg" in content_type:
            encoding = speech.RecognitionConfig.AudioEncoding.MP3
        else:
            encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS

        config = speech.RecognitionConfig(
            encoding=encoding,
            language_code=language,
            alternative_language_codes=["hi-IN", "ta-IN", "te-IN", "kn-IN"],
            model="latest_long",
            enable_automatic_punctuation=True,
        )

        audio_content = speech.RecognitionAudio(content=audio_bytes)
        response = client.recognize(config=config, audio=audio_content)

        if not response.results:
            return {"text": "", "confidence": 0, "language": language}

        best = response.results[0].alternatives[0]
        detected_lang = getattr(response.results[0], "language_code", language)

        logger.info("STT: '%s' (confidence=%.2f, lang=%s)", best.transcript, best.confidence, detected_lang)
        return {
            "text": best.transcript,
            "confidence": best.confidence,
            "language": detected_lang,
        }

    except Exception as exc:
        logger.warning("Cloud STT failed: %s — returning empty", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Speech-to-Text unavailable: {str(exc)}. Enable Cloud Speech-to-Text API in GCP Console.",
        )


@app.get("/api/news")
async def election_news(state: str = "India"):
    """
    Fetch latest election news using Gemini + Google Search grounding.
    Returns real-time election updates for the given state.
    """
    if not settings.google_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.google_api_key)

        model = genai.GenerativeModel(
            model_name=settings.gemini_model_name,
            tools=[{"google_search": {}}],
        )

        prompt = (
            f"Find the latest election news and updates for {state}, India. "
            f"Include: upcoming election dates, recent ECI announcements, "
            f"voter registration deadlines, and any important political updates. "
            f"Format as a concise bullet-point summary with dates. "
            f"Only include verified, factual information."
        )

        response = model.generate_content(prompt)
        news_text = response.text if hasattr(response, "text") and response.text else ""

        # Extract grounding sources if available
        sources = []
        if hasattr(response, "candidates") and response.candidates:
            candidate = response.candidates[0]
            grounding = getattr(candidate, "grounding_metadata", None)
            if grounding:
                for chunk in getattr(grounding, "grounding_chunks", []):
                    web = getattr(chunk, "web", None)
                    if web:
                        sources.append({
                            "title": getattr(web, "title", ""),
                            "uri": getattr(web, "uri", ""),
                        })

        logger.info("News: fetched %d chars for %s (%d sources)", len(news_text), state, len(sources))

        return {
            "state": state,
            "news": news_text,
            "sources": sources[:5],
            "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
        }

    except Exception as exc:
        logger.error("News fetch failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"Could not fetch news: {str(exc)}")
