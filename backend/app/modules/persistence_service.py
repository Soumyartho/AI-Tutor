"""Firestore persistence (US-008), backend-mediated.

All writes go through the Admin SDK with the uid taken from the VERIFIED JWT —
never a client-supplied uid (per @ARCH failure-points). Firestore is optional:
if credentials aren't configured, calls become no-ops / empty reads so the rest
of the API still functions in local dev.
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger("its.persistence")

_db = None
_init_attempted = False


def _get_db():
    global _db, _init_attempted
    if _db is not None:
        return _db
    if _init_attempted:
        return None
    _init_attempted = True
    settings = get_settings()
    if not settings.persistence_enabled:
        logger.info("Persistence disabled (no GOOGLE_APPLICATION_CREDENTIALS).")
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.google_application_credentials)
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
        return _db
    except Exception as exc:  # noqa: BLE001 — degrade rather than 500
        logger.warning("Firestore init failed: %s", exc)
        return None


def save_session(uid: str, payload: dict[str, Any]) -> str | None:
    db = _get_db()
    if db is None:
        return None
    ref = db.collection("users").document(uid).collection("sessions").document()
    ref.set({**payload, "createdAtServer": _server_ts()})
    return ref.id


def list_sessions(uid: str, limit: int = 50) -> list[dict[str, Any]]:
    db = _get_db()
    if db is None:
        return []
    query = (
        db.collection("users").document(uid).collection("sessions")
        .order_by("createdAtServer", direction="DESCENDING").limit(limit)
    )
    return [{**doc.to_dict(), "id": doc.id} for doc in query.stream()]


def add_event(uid: str, session_id: str, event: dict[str, Any]) -> bool:
    db = _get_db()
    if db is None:
        return False
    (
        db.collection("users").document(uid)
        .collection("sessions").document(session_id)
        .collection("events").document()
        .set({**event, "createdAtServer": _server_ts()})
    )
    return True


def add_error_event(uid: str, event: dict[str, Any]) -> str | None:
    """Store a flawed-submission error event for Phase 2 clustering (US-009)."""
    db = _get_db()
    if db is None:
        return None
    ref = db.collection("users").document(uid).collection("errorEvents").document()
    ref.set({**event, "createdAtServer": _server_ts()})
    return ref.id


def all_error_texts(limit: int = 1000) -> list[str]:
    """Cohort-wide error texts across all users for clustering.

    @ETHICS: returns only the error TEXT (concept signal), never user identifiers —
    clustering describes misconceptions, not students.
    """
    db = _get_db()
    if db is None:
        return []
    texts: list[str] = []
    for doc in db.collection_group("errorEvents").limit(limit).stream():
        data = doc.to_dict() or {}
        text = data.get("text")
        if text:
            texts.append(text)
    return texts


def _server_ts():
    from firebase_admin import firestore

    return firestore.SERVER_TIMESTAMP
