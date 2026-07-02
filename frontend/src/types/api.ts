// Mirrors backend Pydantic schemas (app/schemas/models.py) exactly.
// @ARCH: strict FE interfaces mirroring BE schemas across the network boundary.

export interface TreeNode {
  type: string;
  value: string | null;
  latex: string;
  label: string;
  children: TreeNode[];
}

export interface Step {
  previous_state: string;
  operation: string;
  operation_label: string;
  new_state: string;
}

export interface SolveRequest {
  expression: string;
}

export interface SolveResponse {
  input_latex: string;
  ast: TreeNode;
  steps: Step[];
  solution_latex: string | null;
}

export interface TraceNode {
  id: string;
  label: string;
  detail: string;
  depth: number;
  return_value: string | null;
}

export interface TraceEdge {
  source: string;
  target: string;
  kind: "call" | "return";
  label: string | null;
}

export interface TraceGraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
  truncated: boolean;
}

export interface TraceRequest {
  example_id: string;
  n: number;
}

export interface Explanation {
  title: string;
  conceptual_reasoning: string;
  common_pitfall_warning: string;
}

export interface ExplainResponse {
  explanation: Explanation | null;
  degraded: boolean;
}

export interface ApiError {
  error: string;
  message: string;
}

// ---- Phase 2: error clustering (US-009) ----

export interface Cluster {
  id: string;
  label: string;
  size: number;
  sample_texts: string[];
  centroid: number[];
}

export interface ClusterRunResponse {
  clusters: Cluster[];
  embedder: string;
  k: number;
}

export interface MatchResponse {
  matched: boolean;
  cluster_id: string | null;
  label: string | null;
  distance: number | null;
}
