// RecursionTracerViewer (US-005): bounded recursion trace rendered with React
// Flow + ELK layered layout (no more overlapping edges) and glassmorphic call
// nodes. Includes call-stack PLAYBACK — step through execution order with a live
// push/pop stack panel — which is the clearest way to teach recursion.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { AlertTriangle, GitBranch, Layers3, Loader2, Pause, Play, PlayCircle, RotateCcw } from "lucide-react";
import { elkLayout } from "../lib/elk";
import { api } from "../lib/api";
import { NODE_TYPES, type CallNodeData } from "./flowNodes";
import type { TraceGraph, TraceNode } from "../types/api";

const EXAMPLES = ["fibonacci", "factorial"];
const STEP_MS = 700;

interface Ev {
  type: "call" | "return";
  id: string;
}

// DFS over call edges (in creation order) → execution timeline of push/pop events.
function buildTimeline(graph: TraceGraph): Ev[] {
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  graph.edges
    .filter((e) => e.kind === "call")
    .forEach((e) => {
      if (!children.has(e.source)) children.set(e.source, []);
      children.get(e.source)!.push(e.target);
      hasParent.add(e.target);
    });
  const root = graph.nodes.find((n) => !hasParent.has(n.id));
  const evs: Ev[] = [];
  const dfs = (id: string) => {
    evs.push({ type: "call", id });
    (children.get(id) ?? []).forEach(dfs);
    evs.push({ type: "return", id });
  };
  if (root) dfs(root.id);
  return evs;
}

interface PlayState {
  called: Set<string>;
  returned: Set<string>;
  stack: string[];
  active: string | null;
}

function computeState(timeline: Ev[], upto: number): PlayState {
  const called = new Set<string>();
  const returned = new Set<string>();
  const stack: string[] = [];
  let active: string | null = null;
  for (let i = 0; i < upto && i < timeline.length; i++) {
    const ev = timeline[i];
    active = ev.id;
    if (ev.type === "call") {
      called.add(ev.id);
      stack.push(ev.id);
    } else {
      returned.add(ev.id);
      stack.pop();
    }
  }
  return { called, returned, stack, active };
}

