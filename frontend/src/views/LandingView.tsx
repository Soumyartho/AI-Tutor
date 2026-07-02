// LandingView — cinematic marketing landing page (@DESIGN + @FE).
// - Full-bleed hero-bg.mp4 background with overlay + auth entry
// - Scroll-scrubbed hero_scroll.mp4 section (blur → sharp on scroll)
// - USP / feature sections and a final CTA
// Auth (email + phone OTP) is surfaced via AuthModal; on success the app opens.
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Reveal } from "../components/Reveal";
import { ScrollScrubVideo } from "../components/ScrollScrubVideo";
import { AuthModal } from "../components/AuthModal";

function ArrowRight() {
  return (
    <svg
      className="cta-arrow"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

interface Feature {
  icon: string;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: "∑",
    title: "Infallible symbolic engine",
    body: "Every step is computed by a deterministic SymPy engine — never an LLM. No hallucinated algebra, ever.",
  },
  {
    icon: "🌳",
    title: "Visual reasoning trees",
    body: "See each equation as an interactive expression tree, so structure and order-of-operations become obvious.",
  },
  {
    icon: "🕸",
    title: "Reasoning-path graphs",
    body: "Watch a solution unfold as a node-by-node flow — including where a wrong turn would branch off.",
  },
  {
    icon: "💬",
    title: "Grounded explanations",
    body: "Plain-language help from AI that only narrates verified steps — accuracy of math, warmth of a tutor.",
  },
  {
    icon: "🔁",
    title: "Recursion, made visible",
    body: "Trace Fibonacci or factorial call-by-call and finally see the call stack you've only imagined.",
  },
  {
    icon: "📈",
    title: "Interactive Desmos graphing",
    body: "Explore functions on the real Desmos calculator, linking algebra to geometry in real time.",
  },
];

export function LandingView({ onEnter }: { onEnter: () => void }) {
  const { authEnabled, user } = useAuth();
  const [heroHover, setHeroHover] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // If auth is on and nobody's signed in, gate entry behind the modal.
  function handleStart() {
    if (authEnabled && !user) setAuthOpen(true);
    else onEnter();
  }

  return (
    <div className="landing-page">
      {/* ---------------- HERO ---------------- */}
      <section
        className="hero"
        onMouseEnter={() => setHeroHover(true)}
        onMouseLeave={() => setHeroHover(false)}
      >
        <video className="hero-bg-video" src="/hero-bg.mp4" autoPlay muted loop playsInline />
        <div className={`hero-scrim${heroHover ? " is-hover" : ""}`} aria-hidden="true" />

        <nav className="hero-nav">
          <div className="brand">
            <span className="brand-mark">∑</span> SymbolicTutor
          </div>
          <button className="nav-signin" onClick={() => setAuthOpen(true)}>
            Sign in
          </button>
        </nav>

        <div className="hero-content">
          <Reveal delay={0}>
            <div className="landing-badge">
              <span className="badge-dot" aria-hidden="true">
                <span className="badge-dot-ping" />
                <span className="badge-dot-core" />
              </span>
              Explainable Symbolic AI
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="hero-headline">
              See the reasoning, <br />
              <span className="headline-muted">not just the result.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="hero-description">
              A tutor that shows its work — deterministic symbolic reasoning,
              visualized as trees and graphs, with plain-language explanations
              grounded in verified math. No black boxes, no hallucinated steps.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="hero-actions">
              <button className="landing-cta" onClick={handleStart}>
                <span>Start Learning</span>
                <ArrowRight />
              </button>
              <a className="ghost-cta" href="#features">
                Explore features
              </a>
            </div>
          </Reveal>
        </div>

        <div className="scroll-hint" aria-hidden="true">
          <span>Scroll</span>
          <span className="scroll-hint-line" />
        </div>
      </section>

      {/* ---------------- SCROLL-SCRUB VIDEO ---------------- */}
      <ScrollScrubVideo />

      {/* ---------------- FEATURES / USP ---------------- */}
      <section id="features" className="features">
        <Reveal>
          <p className="section-eyebrow">Why it's different</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="section-title">
            Built to make understanding <span className="grad-text">unavoidable.</span>
          </h2>
        </Reveal>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08} className="feature-card glass-panel tilt">
              <div className="feature-icon" aria-hidden="true">
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- USP STRIP ---------------- */}
      <section className="usp-strip">
        <Reveal className="usp-item">
          <span className="usp-num">100%</span>
          <span className="usp-label">of steps mathematically verified</span>
        </Reveal>
        <Reveal className="usp-item" delay={0.08}>
          <span className="usp-num">0</span>
          <span className="usp-label">hallucinated algebra — by design</span>
        </Reveal>
        <Reveal className="usp-item" delay={0.16}>
          <span className="usp-num">4</span>
          <span className="usp-label">learning modes: algebra, recursion, graphing, insights</span>
        </Reveal>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="cta-final">
        <Reveal>
          <div className="cta-final-card glass-panel">
            <h2>Ready to understand the why?</h2>
            <p>Join and start solving with reasoning you can actually see.</p>
            <button className="landing-cta" onClick={handleStart}>
              <span>Get started free</span>
              <ArrowRight />
            </button>
          </div>
        </Reveal>
        <footer className="landing-footer">
          <span>© 2026 SymbolicTutor</span>
          <span>Explainable Hybrid Symbolic-AI ITS</span>
        </footer>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={onEnter} />
    </div>
  );
}
