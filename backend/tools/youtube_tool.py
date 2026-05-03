"""Search YouTube for official election tutorials without extra SDK dependencies."""

from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request

from config import settings

logger = logging.getLogger(__name__)


def _score_video(item: dict) -> int:
    """Prefer official-looking ECI results over generic YouTube matches."""
    snippet = item.get("snippet", {})
    title = snippet.get("title", "").lower()
    channel = snippet.get("channelTitle", "").lower()

    score = 0
    if "election commission" in channel:
        score += 5
    if "eci" in channel:
        score += 2
    if "tutorial" in title or "how" in title:
        score += 1
    return score


def search_election_tutorial(query: str) -> str | None:
    """
    Search YouTube for official Election Commission tutorials based on the query.

    Returns the best matching YouTube video ID when available.
    """
    if not settings.google_api_key:
        logger.warning("No GOOGLE_API_KEY for YouTube search.")
        return None

    try:
        enhanced_query = f"{query} Election Commission of India official tutorial"
        params = urllib.parse.urlencode(
            {
                "part": "id,snippet",
                "maxResults": 5,
                "q": enhanced_query,
                "type": "video",
                "relevanceLanguage": "en",
                "key": settings.google_api_key,
            }
        )
        url = f"https://www.googleapis.com/youtube/v3/search?{params}"
        req = urllib.request.Request(url)

        with urllib.request.urlopen(req, timeout=5) as response:
            search_response = json.loads(response.read().decode())

        videos = search_response.get("items", [])
        if not videos:
            logger.info("No YouTube videos found for '%s'", query)
            return None

        best_video = max(videos, key=_score_video)
        video_id = best_video.get("id", {}).get("videoId")
        if not video_id:
            return None

        logger.info("YouTube search for '%s' found video %s", query, video_id)
        return video_id
    except Exception as exc:
        logger.error("Unexpected error in YouTube search: %s", exc)
        return None
