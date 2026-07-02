import { StrictMode, useRef } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { useMagnetic } from "./hooks/useMagnetic";
import { initSmoothScroll } from "./lib/smoothScroll";
import { App } from "./App";
import "lenis/dist/lenis.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/landing.css";

initSmoothScroll();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Single mount point that gives every button in the app the magnetic hover.
function MagneticRoot() {
  const rootRef = useRef<HTMLDivElement>(null);
  useMagnetic(rootRef);
  return (
    <div ref={rootRef}>
      <App />
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MagneticRoot />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
