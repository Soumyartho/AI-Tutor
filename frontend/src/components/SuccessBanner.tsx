// SuccessBanner — subtle animated checkmark + glow celebration on a correct
// solve (per confirmed direction: no confetti, tasteful and professional).
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Katex } from "./Katex";

export function SuccessBanner({ solutionLatex }: { solutionLatex: string }) {
  return (
    <div className="solution-banner" role="status">
      <motion.span
        className="solution-check-glow"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
      >
        <motion.span
          className="solution-check-ring"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut", repeat: 2, repeatDelay: 0.3 }}
        />
        <CheckCircle2 size={22} strokeWidth={2.25} />
      </motion.span>
      <span className="solution-label">Solution:</span>
      <Katex latex={solutionLatex} block />
    </div>
  );
}
