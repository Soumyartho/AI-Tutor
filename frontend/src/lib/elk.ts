// ELK layout for React Flow graphs — far cleaner spacing than dagre (in
// particular it stops recursion-tree edges from overlapping into a mess).
// elk.layout is async, so callers run it in an effect and store the result.
import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "reactflow";

const elk = new ELK();

export interface ElkOptions {
  direction?: "DOWN" | "RIGHT";
  nodeWidth?: number;
  nodeHeight?: number;
  layerSpacing?: number;
  nodeSpacing?: number;
}

export async function elkLayout(
  nodes: Node[],
  edges: Edge[],
  opts: ElkOptions = {},
): Promise<Node[]> {
  const {
    direction = "DOWN",
    nodeWidth = 180,
    nodeHeight = 64,
    layerSpacing = 80,
    nodeSpacing = 48,
  } = opts;

  if (nodes.length === 0) return nodes;

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.layered.spacing.nodeNodeBetweenLayers": String(layerSpacing),
      "elk.spacing.nodeNode": String(nodeSpacing),
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: (n.width as number) ?? nodeWidth,
      height: (n.height as number) ?? nodeHeight,
    })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const laid = await elk.layout(graph);
  const posById = new Map((laid.children ?? []).map((c) => [c.id, c]));

  return nodes.map((n) => {
    const c = posById.get(n.id);
    return c ? { ...n, position: { x: c.x ?? 0, y: c.y ?? 0 } } : n;
  });
}
