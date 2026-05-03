"""
Application configuration loaded from environment variables.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings populated from .env file or environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── GCP ──────────────────────────────────────────────────────────
    gcp_project_id: str = "civic-agent"
    gcp_location: str = "us-central1"
    google_api_key: str = ""

    # ── Vertex AI ────────────────────────────────────────────────────
    gemini_model_name: str = "gemini-2.0-flash"

    # ── Firestore ────────────────────────────────────────────────────
    firestore_collection: str = "election_guidelines"

    # ── Text-to-Speech ───────────────────────────────────────────────
    enable_tts: bool = True
    tts_voice_name: str = "en-IN-Wavenet-A"
    tts_language_code: str = "en-IN"

    # ── Translation ──────────────────────────────────────────────────
    enable_translation: bool = True

    # ── Geocoding ────────────────────────────────────────────────────
    enable_geocoding: bool = False
    geocoding_api_key: str = ""

    # ── Application ──────────────────────────────────────────────────
    use_mock_mode: bool = False
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def has_gemini_credentials(self) -> bool:
        """Check if any Gemini credentials are available."""
        if self.google_api_key:
            return True
        # Check if Application Default Credentials are available
        try:
            import google.auth
            credentials, project = google.auth.default()
            return credentials is not None
        except Exception:
            return False


settings = Settings()
