// MisconceptionsView (US-009): cluster student error submissions into recurring
// misconceptions, and test live-matching a new error to a cluster.
// Educator/researcher-facing; describes concepts, never individual students.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Brain, Layers, Loader2, Search, Sparkles, Target } from "lucide-react";
import { api } from "../lib/api";
import type { ClusterRunResponse, MatchResponse } from "../types/api";

const SAMPLE = `-(x+3) = -x + 3
forgot to flip the sign: -(2x-5) = -2x - 5
negative only on first term -(a+b) = -a + b
added denominators 1/2 + 1/3 = 2/5
1/4 + 1/4 = 2/8
combined fractions wrong 1/3 + 1/6 = 2/9`;

export function MisconceptionsView() {
  const [raw, setRaw] = useState(SAMPLE);
  const [k, setK] = useState<number | "">("");
  const [probe, setProbe] = useState("");

  const runMut = useMutation<ClusterRunResponse, Error, void>({
    mutationFn: () => {
      const texts = raw
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
      return api.runClustering(texts, k === "" ? undefined : Number(k));
    },
  });

  const matchMut = useMutation<MatchResponse, Error, string>({
    mutationFn: (text) => api.matchError(text),
  });

  const result = runMut.data;

  return (
    <div className="misconceptions panel glass-panel">
      <h2>
        <Brain size={18} className="panel-icon" aria-hidden="true" />
        Misconception Clustering
      </h2>
      <p className="muted-note">
        Cluster flawed student submissions to surface recurring misconceptions.
        Groups describe concepts, not students.
      </p>

      <label htmlFor="errors">Error submissions (one per line)</label>
      <textarea
        id="errors"
        rows={8}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="errors-textarea"
      />

      <div className="tracer-controls">
        <label htmlFor="k">Clusters (k)</label>
        <input
          id="k"
          type="number"
          min={2}
          max={20}
          value={k}
          placeholder="auto"
          onChange={(e) => setK(e.target.value === "" ? "" : Number(e.target.value))}
        />
        <button type="button" className="icon-button" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
          {runMut.isPending ? (
            <>
              <Loader2 size={16} className="spin" /> Clustering…
            </>
          ) : (
            <>
              <Layers size={16} /> Run clustering
            </>
          )}
        </button>
      </div>

      {runMut.isError && (
        <p role="alert" className="auth-error">
          {runMut.error.message}
        </p>
      )}

      {result && (
        <>
          <p className="muted-note">
            Embedder: <strong>{result.embedder}</strong>
            {result.embedder === "fallback" &&
              " (install sentence-transformers for semantic quality)"}
          </p>
          <div className="cluster-grid">
            {result.clusters.map((c) => (
              <div key={c.id} className="panel glass-panel cluster-card">
                <h3>{c.label}</h3>
                <span className="cluster-size">{c.size} submissions</span>
                <ul>
                  {c.sample_texts.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <section className="panel glass-panel">
            <h3>
              <Target size={16} className="panel-icon" aria-hidden="true" />
              Live intervention match
            </h3>
            <p className="muted-note">
              Test how a new incoming error maps to an existing misconception.
            </p>
            <div className="equation-input-row">
              <Search className="equation-input-icon" size={16} aria-hidden="true" />
              <input
                type="text"
                value={probe}
                placeholder="e.g. -(x+1) = -x + 1"
                onChange={(e) => setProbe(e.target.value)}
                style={{ paddingLeft: "calc(var(--space-3) * 2 + 16px)" }}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => matchMut.mutate(probe)}
                disabled={matchMut.isPending || !probe.trim()}
              >
                <Sparkles size={15} /> Match
              </button>
            </div>
            {matchMut.data && (
              <p role="status">
                {matchMut.data.matched
                  ? `Matched → "${matchMut.data.label}" (distance ${matchMut.data.distance?.toFixed(3)})`
                  : `No confident match${
                      matchMut.data.distance !== null
                        ? ` (nearest distance ${matchMut.data.distance.toFixed(3)})`
                        : ""
                    }`}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
