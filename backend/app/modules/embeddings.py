"""Embedding provider (Phase 2 / US-009).

Primary backend: sentence-transformers `all-MiniLM-L6-v2` (384-dim, mean pooling).
The model is heavy and lazy-loaded on first use.

Fallback: a deterministic hashing embedder used when sentence-transformers is not
installed/available. It is NOT semantically strong, but it keeps the entire
clustering pipeline runnable and testable offline, and its use is surfaced to the
caller via `active_embedder()` so results can be interpreted correctly.
"""
from __future__ import annotations

import hashlib
import logging
import math
import re

logger = logging.getLogger("its.embeddings")

_MODEL_NAME = "all-MiniLM-L6-v2"
_FALLBACK_DIM = 256

_model = None
_model_tried = False


def _load_model():
    global _model, _model_tried
    if _model is not None or _model_tried:
        return _model
    _model_tried = True
    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(_MODEL_NAME)
        logger.info("Loaded sentence-transformers model %s", _MODEL_NAME)
    except Exception as exc:  # noqa: BLE001 — missing dep / no network => fallback
        logger.warning("sentence-transformers unavailable, using fallback embedder: %s", exc)
        _model = None
    return _model


def active_embedder() -> str:
    return "sentence-transformers" if _load_model() is not None else "fallback"


def _fallback_embed(text: str) -> list[float]:
    """Deterministic bag-of-hashed-tokens vector, L2-normalized."""
    vec = [0.0] * _FALLBACK_DIM
    tokens = re.findall(r"[a-zA-Z0-9]+", text.lower())
    for tok in tokens:
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % _FALLBACK_DIM] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def embed(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. Deterministic for a fixed backend."""
    model = _load_model()
    if model is not None:
        return [list(map(float, v)) for v in model.encode(texts, normalize_embeddings=True)]
    return [_fallback_embed(t) for t in texts]
