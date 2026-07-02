// Shared glassmorphic React Flow node components used across all three
// visualizations (AST tree, reasoning path, recursion tracer) for one
// consistent, professional visual language.
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Katex } from "./Katex";

// ---- MathNode: a glass card rendering KaTeX (AST leaves/ops + reasoning states) ----
export interface MathNodeData {
  latex: string;
  kind?: "op" | "leaf" | "state" | "result";
  badge?: string; // e.g. operator symbol or step index
  active?: boolean;
  dimmed?: boolean;
}

export const MathNode = memo(function MathNode({ data }: NodeProps<MathNodeData>) {
  const cls = [
    "flow-node",
    `flow-node--${data.kind ?? "state"}`,
    data.active ? "is-active" : "",
    data.dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      {data.badge && <span className="flow-node-badge">{data.badge}</span>}
      <span className="flow-node-body">
        <Katex latex={data.latex} />
      </span>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  );
});

// ---- CallNode: recursion call frame (label + return-value badge) ----
export interface CallNodeData {
  label: string; // e.g. "fib(3)"
  ret?: string | null; // return value
  kind: "call" | "base" | "return";
  active?: boolean;
  dimmed?: boolean;
  onStack?: boolean;
}

export const CallNode = memo(function CallNode({ data }: NodeProps<CallNodeData>) {
  const cls = [
    "flow-node",
    "call-node",
    `call-node--${data.kind}`,
    data.active ? "is-active" : "",
    data.onStack ? "is-onstack" : "",
    data.dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <span className="call-node-label">{data.label}</span>
      {data.ret != null && <span className="call-node-ret">→ {data.ret}</span>}
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  );
});

export const NODE_TYPES = { math: MathNode, call: CallNode };
