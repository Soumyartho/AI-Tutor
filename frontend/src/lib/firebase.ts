// Firebase client init (US-006). When config is absent, auth is disabled and the
// app runs in dev mode (matching backend AUTH_REQUIRED=false).
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const authEnabled: boolean = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (authEnabled) {
  app = initializeApp(config);
  auth = getAuth(app);
}

export { app, auth };
