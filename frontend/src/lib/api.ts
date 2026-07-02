// API client. Attaches the Firebase JWT (when auth is enabled) to every request
// and normalizes backend error envelopes.
import { auth } from "./firebase";
import type {
  ClusterRunResponse,
  ExplainResponse,
  MatchResponse,
  SolveResponse,
  Step,
  TraceGraph,
} from "../types/api";

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// Base URL for the deployed backend (e.g. "https://your-backend.onrender.com").
// Left empty for local dev, where the Vite dev server proxies /api to
// localhost:8000 (see vite.config.ts) — relative paths work as-is there.
// In production (Vercel), the frontend and backend are separate deployments
// with no proxy, so this MUST be set to the backend's public URL.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function resolve(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(resolve(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(resolve(path), { headers: { ...(await authHeader()) } });
  return handle<T>(res);
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let code = "error";
  let message = res.statusText;
  try {
    const data = await res.json();
    const detail = data.detail;
    if (detail && typeof detail === "object" && "error" in detail) {
      code = detail.error;
      message = detail.message ?? message;
    } else if (typeof detail === "string") {
      message = detail;
    }
  } catch {
    /* non-JSON error body */
  }
  throw new ApiRequestError(code, message, res.status);
}

export const api = {
  solve: (expression: string) =>
    post<SolveResponse>("/api/solve/equation", { expression }),
  traceExamples: () => get<{ examples: string[] }>("/api/trace/examples"),
  trace: (example_id: string, n: number) =>
    post<TraceGraph>("/api/trace/recursion", { example_id, n }),
  explain: (step: Step) =>
    post<ExplainResponse>("/api/explain/step", { step }),
  sessions: () => get<{ sessions: unknown[] }>("/api/sessions"),
  logError: (text: string, related_session_id?: string) =>
    post<{ id: string | null }>("/api/errors", { text, related_session_id }),
  runClustering: (texts?: string[], k?: number) =>
    post<ClusterRunResponse>("/api/clustering/run", { texts, k }),
  getClusters: () => get<ClusterRunResponse>("/api/clustering/clusters"),
  matchError: (text: string) =>
    post<MatchResponse>("/api/clustering/match", { text }),
};
