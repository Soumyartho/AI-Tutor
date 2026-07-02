"""Wave 2 verification: tracer caps (R-04), explain degradation (R-03)."""
from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.modules import explain_service, trace_engine
from app.schemas.models import Step


def test_fibonacci_trace_structure():
    g = trace_engine.run_trace("fibonacci", 4)
    assert not g.truncated
    assert g.nodes[0].label == "fib(4)"
    assert any(e.kind == "return" for e in g.edges)
    # root return value of fib(4) is 3
    assert g.nodes[0].return_value == "3"


def test_factorial_trace():
    g = trace_engine.run_trace("factorial", 5)
    assert g.nodes[0].return_value == "120"


def test_trace_respects_node_cap(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("MAX_TRACE_NODES", "5")
    get_settings.cache_clear()
    try:
        g = trace_engine.run_trace("fibonacci", 10)
        assert g.truncated is True
        assert len(g.nodes) <= 5
    finally:
        get_settings.cache_clear()


def test_unknown_example_rejected():
    with pytest.raises(ValueError):
        trace_engine.run_trace("quicksort", 3)


def test_explain_degrades_without_groq():
    # No GROQ_API_KEY in test env -> must degrade gracefully, never raise (R-03).
    step = Step(previous_state="2x+4x", operation="COMBINE_LIKE_TERMS",
                operation_label="Combine like terms", new_state="6x")
    resp = explain_service.explain_step(step)
    assert resp.degraded is True
    assert resp.explanation is None
