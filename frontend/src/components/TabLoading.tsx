// TabLoading — Suspense fallback shown while a lazy-loaded tab's code (and its
// heavy deps: React Flow, ELK, Desmos, etc.) downloads on first visit.
import { Loader2 } from "lucide-react";

export function TabLoading() {
  return (
    <div className="tab-loading" role="status" aria-live="polite">
      <Loader2 size={28} className="spin" />
      <span>Loading…</span>
    </div>
  );
}
