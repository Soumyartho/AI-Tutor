// Confetti celebration helper (canvas-confetti, MIT/open source) — fires a
// tasteful burst in the app's candy palette on meaningful success moments.
import confetti from "canvas-confetti";

const PALETTE = ["#ff5a3c", "#ff6ec7", "#4fc3ff", "#35d68f", "#ffc84a"];

export function celebrate(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 38,
    origin: { y: 0.3 },
    colors: PALETTE,
    scalar: 0.9,
    ticks: 160,
  });
}
