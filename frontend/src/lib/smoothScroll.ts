// Global smooth inertial scrolling (Lenis) synced with GSAP ScrollTrigger.
// This is what makes the whole page — and especially the pinned scroll-scrub
// section — feel buttery instead of stepping frame-to-frame with the raw wheel.
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function initSmoothScroll(): Lenis | null {
  if (lenis) return lenis;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  // Drive Lenis from GSAP's ticker and keep ScrollTrigger in sync.
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
