// ExplanationPanel (US-007): on demand, fetches a Groq-narrated explanation for a
// single step. Handles all states incl. `degraded` (Groq unavailable) per R-03 —
// the symbolic step is always shown regardless.
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Info, Loader2, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { Katex } from "./Katex";
import type { ExplainResponse, Step } from "../types/api";

export function ExplanationPanel({ step }: { step: Step }) {
  const explainMut = useMutation<ExplainResponse, Error, Step>({
    mutationFn: (s) => api.explain(s),
  });

  const resp = explainMut.data;

  return (
    <div className="explanation-panel" aria-live="polite">
      <div className="explanation-step">
        <Katex latex={step.previous_state} />
        <span className="op-arrow"> →[{step.operation_label}]→ </span>
        <Katex latex={step.new_state} />
      </div>

      {!resp && (
        <button
          type="button"
          className="icon-button"
          onClick={() => explainMut.mutate(step)}
          disabled={explainMut.isPending}
        >
          {explainMut.isPending ? (
            <>
              <Loader2 size={15} className="spin" /> Thinking…
            </>
          ) : (
            <>
              <Sparkles size={15} /> Explain this step
            </>
          )}
        </button>
      )}

      {resp?.degraded && (
        <p className="muted-note">
          <Info size={14} className="inline-icon" aria-hidden="true" /> AI explanation is
          currently unavailable — the verified step above still stands on its own.
        </p>
      )}

      {resp?.explanation && (
        <div className="explanation-body">
          <h4>{resp.explanation.title}</h4>
          <p>{resp.explanation.conceptual_reasoning}</p>
          <p className="pitfall">
            <AlertTriangle size={14} className="inline-icon" aria-hidden="true" />
            <strong>Watch out:</strong> {resp.explanation.common_pitfall_warning}
          </p>
        </div>
      )}
    </div>
  );
}
