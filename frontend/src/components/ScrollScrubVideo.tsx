// ScrollScrubVideo — pinned "focus pull" section (hero_scroll.mp4).
// The video PLAYS normally (looping) — we do NOT seek currentTime on scroll,
// which is what made it laggy. Instead, as the pinned section scrolls, GSAP
// tweens only cheap, GPU-composited properties (blur filter + scale on the
// video, opacity of a veil) with scrub-smoothing, so the footage "comes into
// focus" and the lower veil lifts smoothly.
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ScrollScrubVideo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    const veil = veilRef.current;
    if (!section || !video || !veil) return;

    // Keep the footage playing smoothly regardless of scroll.
    const tryPlay = () => video.play().catch(() => {});
    tryPlay();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(video, { filter: "blur(0px)", scale: 1 });
      gsap.set(veil, { opacity: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 1, // numeric scrub = smoothing/lerp toward scroll position
          anticipatePin: 1,
        },
      });

      // Focus pull: blurred + slightly zoomed → sharp + settled.
      tl.fromTo(
        video,
        { filter: "blur(14px)", scale: 1.12 },
        { filter: "blur(0px)", scale: 1, ease: "none" },
        0,
      );
      // Lower veil lifts (opacity only — cheap).
      tl.fromTo(veil, { opacity: 1 }, { opacity: 0, ease: "none" }, 0);
      // Caption drifts in early.
      if (captionRef.current) {
        tl.fromTo(
          captionRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, ease: "power2.out", duration: 0.5 },
          0,
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="scrub-section">
      <video
        ref={videoRef}
        className="scrub-video"
        src="/hero_scroll.mp4"
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
      />
      <div ref={veilRef} className="scrub-veil" aria-hidden="true" />
      <div ref={captionRef} className="scrub-caption">
        <h2>Watch reasoning come into focus.</h2>
        <p>Every step is computed, verified, and revealed — never guessed.</p>
      </div>
    </section>
  );
}
