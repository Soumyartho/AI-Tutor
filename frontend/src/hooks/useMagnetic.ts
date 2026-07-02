// useMagnetic — universal magnetic + elastic-bounce hover for buttons (GSAP).
// Recreates the sample's MagneticButton behavior, but applied GLOBALLY: one hook
// mounted on a container binds every current AND future <button> inside it (a
// MutationObserver catches buttons that appear on tab/view changes). This gives
// the "bounce hovering" effect on all buttons without touching each component.
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

// Buttons we must NOT hijack: 3rd-party control widgets whose own layout would
// break if we transformed them (React Flow zoom controls, Mafs interactions).
const EXCLUDE_SELECTOR = ".react-flow button, .mafs button";

export function useMagnetic(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bound = new WeakSet<HTMLElement>();
    const cleanups: Array<() => void> = [];

    const excluded = new Set<HTMLElement>();
    container.querySelectorAll<HTMLElement>(EXCLUDE_SELECTOR).forEach((el) => excluded.add(el));

    const bind = (el: HTMLElement) => {
      if (bound.has(el) || el.closest(".react-flow") || el.closest(".mafs")) return;
      bound.add(el);

      // quickTo = high-perf per-frame tweening for the follow motion.
      const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

      const enter = () => {
        gsap.to(el, { scale: 1.06, duration: 0.4, ease: "power2.out" });
      };
      const move = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const relX = e.clientX - r.left - r.width / 2;
        const relY = e.clientY - r.top - r.height / 2;
        // 0.4 strength pull toward the cursor.
        xTo(relX * 0.4);
        yTo(relY * 0.4);
      };
      const leave = () => {
        // Elastic spring back — the signature "bounce".
        gsap.to(el, { x: 0, y: 0, scale: 1, duration: 1.1, ease: "elastic.out(1, 0.3)" });
      };

      el.addEventListener("mouseenter", enter);
      el.addEventListener("mousemove", move);
      el.addEventListener("mouseleave", leave);
      cleanups.push(() => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: "transform" });
      });
    };

    const scan = () => {
      container.querySelectorAll<HTMLElement>("button").forEach(bind);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [containerRef]);
}
