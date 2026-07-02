// DesmosGraph (US-004): embeds the full Desmos calculator in DARK mode so it
// matches the app, framed cleanly, with quick-explore presets that inject
// common function families for instant experimentation.
import { useEffect, useRef, useState } from "react";
import { LineChart, Loader2 } from "lucide-react";
import { loadDesmos, type DesmosCalculator } from "../lib/desmos";

interface DesmosGraphProps {
  height?: number;
}

const PRESETS: { label: string; exprs: string[] }[] = [
  { label: "Line  y = mx + b", exprs: ["y=m x+b", "m=1", "b=0"] },
  { label: "Parabola  y = ax²", exprs: ["y=a x^2", "a=1"] },
  { label: "Sine wave", exprs: ["y=A\\sin(x)", "A=2"] },
  { label: "Circle", exprs: ["x^2+y^2=r^2", "r=5"] },
];

export function DesmosGraph({ height = 540 }: DesmosGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalculator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  const applyPreset = (idx: number) => {
    const calc = calcRef.current;
    if (!calc) return;
    calc.setBlank();
    PRESETS[idx].exprs.forEach((latex, i) => calc.setExpression({ id: `p-${i}`, latex }));
    setActive(idx);
  };

  useEffect(() => {
    let destroyed = false;
    loadDesmos()
      .then((Desmos) => {
        if (destroyed || !containerRef.current) return;
        const calc = Desmos.GraphingCalculator(containerRef.current, {
          expressions: true,
          settingsMenu: false,
          border: false,
          lockViewport: false,
          invertedColors: true, // dark mode to match the app
        });
        PRESETS[0].exprs.forEach((latex, i) => calc.setExpression({ id: `p-${i}`, latex }));
        calcRef.current = calc;
        setLoading(false);
      })
      .catch(() => {
        if (!destroyed) {
          setError("Could not load the Desmos calculator. Check your connection.");
          setLoading(false);
        }
      });
    return () => {
      destroyed = true;
      calcRef.current?.destroy();
      calcRef.current = null;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="auth-error">
        {error}
      </p>
    );
  }

  return (
    <section className="panel glass-panel">
      <h2>
        <LineChart size={18} className="panel-icon" aria-hidden="true" />
        Interactive Graphing
      </h2>

      <div className="desmos-presets">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`preset-chip${i === active ? " active" : ""}`}
            onClick={() => applyPreset(i)}
            disabled={loading}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* data-lenis-prevent: let Desmos handle its own wheel/scroll, not Lenis. */}
      <div className="desmos-wrap" data-lenis-prevent>
        {loading && (
          <div className="desmos-loading">
            <Loader2 size={18} className="spin" /> Loading interactive calculator…
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height }} aria-label="Desmos graphing calculator" />
      </div>
    </section>
  );
}
