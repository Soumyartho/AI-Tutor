"""Natural-language explanation layer (US-007).

Groq (via Instructor) narrates an ALREADY-COMPUTED symbolic step. The LLM never
computes or decides an answer — it only explains the transformation it is handed.

@GUARD R-03: capped retries; ANY failure (no key, timeout, API error, exhausted
retries) returns degraded=True so the frontend still ships the symbolic step.
The Groq client and Instructor are imported lazily so the app runs without them
installed / configured (local dev, tests).
"""
from __future__ import annotations

import logging

from app.core.config import get_settings
from app.schemas.models import Explanation, ExplainResponse, Step

logger = logging.getLogger("its.explain")

_SYSTEM_PROMPT = (
    "You are an empathetic, precise math tutor. You will be given a single, "
    "already-verified algebra transformation (previous state, the rule applied, "
    "and the resulting state). Your ONLY job is to explain this specific step in "
    "plain language. Do NOT recompute, verify, or change the math — it is already "
    "correct. Fill every field. Keep it concise and encouraging."
)

_client = None  # lazily-instantiated Instructor-patched Groq client


def _get_client():
    global _client
    if _client is not None:
        return _client
    settings = get_settings()
    if not settings.groq_api_key:
        return None
    try:
        import instructor
        from groq import Groq

        _client = instructor.from_groq(Groq(api_key=settings.groq_api_key))
        return _client
    except Exception as exc:  # noqa: BLE001 — missing deps / bad config => degrade
        logger.warning("Groq/Instructor unavailable: %s", exc)
        return None


def explain_step(step: Step) -> ExplainResponse:
    client = _get_client()
    if client is None:
        return ExplainResponse(explanation=None, degraded=True)

    settings = get_settings()
    user_msg = (
        f"Previous state: {step.previous_state}\n"
        f"Rule applied: {step.operation_label} ({step.operation})\n"
        f"Resulting state: {step.new_state}"
    )
    try:
        explanation: Explanation = client.chat.completions.create(
            model=settings.groq_model,
            response_model=Explanation,
            max_retries=2,  # R-03: capped
            timeout=10.0,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
        )
        return ExplainResponse(explanation=explanation, degraded=False)
    except Exception as exc:  # noqa: BLE001 — R-03: never let NL failure block core
        logger.warning("Explanation degraded: %s", exc)
        return ExplainResponse(explanation=None, degraded=True)
