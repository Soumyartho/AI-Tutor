// Desmos Graphing Calculator API loader (US-004 upgrade).
// Loads the official Desmos script once and resolves the global `Desmos` object.
// The API key is a client-side embed key (safe to ship); falls back to the
// project key if VITE_DESMOS_API_KEY isn't set.

// The Desmos global is untyped; we model just what we use.
export interface DesmosCalculator {
  setExpression: (opts: { id?: string; latex?: string; color?: string }) => void;
  setBlank: () => void;
  destroy: () => void;
  resize: () => void;
}

interface DesmosGlobal {
  GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalculator;
}

declare global {
  interface Window {
    Desmos?: DesmosGlobal;
  }
}

const DEFAULT_KEY = "b1d25d77db4f4165aa3cbfb8d7d1658b";
let loadPromise: Promise<DesmosGlobal> | null = null;

export function loadDesmos(): Promise<DesmosGlobal> {
  if (window.Desmos) return Promise.resolve(window.Desmos);
  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_DESMOS_API_KEY || DEFAULT_KEY;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${key}`;
    script.async = true;
    script.onload = () => {
      if (window.Desmos) resolve(window.Desmos);
      else reject(new Error("Desmos loaded but global missing"));
    };
    script.onerror = () => reject(new Error("Failed to load Desmos script"));
    document.head.appendChild(script);
  });
  return loadPromise;
}
