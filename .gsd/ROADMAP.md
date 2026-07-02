# GSD Roadmap — Explainable Symbolic-AI ITS

> **Status**: ACTIVE
> **Source of Truth**: `AI_COWORKER/shared_memory/final_project_context.md`
> **Methodology**: SPEC → PLAN → EXECUTE → VERIFY → COMMIT

## Wave 1 — Backend Foundation (@BE)
- [ ] T1.1 Project scaffold: structure, `requirements.txt`, config, `.env.example`
- [ ] T1.2 `symbolic_engine`: safe parse (R-02), rule-based step traversal, AST serialize (US-001/US-002) + R-01 guards (complexity caps + timeout)
- [ ] T1.3 `auth`: Firebase JWT verify dependency, JWKS TTL cache (US-006, R-05)
- [ ] T1.4 FastAPI app wiring: `/api/solve/equation`, `/api/health`, rate limiting, CORS
- [ ] T1.5 Backend tests: symbolic engine correctness + complexity-guard rejection

## Wave 2 — Backend Services (@BE)
- [ ] T2.1 `trace_engine`: bounded recursion tracer → graph JSON (US-005, R-04)
- [ ] T2.2 `explain_service`: Instructor + Groq, degraded fallback (US-007, R-03)
- [ ] T2.3 `persistence_service`: Firestore sessions/events (US-008)

## Wave 3 — Frontend Foundation (@FE)
- [ ] T3.1 Vite + React + TS scaffold, vanilla CSS tokens, API client (JWT-attaching), React Query
- [ ] T3.2 Firebase Auth client + AuthForm + protected routing (US-006)
- [ ] T3.3 EquationInput + solve integration

## Wave 4 — Frontend Visualizations (@FE)
- [ ] T4.1 ASTTreeViewer (react-d3-tree + KaTeX) (US-002)
- [ ] T4.2 ReasoningFlowGraph (React Flow + dagre) (US-003)
- [ ] T4.3 RecursionTracerViewer (US-005)
- [ ] T4.4 GraphPlotter (Mafs) (US-004) + ExplanationPanel (US-007)
- [ ] T4.5 SessionHistoryList (US-008)

## Wave 5 — Gates
- [ ] @SEC audit → @ETHICS audit → @QA test → (fix loop, max 3)

## Deferred (Phase 2)
- clustering_service (US-009)
