"""
LocationTool — resolves a user-provided location hint into an Indian state.

Supports mock mode (built-in lookup tables) and live mode (GCP Geocoding API placeholder).
"""

from __future__ import annotations

import logging
import re

from models.schemas import UserContext

logger = logging.getLogger(__name__)

_ABBREV_TO_STATE: dict[str, str] = {
    "AP": "Andhra Pradesh", "AR": "Arunachal Pradesh", "AS": "Assam",
    "BR": "Bihar", "CT": "Chhattisgarh", "CG": "Chhattisgarh",
    "GA": "Goa", "GJ": "Gujarat", "HR": "Haryana",
    "HP": "Himachal Pradesh", "JH": "Jharkhand", "JK": "Jammu and Kashmir",
    "KA": "Karnataka", "KL": "Kerala", "LA": "Ladakh",
    "MP": "Madhya Pradesh", "MH": "Maharashtra", "MN": "Manipur",
    "ML": "Meghalaya", "MZ": "Mizoram", "NL": "Nagaland",
    "OD": "Odisha", "PB": "Punjab", "RJ": "Rajasthan", "SK": "Sikkim",
    "TN": "Tamil Nadu", "TS": "Telangana", "TR": "Tripura",
    "UP": "Uttar Pradesh", "UK": "Uttarakhand", "WB": "West Bengal",
    "DL": "Delhi", "CH": "Chandigarh", "PY": "Puducherry",
}

_STATE_NAMES: set[str] = {v.lower() for v in _ABBREV_TO_STATE.values()}

_PIN_PREFIX_TO_STATE: dict[str, str] = {
    "400": "Maharashtra", "401": "Maharashtra", "411": "Maharashtra",
    "440": "Maharashtra", "560": "Karnataka", "570": "Karnataka",
    "580": "Karnataka", "110": "Delhi",
    "600": "Tamil Nadu", "620": "Tamil Nadu", "641": "Tamil Nadu",
    "200": "Uttar Pradesh", "226": "Uttar Pradesh", "282": "Uttar Pradesh",
    "700": "West Bengal", "711": "West Bengal", "731": "West Bengal",
    "670": "Kerala", "682": "Kerala", "695": "Kerala",
    "380": "Gujarat", "390": "Gujarat", "395": "Gujarat",
    "500": "Telangana", "302": "Rajasthan", "462": "Madhya Pradesh",
    "800": "Bihar", "160": "Chandigarh", "751": "Odisha",
}

_CITY_TO_STATE: dict[str, str] = {
    "mumbai": "Maharashtra", "pune": "Maharashtra", "nagpur": "Maharashtra",
    "bangalore": "Karnataka", "bengaluru": "Karnataka", "mysore": "Karnataka",
    "delhi": "Delhi", "new delhi": "Delhi", "noida": "Uttar Pradesh",
    "gurgaon": "Haryana", "gurugram": "Haryana",
    "chennai": "Tamil Nadu", "madurai": "Tamil Nadu", "coimbatore": "Tamil Nadu",
    "lucknow": "Uttar Pradesh", "varanasi": "Uttar Pradesh", "kanpur": "Uttar Pradesh",
    "kolkata": "West Bengal", "howrah": "West Bengal",
    "kochi": "Kerala", "thiruvananthapuram": "Kerala", "trivandrum": "Kerala",
    "ahmedabad": "Gujarat", "surat": "Gujarat", "vadodara": "Gujarat",
    "hyderabad": "Telangana", "jaipur": "Rajasthan", "bhopal": "Madhya Pradesh",
    "patna": "Bihar", "bhubaneswar": "Odisha",
}


def _normalize_state(raw: str) -> str | None:
    """Attempt to resolve *raw* into a canonical Indian state name."""
    cleaned = raw.strip()
    upper = cleaned.upper()
    if upper in _ABBREV_TO_STATE:
        return _ABBREV_TO_STATE[upper]

    if cleaned.lower() in _STATE_NAMES:
        for full in _ABBREV_TO_STATE.values():
            if full.lower() == cleaned.lower():
                return full

    digits = re.sub(r"\D", "", cleaned)
    if len(digits) == 6:
        prefix = digits[:3]
        if prefix in _PIN_PREFIX_TO_STATE:
            return _PIN_PREFIX_TO_STATE[prefix]

    return None


def resolve_location(
    location_hint: str | None = None,
    query_text: str = "",
) -> UserContext:
    """Resolve location from hint or query text. Returns UserContext."""
    if location_hint:
        state = _normalize_state(location_hint)
        if state:
            logger.info("Location resolved from hint: %s -> %s", location_hint, state)
            return UserContext(state=state, voter_status="first-time")

    for abbrev, full_name in _ABBREV_TO_STATE.items():
        if re.search(rf"\b{re.escape(full_name)}\b", query_text, re.IGNORECASE):
            logger.info("Location found in query text: %s", full_name)
            return UserContext(state=full_name, voter_status="first-time")
        if len(abbrev) == 2 and re.search(rf"\b{abbrev}\b", query_text):
            logger.info("Abbreviation found: %s -> %s", abbrev, full_name)
            return UserContext(state=full_name, voter_status="first-time")

    pin_match = re.search(r"\b(\d{6})\b", query_text)
    if pin_match:
        prefix = pin_match.group(1)[:3]
        if prefix in _PIN_PREFIX_TO_STATE:
            state = _PIN_PREFIX_TO_STATE[prefix]
            logger.info("PIN resolved: %s -> %s", pin_match.group(1), state)
            return UserContext(state=state, voter_status="first-time")

    query_lower = query_text.lower()
    for city, state in _CITY_TO_STATE.items():
        if city in query_lower:
            logger.info("City found: %s -> %s", city, state)
            return UserContext(state=state, voter_status="first-time")

    logger.warning("Could not resolve location - defaulting to Maharashtra")
    return UserContext(state="Maharashtra", voter_status="unknown")
