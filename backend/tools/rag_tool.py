"""
RAGTool — retrieves structured Indian election guidelines and timeline data.

Data source priority:
  1. Firestore collection `election_guidelines` (when available).
  2. Local fallback from `data/election_data.json`.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from models.schemas import TimelineStep

logger = logging.getLogger(__name__)

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "election_data.json"

_LOCAL_DATA: dict = {}
try:
    _LOCAL_DATA = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    logger.info("Loaded local election data from %s", _DATA_PATH)
except FileNotFoundError:
    logger.warning("Local election data not found at %s", _DATA_PATH)
except json.JSONDecodeError as exc:
    logger.error("Failed to parse election data: %s", exc)


def _try_firestore(state: str) -> dict | None:
    """Attempt to fetch state election data from Firestore."""
    try:
        from google.cloud import firestore
        from config import settings

        db = firestore.Client(project=settings.gcp_project_id)
        doc_ref = db.collection(settings.firestore_collection).document(state)
        doc = doc_ref.get()

        if doc.exists:
            logger.info("Fetched election data for %s from Firestore", state)
            return doc.to_dict()
        return None
    except Exception as exc:
        logger.warning("Firestore unavailable, falling back to local data: %s", exc)
        return None


def _build_timeline_steps(state_data: dict, state: str) -> list[TimelineStep]:
    """Convert raw state data into Indian election TimelineStep objects."""
    steps: list[TimelineStep] = []

    step_definitions = [
        {
            "title": "Voter Registration (Form 6)",
            "date_key": "registration_deadline",
            "description": f"Register as a voter in {state} using Form 6 on the NVSP portal or Voter Helpline App. You must be 18+ years old on the qualifying date.",
            "link_key": "registration_url",
        },
        {
            "title": "Nomination Filing",
            "date_key": "nomination_filing_start",
            "description": f"Candidates file nominations from {state_data.get('nomination_filing_start', 'TBD')} to {state_data.get('nomination_filing_end', 'TBD')}. Scrutiny of nominations on {state_data.get('scrutiny_date', 'TBD')}.",
            "link_key": "election_info_url",
        },
        {
            "title": "Withdrawal of Candidature",
            "date_key": "withdrawal_deadline",
            "description": f"Last date for candidates to withdraw their nominations. Final list of contesting candidates is published after this date.",
            "link_key": "election_info_url",
        },
        {
            "title": "Campaign Silence Period",
            "date_key": "campaign_end",
            "description": "All election campaigning must stop 48 hours before polling. Model Code of Conduct remains in effect.",
            "link_key": "election_info_url",
        },
        {
            "title": "Polling Day",
            "date_key": "polling_date",
            "description": f"Cast your vote at your assigned polling booth in {state}. {'Carry your EPIC (Voter ID) or any ECI-approved photo ID.' if state_data.get('voter_id_required') else 'Carry valid identification.'} Voting is done on EVMs with VVPAT.",
            "link_key": "election_info_url",
        },
        {
            "title": "Counting & Results",
            "date_key": "counting_date",
            "description": f"Votes are counted and results declared by the Election Commission. {state} results expected on {state_data.get('results_declaration', 'TBD')}.",
            "link_key": "election_info_url",
        },
    ]

    for defn in step_definitions:
        date_value = state_data.get(defn["date_key"], "TBD")
        steps.append(
            TimelineStep(
                step=len(steps) + 1,
                title=defn["title"],
                date=date_value,
                description=defn["description"],
                action_link=state_data.get(defn["link_key"], ""),
            )
        )

    return steps


def retrieve_election_data(state: str) -> tuple[list[TimelineStep], list[str]]:
    """Retrieve election timeline steps and guidelines for an Indian state."""
    firestore_data = _try_firestore(state)
    if firestore_data:
        steps = _build_timeline_steps(firestore_data, state)
        guidelines = firestore_data.get("guidelines", [])
        return steps, guidelines

    states = _LOCAL_DATA.get("states", {})
    state_data = states.get(state)

    if not state_data:
        logger.warning("No local data for state '%s' — returning generic steps", state)
        return [
            TimelineStep(
                step=1,
                title="Voter Registration (Form 6)",
                date="Open year-round",
                description=f"Register as a voter in {state} via the NVSP portal (voters.eci.gov.in) or the Voter Helpline App.",
                action_link="https://voters.eci.gov.in/",
            ),
            TimelineStep(
                step=2,
                title="Polling Day",
                date="Check ECI website",
                description="Visit your assigned polling booth with a valid photo ID. Dial 1950 for election helpline.",
                action_link="https://eci.gov.in/",
            ),
        ], [f"Detailed data for {state} is not available yet. Visit eci.gov.in for official information."]

    steps = _build_timeline_steps(state_data, state)
    guidelines = state_data.get("guidelines", [])
    return steps, guidelines