export function RecursionTracerViewer() {
  const [example, setExample] = useState(EXAMPLES[0]);
  const [n, setN] = useState(4);

  const traceMut = useMutation<TraceGraph, Error, { example: string; n: number }>({
    mutationFn: ({ example, n }) => api.trace(example, n),
  });
  const graph = traceMut.data;

  const nodeById = useMemo(() => {
    const m = new Map<string, TraceNode>();
    graph?.nodes.forEach((tn) => m.set(tn.id, tn));
    return m;
  }, [graph]);

  const childCount = useMemo(() => {
    const c = new Map<string, number>();
    graph?.edges
      .filter((e) => e.kind === "call")
      .forEach((e) => c.set(e.source, (c.get(e.source) ?? 0) + 1));
    return c;
  }, [graph]);

  const timeline = useMemo(() => (graph ? buildTimeline(graph) : []), [graph]);

  const base = useMemo(() => {
    if (!graph) return { nodes: [] as Node<CallNodeData>[], edges: [] as Edge[] };
    const nodes: Node<CallNodeData>[] = graph.nodes.map((tn) => ({
      id: tn.id,
      type: "call",
      position: { x: 0, y: 0 },
      width: 150,
      height: 54,
      data: {
        label: tn.label,
        ret: tn.return_value,
        kind: (childCount.get(tn.id) ?? 0) === 0 ? "base" : "call",
      },
    }));
    // Only CALL edges form the tree skeleton (return values live on the nodes).
    const edges: Edge[] = graph.edges
      .filter((e) => e.kind === "call")
      .map((e, i) => ({
        id: `ce${i}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        className: "flow-edge",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#5b8def" },
      }));
    return { nodes, edges };
  }, [graph, childCount]);

  const [laidNodes, setLaidNodes] = useState<Node<CallNodeData>[]>([]);
  const [evIndex, setEvIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (base.nodes.length === 0) {
      setLaidNodes([]);
      return;
    }
    elkLayout(base.nodes, base.edges, {
      direction: "DOWN",
      nodeWidth: 150,
      nodeHeight: 54,
      nodeSpacing: 40,
      layerSpacing: 70,
    }).then((laid) => {
      if (!cancelled) {
        setLaidNodes(laid);
        setEvIndex(timeline.length); // default: fully expanded
      }
    });
    return () => {
      cancelled = true;
    };
  }, [base, timeline.length]);

  const stop = useCallback(() => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    setEvIndex(0);
    setIsPlaying(true);
    timer.current = window.setInterval(() => {
      setEvIndex((i) => {
        if (i >= timeline.length) {
          stop();
          return timeline.length;
        }
        return i + 1;
      });
    }, STEP_MS);
  }, [stop, timeline.length]);

  useEffect(() => stop, [stop]);

  const playing = isPlaying && evIndex < timeline.length;
  const st = useMemo(() => computeState(timeline, evIndex), [timeline, evIndex]);
  const full = evIndex >= timeline.length;

  const nodes = useMemo(
    () =>
      laidNodes.map((node) => {
        const called = full || st.called.has(node.id);
        const returned = full || st.returned.has(node.id);
        return {
          ...node,
          hidden: !called,
          data: {
            ...node.data,
            ret: returned ? node.data.ret : null,
            active: !full && st.active === node.id,
            onStack: !full && st.stack.includes(node.id),
            dimmed: !full && !st.stack.includes(node.id) && returned,
          },
        };
      }),
    [laidNodes, st, full],
  );
  const edges = useMemo(
    () => base.edges.map((e) => ({ ...e, hidden: !(full || st.called.has(e.target)) })),
    [base.edges, st, full],
  );

  return (
    <section className="tracer panel glass-panel">
      <h2>
        <GitBranch size={18} className="panel-icon" aria-hidden="true" />
        Recursion Tracer
      </h2>

      <div className="tracer-controls">
        <label htmlFor="example">Algorithm</label>
        <select id="example" value={example} onChange={(e) => setExample(e.target.value)}>
          {EXAMPLES.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
        <label htmlFor="n">n</label>
        <input
          id="n"
          type="number"
          min={0}
          max={20}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => traceMut.mutate({ example, n })}
          disabled={traceMut.isPending}
        >
          {traceMut.isPending ? (
            <>
              <Loader2 size={16} className="spin" /> Tracing…
            </>
          ) : (
            <>
              <PlayCircle size={16} /> Trace
            </>
          )}
        </button>
      </div>

      {traceMut.isError && (
        <p role="alert" className="auth-error">
          {traceMut.error.message}
        </p>
      )}
      {graph?.truncated && (
        <p role="status" className="warning-banner">
          <AlertTriangle size={15} className="inline-icon" aria-hidden="true" />
          Trace truncated — this input exceeds the safe display limit. Showing a
          partial call graph.
        </p>
      )}

      {graph && graph.nodes.length > 0 && (
        <>
          <div className="playback-bar">
            <button type="button" className="icon-button" onClick={playing ? stop : play}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? "Pause" : "Play call stack"}
            </button>
            <button
              type="button"
              className="icon-button ghost"
              onClick={() => {
                stop();
                setEvIndex(timeline.length);
              }}
            >
              <RotateCcw size={15} /> Show all
            </button>
            <span className="playback-count">
              step {Math.min(evIndex, timeline.length)} / {timeline.length}
            </span>
          </div>

          <div className="tracer-stage">
            <div className="flow-graph" style={{ width: "100%", height: 460 }} data-lenis-prevent>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                fitView
                minZoom={0.15}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
              >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2a2f3a" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>

            {/* Live call stack — pushes on call, pops on return. */}
            <aside className="call-stack" aria-label="Call stack">
              <div className="call-stack-title">
                <Layers3 size={15} /> Call stack
              </div>
              {full ? (
                <p className="call-stack-hint">Press play to watch the stack grow and unwind.</p>
              ) : st.stack.length === 0 ? (
                <p className="call-stack-hint">empty</p>
              ) : (
                <ul>
                  {[...st.stack].reverse().map((id, i) => (
                    <li key={id} className={i === 0 ? "frame-top" : ""}>
                      {nodeById.get(id)?.label ?? id}
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
