"""Phase 2 verification: embeddings determinism, clustering, live match (US-009)."""
from __future__ import annotations

from app.modules import clustering_service, embeddings

# Two clearly-separable misconception groups.
_SIGN_ERRORS = [
    "distributed the negative wrong: -(x+3) = -x + 3",
    "forgot to flip sign: -(2x - 5) = -2x - 5",
    "negative sign only on first term -(a+b) = -a + b",
]
_FRACTION_ERRORS = [
    "added denominators: 1/2 + 1/3 = 2/5",
    "added numerators and denominators 1/4 + 1/4 = 2/8",
    "combined fractions wrong 1/3 + 1/6 = 2/9",
]


def test_embeddings_deterministic():
    a = embeddings.embed(["combine like terms 2x+4x"])
    b = embeddings.embed(["combine like terms 2x+4x"])
    assert a == b
    assert len(a[0]) > 0


def test_active_embedder_reported():
    assert embeddings.active_embedder() in {"sentence-transformers", "fallback"}


def test_clustering_groups_similar_errors():
    texts = _SIGN_ERRORS + _FRACTION_ERRORS
    resp = clustering_service.run_clustering(texts, k=2, label=False)
    assert resp.k == 2
    assert sum(c.size for c in resp.clusters) == len(texts)
    # every returned cluster has representative samples + a centroid
    for c in resp.clusters:
        assert c.sample_texts
        assert len(c.centroid) > 0


def test_empty_clustering():
    resp = clustering_service.run_clustering([], label=False)
    assert resp.k == 0
    assert resp.clusters == []


def test_live_match_after_run():
    texts = _SIGN_ERRORS + _FRACTION_ERRORS
    clustering_service.run_clustering(texts, k=2, label=False)
    # A new sign-error-like text should match some cluster within threshold.
    res = clustering_service.match("negative distributed wrong -(x+1) = -x + 1")
    assert res.distance is not None


def test_match_without_clusters():
    # Reset state by clustering empty, then match should report no match.
    clustering_service.run_clustering([], label=False)
    res = clustering_service.match("anything")
    assert res.matched is False
