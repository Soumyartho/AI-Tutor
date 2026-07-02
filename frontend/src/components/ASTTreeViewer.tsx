// ASTTreeViewer (US-002): the SymPy expression tree, rendered with React Flow +
// ELK layout and glassmorphic KaTeX nodes — unified with the reasoning/recursion
// views. Operator nodes show the operation glyph; leaves show the value.
import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { elkLayout } from "../lib/elk";
import { NODE_TYPES, type MathNodeData } from "./flowNodes";
import type { TreeNode } from "../types/api";

// SymPy class name -> readable operator glyph (KaTeX).
const OP_GLYPH: Record<string, string> = {
  Add: "+",
  Mul: "\\times",
  Pow: "x^{n}",
  Equality: "=",
  Eq: "=",
};

function astToFlow(root: TreeNode): { nodes: Node<MathNodeData>[]; edges: Edge[] } {
  const nodes: Node<MathNodeData>[] = [];
  const edges: Edge[] = [];
  let counter = 0;

  const walk = (node: TreeNode, parentId: string | null, depth: number): void => {
    const id = `ast-${counter++}`;
    const isOp = node.children.length > 0;
    const latex = isOp ? OP_GLYPH[node.type] ?? node.type : node.value ?? node.latex;
    nodes.push({
      id,
      type: "math",
      position: { x: 0, y: 0 },
      width: 88,
      height: 52,
      data: { latex, kind: isOp ? "op" : "leaf" },
    });
    if (parentId) {
      edges.push({
        id: `${parentId}-${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
        className: "flow-edge",
        style: { animationDelay: `${depth * 0.12}s` },
      });
    }
    node.children.forEach((c) => walk(c, id, depth + 1));
  };

  walk(root, null, 0);
  return { nodes, edges };
}

function flattenLabels(node: TreeNode): string {
  return [node.label, ...node.children.map(flattenLabels)].join("; ");
}

export function ASTTreeViewer({ root }: { root: TreeNode }) {
  const base = useMemo(() => astToFlow(root), [root]);
  const [nodes, setNodes] = useState<Node<MathNodeData>[]>([]);
  const a11yText = useMemo(() => flattenLabels(root), [root]);

  useEffect(() => {
    let cancelled = false;
    elkLayout(base.nodes, base.edges, {
      direction: "DOWN",
      nodeWidth: 88,
      nodeHeight: 52,
      nodeSpacing: 36,
      layerSpacing: 60,
    }).then((laid) => {
      if (!cancelled) setNodes(laid);
    });
    return () => {
      cancelled = true;
    };
  }, [base]);

  return (
    <div className="ast-viewer flow-graph" style={{ width: "100%", height: 380 }} data-lenis-prevent>
      <p className="visually-hidden">Expression tree structure: {a11yText}</p>
      <ReactFlow
        nodes={nodes}
        edges={base.edges}
        nodeTypes={NODE_TYPES}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2a2f3a" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
