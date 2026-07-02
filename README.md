# Explainable Symbolic-AI Intelligent Tutoring System

A web app that teaches algebra and foundational programming concepts through
**deterministic, step-by-step symbolic reasoning** — not free-form LLM output.
Every math/logic step is computed by SymPy (infallible); an LLM (Groq) only
*narrates* already-computed steps. Reasoning is made visible via AST trees,
reasoning-path graphs, recursion call-graphs, and interactive plots.

Built via the `AI_COWORKER` agent pipeline (`@PM → @GUARD → @ARCH → @DESIGN →
@BE + @FE → @SEC → @ETHICS → @QA`). Planning artifacts live in
`AI_COWORKER/shared_memory/`; `final_project_context.md` is the source of truth.

## Stack
- **Frontend**: React + Vite + TypeScript, vanilla CSS, react-d3-tree, React Flow + dagre, Mafs, Framer Motion, KaTeX, Firebase Auth
- **Backend**: FastAPI + Python, SymPy, Instructor + Groq, python-jose, firebase-admin (Firestore)

## Run it

### Backend
```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # optional: fill Firebase/Groq; blanks run in dev mode
python -m uvicorn app.main:app --reload --port 8000
```
- `AUTH_REQUIRED=false` (default) → runs without Firebase (stub user). **Set `true` for production.**
- No `GROQ_API_KEY` → explanations degrade gracefully (symbolic steps still shown).
- No Firebase credentials → persistence is a no-op.

Tests: `cd backend && python -m pytest` (15 tests).

### Frontend
```bash
cd frontend
npm install
cp .env.example .env            # optional: fill Firebase web config
npm run dev                     # http://localhost:5173 (proxies /api → :8000)
```
Build: `npm run build`.

## Key API
- `POST /api/solve/equation` `{expression}` → `{input_latex, ast, steps[], solution_latex}`
- `POST /api/trace/recursion` `{example_id, n}` → `{nodes[], edges[], truncated}`
- `POST /api/explain/step` `{step}` → `{explanation?, degraded}`
- `GET /api/sessions`, `GET /api/health`, `GET /api/trace/examples`

## Safety (from @GUARD)
Input length + AST-node caps, hard solve timeout (process-killed), restricted
parser (no code execution), bounded recursion tracer, capped LLM retries with
graceful degradation, stateless JWT auth with JWKS caching.

## Before production launch (from gates)
- Set `AUTH_REQUIRED=true` + real Firebase config (@SEC V-04)
- Add data-deletion/export endpoint + AI-use disclosure (@ETHICS C-01/C-02)
- Add real-JWT verification test (@QA B-01)

## Phase 2 (deferred)
Student error-pattern clustering (Sentence-Transformers + K-Means) and the
explainable-vs-black-box retention study.
