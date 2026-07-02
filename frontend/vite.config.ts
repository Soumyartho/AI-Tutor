import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /api to the FastAPI backend to avoid CORS in local dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Function form (not the object-shorthand form) so deep-subpath
        // imports — e.g. `elkjs/lib/elk.bundled.js` — are matched reliably by
        // checking the resolved module id, not just the bare package name.
        // elkjs alone is ~1MB (a compiled Java layout algorithm) so it gets
        // its own chunk, isolated from the rest of the graph vendor code.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("node_modules/elkjs")) return "vendor-elk";
          if (id.includes("node_modules/reactflow") || id.includes("node_modules/dagre"))
            return "vendor-graph";
          if (
            id.includes("node_modules/gsap") ||
            id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/lenis")
          )
            return "vendor-motion";
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase"))
            return "vendor-firebase";
          if (
            id.includes("node_modules/@tsparticles") ||
            id.includes("node_modules/canvas-confetti")
          )
            return "vendor-particles";
          if (id.includes("node_modules/katex")) return "vendor-katex";
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
