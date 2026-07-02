// ReasoningFlowGraph (US-003): solving steps as a node-based flow with
// glassmorphic KaTeX nodes, pill-labeled edges, and ▶ step-by-step playback
// (each state reveals in order; the active node glows). A visually-hidden
// ordered list mirrors the path for screen readers.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Pause, Play, RotateCcw } from "lucide-react";
import { elkLayout } from "../lib/elk";
import { NODE_TYPES, type MathNodeData } from "./flowNodes";
import type { Step } from "../types/api";

const STEP_MS = 950;

export function ReasoningFlowGraph({ steps }: { steps: Step[] }) {
  const base = useMemo(() => {
    if (steps.length === 0) return { nodes: [] as Node<MathNodeData>[], edges: [] as Edge[] };
    const nodes: Node<MathNodeData>[] = [];
    const edges: Edge[] = [];

    nodes.push({
      id: "s0",
      type: "math",
      position: { x: 0, y: 0 },
      width: 200,
      height: 64,
      data: { latex: steps[0].previous_state, kind: "state", badge: "start" },
    });
    steps.forEach((step, i) => {
      const id = `s${i + 1}`;
      const isLast = i === steps.length - 1;
      nodes.push({
        id,
        type: "math",
        position: { x: 0, y: 0 },
        width: 200,
        height: 64,
        data: { latex: step.new_state, kind: isLast ? "result" : "state", badge: `${i + 1}` },
      });
      edges.push({
        id: `e${i}`,
        source: `s${i}`,
        target: id,
        type: "smoothstep",
        className: "flow-edge",
        label: step.operation_label,
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#5b8def" },
      });
    });
    return { nodes, edges };
  }, [steps]);

  const total = base.nodes.length;
  const [laidNodes, setLaidNodes] = useState<Node<MathNodeData>[]>([]);
  const [revealed, setRevealed] = useState(total);
  const [isPlaying, setIsPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    elkLayout(base.nodes, base.edges, {
      direction: "DOWN",
      nodeWidth: 200,
      nodeHeight: 64,
      nodeSpacing: 44,
      layerSpacing: 70,
    }).then((laid) => {
      if (!cancelled) {
        setLaidNodes(laid);
        setRevealed(laid.length);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [base]);

  const stop = useCallback(() => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    setRevealed(1);
    setIsPlaying(true);
    timer.current = window.setInterval(() => {
      setRevealed((r) => {
        if (r >= total) {
          stop();
          return total;
        }
        return r + 1;
      });
    }, STEP_MS);
  }, [stop, total]);

  useEffect(() => stop, [stop]);

  const playing = isPlaying;

  const nodes = useMemo(
    () =>
      laidNodes.map((n, i) => ({
        ...n,
        hidden: i >= revealed,
        data: { ...n.data, active: i === revealed - 1 && revealed < total },
      })),
    [laidNodes, revealed, total],
  );
  const edges = useMemo(
    () => base.edges.map((e, i) => ({ ...e, hidden: i + 1 >= revealed })),
    [base.edges, revealed],
  );

  if (steps.length === 0) {
    return <p className="empty-state">No steps to display yet.</p>;
  }

  return (
    <div className="reasoning-wrap">
      <div className="playback-bar">
        <button type="button" className="icon-button" onClick={playing ? stop : play}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? "Pause" : "Play steps"}
        </button>
        <button
          type="button"
          className="icon-button ghost"
          onClick={() => {
            stop();
            setRevealed(total);
          }}
        >
          <RotateCcw size={15} /> Show all
        </button>
        <span className="playback-count">
          {Math.min(revealed, total)} / {total}
        </span>
      </div>

      <ol className="visually-hidden">
        {steps.map((s, i) => (
          <li key={i}>
            {s.operation_label}: {s.previous_state} becomes {s.new_state}
          </li>
        ))}
      </ol>

      <div className="flow-graph" style={{ width: "100%", height: 440 }} data-lenis-prevent>
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
    </div>
  );
}
