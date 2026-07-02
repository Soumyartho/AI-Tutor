"""Bounded recursion / DS execution tracer (US-005).

Runs a CURATED set of recursive functions and captures the call graph via a
manual instrumentation wrapper (not user-supplied code — no arbitrary execution,
per PRD). @GUARD R-04 hard caps (MAX_TRACE_DEPTH, MAX_TRACE_NODES) are enforced
inside the tracer itself, independent of the curated example being "small", so a
still-curated-but-explosive input like fib(40) truncates gracefully instead of
exploding.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from app.core.config import get_settings
from app.schemas.models import TraceEdge, TraceGraph, TraceNode


class TraceLimitError(Exception):
    """Internal signal that a hard cap was hit; caller marks graph truncated."""


@dataclass
class _Recorder:
    max_depth: int
    max_nodes: int
    nodes: list[TraceNode] = field(default_factory=list)
    edges: list[TraceEdge] = field(default_factory=list)
    truncated: bool = False
    _counter: int = 0

    def new_id(self) -> str:
        self._counter += 1
        return f"n{self._counter}"

    def check(self, depth: int) -> None:
        if depth > self.max_depth or len(self.nodes) >= self.max_nodes:
            self.truncated = True
            raise TraceLimitError


def _trace_fibonacci(rec: _Recorder, n: int, depth: int, parent: str | None) -> tuple[str, int]:
    rec.check(depth)
    node_id = rec.new_id()
    node = TraceNode(id=node_id, label=f"fib({n})", detail=f"n={n}", depth=depth)
    rec.nodes.append(node)
    if parent is not None:
        rec.edges.append(TraceEdge(source=parent, target=node_id, kind="call"))

    if n < 2:
        result = n
    else:
        left_id, left = _trace_fibonacci(rec, n - 1, depth + 1, node_id)
        right_id, right = _trace_fibonacci(rec, n - 2, depth + 1, node_id)
        result = left + right
        rec.edges.append(TraceEdge(source=left_id, target=node_id, kind="return",
                                   label=str(left)))
        rec.edges.append(TraceEdge(source=right_id, target=node_id, kind="return",
                                   label=str(right)))

    node.return_value = str(result)
    node.detail = f"n={n} → {result}"
    return node_id, result


def _trace_factorial(rec: _Recorder, n: int, depth: int, parent: str | None) -> tuple[str, int]:
    rec.check(depth)
    node_id = rec.new_id()
    node = TraceNode(id=node_id, label=f"fact({n})", detail=f"n={n}", depth=depth)
    rec.nodes.append(node)
    if parent is not None:
        rec.edges.append(TraceEdge(source=parent, target=node_id, kind="call"))

    if n <= 1:
        result = 1
    else:
        child_id, child = _trace_factorial(rec, n - 1, depth + 1, node_id)
        result = n * child
        rec.edges.append(TraceEdge(source=child_id, target=node_id, kind="return",
                                   label=str(child)))

    node.return_value = str(result)
    node.detail = f"n={n} → {result}"
    return node_id, result


# Curated registry — the ONLY functions the tracer will run (PRD: no user code).
_EXAMPLES: dict[str, Callable[[_Recorder, int, int, str | None], tuple[str, int]]] = {
    "fibonacci": _trace_fibonacci,
    "factorial": _trace_factorial,
}


def available_examples() -> list[str]:
    return sorted(_EXAMPLES)


def run_trace(example_id: str, n: int) -> TraceGraph:
    if example_id not in _EXAMPLES:
        raise ValueError(f"Unknown example '{example_id}'. Available: {available_examples()}")
    settings = get_settings()
    if n < 0:
        raise ValueError("n must be non-negative.")
    rec = _Recorder(max_depth=settings.max_trace_depth, max_nodes=settings.max_trace_nodes)
    try:
        _EXAMPLES[example_id](rec, n, 0, None)
    except TraceLimitError:
        pass  # truncated flag already set; return the partial graph
    return TraceGraph(nodes=rec.nodes, edges=rec.edges, truncated=rec.truncated)
