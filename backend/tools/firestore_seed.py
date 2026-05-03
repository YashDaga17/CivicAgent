"""
Firestore Seeder — loads election_data.json into Firestore.

Run: python -m tools.firestore_seed
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s │ %(message)s")
logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "election_data.json"


def seed_firestore():
    """Seed Firestore with election data from local JSON."""
    # Add parent to path for config import
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from config import settings

    try:
        from google.cloud import firestore
    except ImportError:
        logger.error("google-cloud-firestore not installed")
        return

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    states = data.get("states", {})

    if not states:
        logger.error("No state data found in %s", DATA_PATH)
        return

    db = firestore.Client(project=settings.gcp_project_id)
    collection = settings.firestore_collection

    logger.info("Seeding %d states into Firestore collection '%s'...", len(states), collection)

    for state_name, state_data in states.items():
        doc_ref = db.collection(collection).document(state_name)
        doc_ref.set(state_data)
        logger.info("  ✓ %s", state_name)

    logger.info("✅ Seeding complete! %d states written to Firestore.", len(states))


if __name__ == "__main__":
    seed_firestore()
