"""
TTS Tool — Google Cloud Text-to-Speech integration.

Converts election information text into natural-sounding audio
using Indian English and regional language voices.
"""

from __future__ import annotations

import base64
import logging

from config import settings

logger = logging.getLogger(__name__)

# Voice mapping for Indian languages
_VOICE_MAP: dict[str, str] = {
    "en-IN": "en-IN-Wavenet-A",
    "hi-IN": "hi-IN-Wavenet-A",
    "ta-IN": "ta-IN-Wavenet-A",
    "te-IN": "te-IN-Standard-A",
    "kn-IN": "kn-IN-Wavenet-A",
    "bn-IN": "bn-IN-Wavenet-A",
    "mr-IN": "mr-IN-Wavenet-A",
    "gu-IN": "gu-IN-Wavenet-A",
    "ml-IN": "ml-IN-Wavenet-A",
    "pa-IN": "pa-IN-Wavenet-A",
}


def synthesize_speech(text: str, language_code: str = "en-IN") -> str | None:
    """
    Convert text to speech using Google Cloud TTS.

    Returns base64-encoded MP3 audio, or None if unavailable.
    """
    if not settings.enable_tts:
        logger.info("TTS disabled in settings")
        return None

    try:
        from google.cloud import texttospeech

        client = texttospeech.TextToSpeechClient()

        # Select appropriate voice
        voice_name = _VOICE_MAP.get(language_code, settings.tts_voice_name)

        synthesis_input = texttospeech.SynthesisInput(text=text)

        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.95,  # Slightly slower for clarity
            pitch=0.0,
        )

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        audio_b64 = base64.b64encode(response.audio_content).decode("utf-8")
        logger.info("TTS: generated %d bytes of audio for lang=%s", len(response.audio_content), language_code)
        return audio_b64

    except Exception as exc:
        logger.warning("TTS failed: %s", exc)
        return None
