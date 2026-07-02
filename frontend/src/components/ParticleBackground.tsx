// ParticleBackground — interactive, cursor-reactive candy-colored bubbles behind
// the app shell (all 4 tabs share it, per the "funky/graphical/interactive
// background" direction). Uses tsParticles' slim bundle (open source, MIT).
// Bubbles gently float; hovering repels them and clicking pops in a few more.
import { useMemo } from "react";
import { Particles, ParticlesProvider, useParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

function ParticleLayer() {
  const { loaded } = useParticlesProvider();

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: "transparent" },
      fpsLimit: 60,
      particles: {
        number: { value: 26, density: { enable: true, width: 1200, height: 800 } },
        color: { value: ["#ff5a3c", "#ff6ec7", "#4fc3ff", "#35d68f", "#ffc84a"] },
        shape: { type: "circle" },
        opacity: { value: 0.22 },
        size: { value: { min: 40, max: 130 } },
        move: {
          enable: true,
          speed: 0.6,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "bounce" },
        },
        links: { enable: false },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "repulse" },
          onClick: { enable: true, mode: "push" },
          resize: { enable: true },
        },
        modes: {
          repulse: { distance: 120, duration: 0.4 },
          push: { quantity: 2 },
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (!loaded) return null;

  return <Particles id="app-particles" className="particle-bg" options={options} />;
}

export function ParticleBackground() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  return (
    <ParticlesProvider init={async (engine) => { await loadSlim(engine); }}>
      <ParticleLayer />
    </ParticlesProvider>
  );
}
