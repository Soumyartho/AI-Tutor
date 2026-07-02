"""FastAPI application entrypoint (US-001, US-006 wired; US-005/007/008 added in Wave 2).

NOTE: this module deliberately does NOT use `from __future__ import annotations`.
The slowapi rate-limit decorator wraps endpoints with functools.wraps; if
annotations were strings, FastAPI would try to resolve them in slowapi's module
namespace and fail to recognize the Pydantic request body. Real annotation
objects avoid that.
"""
import logging

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.timeout import SolveTimeoutError, run_with_timeout, shutdown as shutdown_executor
from app.modules.auth import CurrentUser, get_current_user
from app.modules import (
    clustering_service,
    explain_service,
    persistence_service,
    trace_engine,
)
from app.modules.solve_service import _solve_job
from app.modules.symbolic_engine import ComplexityError, ExpressionError
from app.schemas.models import (
    ClusterRunRequest,
    ClusterRunResponse,
    ErrorEventRequest,
    ExplainRequest,
    ExplainResponse,
    MatchRequest,
    MatchResponse,
    SolveRequest,
    SolveResponse,
    TraceGraph,
    TraceRequest,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("its")

settings = get_settings()

# Rate limit keyed by authenticated uid when present, else client IP.
def _rate_key(request: Request) -> str:
    user: CurrentUser | None = getattr(request.state, "current_user", None)
    return user.uid if user else get_remote_address(request)


limiter = Limiter(key_func=_rate_key)
app = FastAPI(title="Explainable Symbolic-AI ITS", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
def _on_shutdown() -> None:
    shutdown_executor()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/solve/equation", response_model=SolveResponse)
@limiter.limit("30/minute")
def solve_equation(
    request: Request,
    body: SolveRequest,
    user: CurrentUser = Depends(get_current_user),
) -> SolveResponse:
    request.state.current_user = user
    try:
        # R-01: run the whole parse+solve under a hard wall-clock timeout.
        return run_with_timeout(_solve_job, body.expression, timeout=settings.solve_timeout_seconds)
    except SolveTimeoutError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "expression_too_complex", "message": str(exc)},
        ) from exc
    except ComplexityError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "expression_too_complex", "message": str(exc)},
        ) from exc
    except ExpressionError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "invalid_expression", "message": str(exc)},
        ) from exc


@app.get("/api/trace/examples")
def trace_examples() -> dict[str, list[str]]:
    return {"examples": trace_engine.available_examples()}


@app.post("/api/trace/recursion", response_model=TraceGraph)
@limiter.limit("30/minute")
def trace_recursion(
    request: Request,
    body: TraceRequest,
    user: CurrentUser = Depends(get_current_user),
) -> TraceGraph:
    request.state.current_user = user
    try:
        # R-04 caps live inside the tracer; still guard wall-clock via timeout.
        return run_with_timeout(
            trace_engine.run_trace, body.example_id, body.n,
            timeout=settings.solve_timeout_seconds,
        )
    except SolveTimeoutError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "trace_too_complex", "message": str(exc)},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "invalid_trace_request", "message": str(exc)},
        ) from exc


@app.post("/api/explain/step", response_model=ExplainResponse)
@limiter.limit("15/minute")  # stricter: Groq cost surface (@ARCH)
def explain_step(
    request: Request,
    body: ExplainRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ExplainResponse:
    request.state.current_user = user
    # R-03: explain_service never raises for LLM failure; returns degraded=True.
    return explain_service.explain_step(body.step)


@app.get("/api/sessions")
@limiter.limit("60/minute")
def get_sessions(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, list]:
    request.state.current_user = user
    return {"sessions": persistence_service.list_sessions(user.uid)}


# ---- Phase 2: error-pattern clustering (US-009) -----------------------------

@app.post("/api/errors")
@limiter.limit("60/minute")
def log_error(
    request: Request,
    body: ErrorEventRequest,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, str | None]:
    request.state.current_user = user
    event_id = persistence_service.add_error_event(
        user.uid, {"text": body.text, "relatedSessionId": body.related_session_id}
    )
    return {"id": event_id}


@app.post("/api/clustering/run", response_model=ClusterRunResponse)
@limiter.limit("10/minute")  # heavier batch job
def run_clustering(
    request: Request,
    body: ClusterRunRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ClusterRunResponse:
    request.state.current_user = user
    texts = body.texts
    if texts is None:
        # Cohort-wide clustering over stored error events (@ETHICS: concepts, not students).
        texts = persistence_service.all_error_texts()
    return clustering_service.run_clustering(texts, body.k)


@app.get("/api/clustering/clusters", response_model=ClusterRunResponse)
@limiter.limit("60/minute")
def get_clusters(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> ClusterRunResponse:
    request.state.current_user = user
    from app.modules import embeddings

    clusters = clustering_service.get_clusters()
    return ClusterRunResponse(
        clusters=clusters, embedder=embeddings.active_embedder(), k=len(clusters)
    )


@app.post("/api/clustering/match", response_model=MatchResponse)
@limiter.limit("60/minute")
def match_error(
    request: Request,
    body: MatchRequest,
    user: CurrentUser = Depends(get_current_user),
) -> MatchResponse:
    request.state.current_user = user
    return clustering_service.match(body.text)
