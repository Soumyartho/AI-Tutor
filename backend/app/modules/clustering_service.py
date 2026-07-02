"""Error-pattern clustering (Phase 2 / US-009).

Groups semantically-similar student error submissions so recurring misconceptions
surface. K-Means runs over embeddings from `embeddings.py`. Uses scikit-learn's
KMeans when available; otherwise a small deterministic pure-Python K-Means so the
feature works with zero heavy dependencies and is fully testable.

@ETHICS constraint honored: clusters describe MISCONCEPTIONS (concepts), never
rank or profile individual students. Only error text + concept labels are stored.
"""
from __future__ import annotations

import logging

from app.modules import embeddings
from app.schemas.models import Cluster, ClusterRunResponse, MatchResponse

logger = logging.getLogger("its.clustering")

# In-memory index of the last computed clustering, for live match + retrieval.
# (Persistence to Firestore is handled by the endpoint layer when configured.)
_last_clusters: list[Cluster] = []

_MATCH_THRESHOLD = 0.6  # max centroid distance for a live intervention match


def _dist(a: list[float], b: list[float]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def _mean(vectors: list[list[float]]) -> list[float]:
    n = len(vectors)
    dim = len(vectors[0])
    return [sum(v[i] for v in vectors) / n for i in range(dim)]


def _auto_k(n: int) -> int:
    # Simple heuristic; keeps k sane for small cohorts.
    if n <= 3:
        return 1
    return max(2, min(6, int(n ** 0.5)))


def _pure_kmeans(vectors: list[list[float]], k: int, iters: int = 25) -> list[int]:
    """Deterministic K-Means. Init = evenly-spaced picks (no RNG, reproducible)."""
    n = len(vectors)
    step = max(1, n // k)
    centroids = [vectors[min(i * step, n - 1)] for i in range(k)]
    assignments = [0] * n
    for _ in range(iters):
        changed = False
        for i, v in enumerate(vectors):
            best = min(range(k), key=lambda c: _dist(v, centroids[c]))
            if best != assignments[i]:
                assignments[i] = best
                changed = True
        for c in range(k):
            members = [vectors[i] for i in range(n) if assignments[i] == c]
            if members:
                centroids[c] = _mean(members)
        if not changed:
            break
    return assignments


def _sklearn_kmeans(vectors: list[list[float]], k: int) -> list[int] | None:
    try:
        from sklearn.cluster import KMeans

        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        return [int(x) for x in model.fit_predict(vectors)]
    except Exception as exc:  # noqa: BLE001 — not installed => use pure-python
        logger.info("sklearn unavailable, using pure-python KMeans: %s", exc)
        return None


def _label_cluster(sample_texts: list[str], index: int) -> str:
    """Best-effort human label via the existing Groq path; auto label otherwise."""
    from app.modules.explain_service import _get_client
    from app.core.config import get_settings

    client = _get_client()
    if client is None:
        return f"Misconception cluster {index + 1}"
    try:
        from pydantic import BaseModel

        class _Label(BaseModel):
            label: str

        settings = get_settings()
        joined = "\n- ".join(sample_texts[:5])
        result = client.chat.completions.create(
            model=settings.groq_model,
            response_model=_Label,
            max_retries=1,
            timeout=10.0,
            messages=[
                {"role": "system", "content": (
                    "You label clusters of student math errors with a short, specific "
                    "misconception name (e.g. 'Sign error distributing a negative'). "
                    "Describe the CONCEPT, never the student."
                )},
                {"role": "user", "content": f"Errors:\n- {joined}"},
            ],
        )
        return result.label
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cluster labeling degraded: %s", exc)
        return f"Misconception cluster {index + 1}"


def run_clustering(texts: list[str], k: int | None = None, *, label: bool = True) -> ClusterRunResponse:
    global _last_clusters
    if not texts:
        _last_clusters = []
        return ClusterRunResponse(clusters=[], embedder=embeddings.active_embedder(), k=0)

    resolved_k = k or _auto_k(len(texts))
    resolved_k = min(resolved_k, len(texts))

    vectors = embeddings.embed(texts)
    assignments = _sklearn_kmeans(vectors, resolved_k)
    if assignments is None:
        assignments = _pure_kmeans(vectors, resolved_k)

    clusters: list[Cluster] = []
    for c in range(resolved_k):
        members = [i for i in range(len(texts)) if assignments[i] == c]
        if not members:
            continue
        member_vecs = [vectors[i] for i in members]
        centroid = _mean(member_vecs)
        # representative samples = closest to centroid
        ordered = sorted(members, key=lambda i: _dist(vectors[i], centroid))
        samples = [texts[i] for i in ordered[:5]]
        clusters.append(Cluster(
            id=f"cluster-{c}",
            label=_label_cluster(samples, c) if label else f"Cluster {c + 1}",
            size=len(members),
            sample_texts=samples,
            centroid=centroid,
        ))

    _last_clusters = clusters
    return ClusterRunResponse(clusters=clusters, embedder=embeddings.active_embedder(), k=len(clusters))


def get_clusters() -> list[Cluster]:
    return _last_clusters


def match(text: str) -> MatchResponse:
    if not _last_clusters:
        return MatchResponse(matched=False)
    vec = embeddings.embed([text])[0]
    best = min(_last_clusters, key=lambda c: _dist(vec, c.centroid))
    distance = _dist(vec, best.centroid)
    if distance <= _MATCH_THRESHOLD:
        return MatchResponse(matched=True, cluster_id=best.id, label=best.label, distance=distance)
    return MatchResponse(matched=False, distance=distance)
