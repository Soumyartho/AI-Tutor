// SuccessBanner — bouncy animated checkmark + glow + confetti celebration on a
// correct solve (per confirmed "funky/bubbly" direction — confetti is back).
import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Katex } from "./Katex";
import { celebrate } from "../lib/confetti";

export function SuccessBanner({ solutionLatex }: { solutionLatex: string }) {
  useEffect(() => {
    celebrate();
    // Fire once per new solution — solutionLatex changing signals a new solve.
  }, [solutionLatex]);

  return (
    <div className="solution-banner" role="status">
      <motion.span
        className="solution-check-glow"
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
      >
        <motion.span
          className="solution-check-ring"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut", repeat: 2, repeatDelay: 0.3 }}
        />
        <CheckCircle2 size={22} strokeWidth={2.5} />
      </motion.span>
      <span className="solution-label">Solution:</span>
      <Katex latex={solutionLatex} block />
    </div>
  );
}
