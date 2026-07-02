// Auth context (US-006). Email/password + phone (OTP) via Firebase. In dev mode
// (no Firebase config) auth is disabled and the app is usable in demo mode.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth, authEnabled } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  authEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  /** Sends an SMS OTP. `containerId` is the id of an (invisible) reCAPTCHA host div. */
  startPhoneSignIn: (phone: string, containerId: string) => Promise<ConfirmationResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    if (!authEnabled || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      authEnabled,
      login: async (email, password) => {
        if (!auth) throw new Error("Auth not configured.");
        await signInWithEmailAndPassword(auth, email, password);
      },
      signup: async (email, password) => {
        if (!auth) throw new Error("Auth not configured.");
        await createUserWithEmailAndPassword(auth, email, password);
      },
      startPhoneSignIn: async (phone, containerId) => {
        if (!auth) throw new Error("Auth not configured.");
        // Firebase requires a fresh invisible reCAPTCHA verifier per attempt.
        const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
        return signInWithPhoneNumber(auth, phone, verifier);
      },
      logout: async () => {
        if (auth) await signOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
