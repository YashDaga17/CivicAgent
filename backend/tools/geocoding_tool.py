"""
Geocoding Tool — Resolves lat/lng or address to Indian state using Google Geocoding API.
Also supports browser geolocation (lat/lng) → state resolution.
"""

from __future__ import annotations

import logging
import urllib.parse
import urllib.request
import json

from config import settings

logger = logging.getLogger(__name__)


def geocode_coordinates(lat: float, lng: float) -> dict | None:
    """
    Reverse geocode lat/lng coordinates to an Indian state using Google Geocoding API.
    Returns {"state": "...", "district": "...", "formatted_address": "..."} or None.
    """
    if not settings.enable_geocoding or not settings.geocoding_api_key:
        logger.info("Geocoding disabled or no API key")
        return None

    try:
        url = (
            f"https://maps.googleapis.com/maps/api/geocode/json"
            f"?latlng={lat},{lng}"
            f"&key={settings.geocoding_api_key}"
            f"&result_type=administrative_area_level_1|locality"
            f"&language=en"
        )

        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())

        if data.get("status") != "OK" or not data.get("results"):
            logger.warning("Geocoding returned status: %s", data.get("status"))
            return None

        result = data["results"][0]
        state = None
        district = None

        for component in result.get("address_components", []):
            types = component.get("types", [])
            if "administrative_area_level_1" in types:
                state = component["long_name"]
            elif "administrative_area_level_2" in types:
                district = component["long_name"]

        if state:
            logger.info("Geocoded (%.4f, %.4f) → %s, %s", lat, lng, state, district)
            return {
                "state": state,
                "district": district,
                "formatted_address": result.get("formatted_address", ""),
            }

        return None

    except Exception as exc:
        logger.warning("Geocoding failed: %s", exc)
        return None


def geocode_pincode(pincode: str) -> dict | None:
    """
    Geocode a 6-digit Indian PIN code to state + district.
    """
    if not settings.enable_geocoding or not settings.geocoding_api_key:
        return None

    try:
        encoded = urllib.parse.quote(f"{pincode}, India")
        url = (
            f"https://maps.googleapis.com/maps/api/geocode/json"
            f"?address={encoded}"
            f"&key={settings.geocoding_api_key}"
            f"&components=country:IN"
            f"&language=en"
        )

        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())

        if data.get("status") != "OK" or not data.get("results"):
            return None

        result = data["results"][0]
        state = None
        district = None

        for component in result.get("address_components", []):
            types = component.get("types", [])
            if "administrative_area_level_1" in types:
                state = component["long_name"]
            elif "administrative_area_level_2" in types:
                district = component["long_name"]

        if state:
            logger.info("PIN %s → %s, %s", pincode, state, district)
            return {
                "state": state,
                "district": district,
                "formatted_address": result.get("formatted_address", ""),
            }
        return None

    except Exception as exc:
        logger.warning("PIN geocoding failed: %s", exc)
        return None
