"""
Translation Tool — Google Cloud Translation API integration.

Translates election information into Indian regional languages.
"""

from __future__ import annotations

import logging

from config import settings

logger = logging.getLogger(__name__)


def translate_text(
    text: str,
    target_language: str,
    source_language: str = "en",
) -> tuple[str, str]:
    """
    Translate text using Google Cloud Translation API (Basic v2).

    Returns (translated_text, detected_source_language).
    Falls back to original text if translation is unavailable.
    """
    if not settings.enable_translation:
        logger.info("Translation disabled in settings")
        return text, source_language

    if target_language == source_language or target_language == "en":
        return text, source_language

    try:
        from google.cloud import translate_v2 as translate

        client = translate.Client()

        result = client.translate(
            text,
            target_language=target_language,
            source_language=source_language,
            format_="text",
        )

        translated = result["translatedText"]
        detected_source = result.get("detectedSourceLanguage", source_language)

        logger.info(
            "Translated %d chars from %s to %s",
            len(text), detected_source, target_language,
        )
        return translated, detected_source

    except Exception as exc:
        logger.warning("Translation failed: %s", exc)
        return text, source_language
