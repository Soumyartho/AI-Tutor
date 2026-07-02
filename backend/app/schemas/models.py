"""Pydantic schemas — the network contract shared with the TypeScript frontend.

Frontend `src/types/api.ts` mirrors these exactly (per @ARCH: strict interfaces
on the FE that mirror Pydantic schemas on the BE).
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---- Symbolic solving (US-001 / US-002) -------------------------------------

class TreeNode(BaseModel):
    """A serialized SymPy expression-tree node (US-002)."""
    type: str = Field(..., description="SymPy class name, e.g. 'Add', 'Mul', 'Pow', 'Symbol', 'Integer'")
    value: Optional[str] = Field(None, description="Leaf value for atoms (symbol name or number)")
    latex: str = Field(..., description="KaTeX-renderable LaTeX for this subtree")
    label: str = Field(..., description="Plain-text a11y label, e.g. 'Multiplication of x and y'")
    children: list["TreeNode"] = Field(default_factory=list)


class Step(BaseModel):
    """One pedagogical transformation. Produced ONLY by the symbolic engine."""
    previous_state: str = Field(..., description="Expression before the rule, LaTeX")
    operation: str = Field(..., description="Machine rule id, e.g. 'COMBINE_LIKE_TERMS'")
    operation_label: str = Field(..., description="Human label, e.g. 'Combine like terms'")
    new_state: str = Field(..., description="Expression after the rule, LaTeX")


class SolveRequest(BaseModel):
    expression: str = Field(..., min_length=1, description="Raw student input, e.g. '2x + 4x = 12'")


class SolveResponse(BaseModel):
    input_latex: str
    ast: TreeNode
    steps: list[Step]
    solution_latex: Optional[str] = None


# ---- Recursion / DS tracing (US-005) ----------------------------------------

class TraceNode(BaseModel):
    id: str
    label: str = Field(..., description="e.g. 'fib(3)'")
    detail: str = Field(..., description="locals / return value summary")
    depth: int
    return_value: Optional[str] = None


class TraceEdge(BaseModel):
    source: str
    target: str
    kind: Literal["call", "return"]
    label: Optional[str] = None


class TraceGraph(BaseModel):
    nodes: list[TraceNode]
    edges: list[TraceEdge]
    truncated: bool = Field(False, description="True if a hard cap (R-04) was hit")


class TraceRequest(BaseModel):
    example_id: str = Field(..., description="Curated example id, e.g. 'fibonacci'")
    n: int = Field(..., ge=0, description="Bounded input; server enforces caps")


# ---- Natural-language explanation (US-007) ----------------------------------

class ExplainRequest(BaseModel):
    step: Step


class Explanation(BaseModel):
    """Groq/Instructor-validated narration of an already-computed step."""
    title: str
    conceptual_reasoning: str
    common_pitfall_warning: str


class ExplainResponse(BaseModel):
    explanation: Optional[Explanation] = None
    degraded: bool = Field(False, description="True if Groq was unavailable/failed (R-03 fallback)")


# ---- Error clustering (Phase 2 / US-009) ------------------------------------

class ErrorEventRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Student's flawed step/reasoning text")
    related_session_id: Optional[str] = None


class ClusterRunRequest(BaseModel):
    k: Optional[int] = Field(None, ge=2, le=20, description="Number of clusters; auto if omitted")
    texts: Optional[list[str]] = Field(
        None, description="Ad-hoc texts to cluster; if omitted, uses stored error events"
    )


class Cluster(BaseModel):
    id: str
    label: str
    size: int
    sample_texts: list[str]
    centroid: list[float]


class ClusterRunResponse(BaseModel):
    clusters: list[Cluster]
    embedder: str
    k: int


class MatchRequest(BaseModel):
    text: str = Field(..., min_length=1)


class MatchResponse(BaseModel):
    matched: bool
    cluster_id: Optional[str] = None
    label: Optional[str] = None
    distance: Optional[float] = None


TreeNode.model_rebuild()
