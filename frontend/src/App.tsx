// App shell: auth gate + tab navigation between the learning modes.
// Redesigned as a focused workspace: icon-led nav, ambient background,
// animated tab transitions (Framer Motion).
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, GitBranch, LineChart, LogOut, Sigma, Sparkles } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { AuthForm } from "./components/AuthForm";
import { SolveView } from "./views/SolveView";
import { RecursionTracerViewer } from "./components/RecursionTracerViewer";
import { DesmosGraph } from "./components/DesmosGraph";
import { MisconceptionsView } from "./views/MisconceptionsView";
import { LandingView } from "./views/LandingView";
import { ErrorBoundary } from "./components/ErrorBoundary";

type Tab = "solve" | "recursion" | "graph" | "misconceptions";

const TABS: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: "solve", label: "Algebra", icon: Calculator },
  { id: "recursion", label: "Recursion", icon: GitBranch },
  { id: "graph", label: "Graphing", icon: LineChart },
  { id: "misconceptions", label: "Misconceptions", icon: Sparkles },
];

export function App() {
  const { user, loading, authEnabled, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("solve");
  const [entered, setEntered] = useState(false);

  // Entering the app pushes a history entry so the browser Back button returns
  // to the landing page instead of leaving the site.
  const enterApp = useCallback(() => {
    window.history.pushState({ view: "app" }, "");
    setEntered(true);
  }, []);

  // Back/forward navigation: popping history returns to the landing page.
  useEffect(() => {
    const onPop = () => setEntered(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (loading) return <div className="centered">Loading…</div>;

  // Landing/CTA screen is the entry point.
  if (!entered) return <LandingView onEnter={enterApp} />;

  // After entering, gate on auth (skipped in dev mode when auth is disabled).
  if (authEnabled && !user) {
    return (
      <div className="centered">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Ambient workspace background — subtle, not distracting from the math. */}
      <div className="app-ambient" aria-hidden="true" />

      <header className="app-header glass-panel">
        <div className="brand">
          <span className="brand-mark">
            <Sigma size={18} strokeWidth={2.5} />
          </span>
          Explainable Symbolic-AI Tutor
        </div>

        <nav className="tabs" aria-label="Learning modes">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={16} strokeWidth={2.25} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {authEnabled && (
          <button
            className="link-button icon-button"
            onClick={() => {
              void logout();
              setEntered(false);
            }}
          >
            <LogOut size={16} strokeWidth={2.25} />
            Log out
          </button>
        )}
      </header>

      <main className="app-main">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === "solve" && <SolveView />}
              {tab === "recursion" && <RecursionTracerViewer />}
              {tab === "graph" && <DesmosGraph />}
              {tab === "misconceptions" && <MisconceptionsView />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
    </div>
  );
}
