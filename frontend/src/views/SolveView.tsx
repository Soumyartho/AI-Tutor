// SolveView (US-001/002/003/007): the core "solve an equation" experience,
// wiring input -> symbolic solve -> AST tree + reasoning graph + per-step explain.
import { useMutation } from "@tanstack/react-query";
import { GitCommitHorizontal, MessagesSquare, Workflow } from "lucide-react";
import { EquationInput } from "../components/EquationInput";
import { ASTTreeViewer } from "../components/ASTTreeViewer";
import { ReasoningFlowGraph } from "../components/ReasoningFlowGraph";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { SuccessBanner } from "../components/SuccessBanner";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Reveal } from "../components/Reveal";
import { api, ApiRequestError } from "../lib/api";
import type { SolveResponse } from "../types/api";

export function SolveView() {
  const solveMut = useMutation<SolveResponse, ApiRequestError, string>({
    mutationFn: (expression) => api.solve(expression),
  });

  const result = solveMut.data;
  const errorMessage =
    solveMut.error instanceof ApiRequestError ? solveMut.error.message : null;

  return (
    <div className="solve-view">
      <EquationInput
        onSolve={(expr) => solveMut.mutate(expr)}
        disabled={solveMut.isPending}
        errorMessage={errorMessage}
      />

      {result && (
        <>
          {result.solution_latex && (
            <Reveal>
              <SuccessBanner solutionLatex={result.solution_latex} />
            </Reveal>
          )}

          <div className="panels">
            <Reveal className="panel glass-panel">
              <section>
                <h2>
                  <GitCommitHorizontal size={18} className="panel-icon" aria-hidden="true" />
                  Expression Tree
                </h2>
                <ErrorBoundary>
                  <ASTTreeViewer root={result.ast} />
                </ErrorBoundary>
              </section>
            </Reveal>

            <Reveal className="panel glass-panel" delay={0.1}>
              <section>
                <h2>
                  <Workflow size={18} className="panel-icon" aria-hidden="true" />
                  Reasoning Path
                </h2>
                <ErrorBoundary>
                  <ReasoningFlowGraph steps={result.steps} />
                </ErrorBoundary>
              </section>
            </Reveal>
          </div>

          <Reveal className="panel glass-panel">
            <section>
              <h2>
                <MessagesSquare size={18} className="panel-icon" aria-hidden="true" />
                Step-by-step Explanations
              </h2>
              {result.steps.map((step, i) => (
                <ExplanationPanel key={i} step={step} />
              ))}
            </section>
          </Reveal>
        </>
      )}
    </div>
  );
}
