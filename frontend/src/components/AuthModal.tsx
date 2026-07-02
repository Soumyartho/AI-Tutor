// AuthModal (US-006): professional auth surface with Email/password and Phone
// (SMS OTP) tabs. Rendered from the landing page. On success, calls onSuccess().
// In dev mode (Firebase not configured) it offers a "Continue in demo mode" path.
import { useEffect, useState, type FormEvent } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

type Method = "email" | "phone";
type EmailMode = "login" | "signup";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const { authEnabled, login, signup, startPhoneSignIn } = useAuth();
  const [method, setMethod] = useState<Method>("email");
  const [emailMode, setEmailMode] = useState<EmailMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
      setOtp("");
      setConfirmation(null);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (emailMode === "login") await login(email, password);
      else await signup(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await startPhoneSignIn(phone, "recaptcha-host");
      setConfirmation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    setError(null);
    setBusy(true);
    try {
      await confirmation.confirm(otp);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 className="modal-title">Welcome</h2>
        <p className="modal-subtitle">Sign in to save your progress and history.</p>

        {!authEnabled && (
          <div className="demo-banner">
            Firebase isn't configured, so real sign-in is disabled. You can explore
            the full app in demo mode.
            <button className="demo-enter" onClick={onSuccess}>
              Continue in demo mode →
            </button>
          </div>
        )}

        <div className="method-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={method === "email"}
            className={method === "email" ? "active" : ""}
            onClick={() => {
              setMethod("email");
              setError(null);
            }}
          >
            Email
          </button>
          <button
            role="tab"
            aria-selected={method === "phone"}
            className={method === "phone" ? "active" : ""}
            onClick={() => {
              setMethod("phone");
              setError(null);
            }}
          >
            Phone
          </button>
        </div>

        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}

        {method === "email" && (
          <form onSubmit={submitEmail} className="modal-form">
            <label htmlFor="m-email">Email</label>
            <input
              id="m-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!authEnabled}
            />
            <label htmlFor="m-password">Password</label>
            <input
              id="m-password"
              type="password"
              autoComplete={emailMode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={!authEnabled}
            />
            <button type="submit" disabled={busy || !authEnabled}>
              {busy ? "Please wait…" : emailMode === "login" ? "Log in" : "Create account"}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => setEmailMode(emailMode === "login" ? "signup" : "login")}
            >
              {emailMode === "login"
                ? "Need an account? Sign up"
                : "Already have an account? Log in"}
            </button>
          </form>
        )}

        {method === "phone" && (
          <form onSubmit={confirmation ? verifyOtp : sendOtp} className="modal-form">
            {!confirmation ? (
              <>
                <label htmlFor="m-phone">Phone number</label>
                <input
                  id="m-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={!authEnabled}
                />
                <p className="field-hint">Include country code, e.g. +91 or +1.</p>
                <button type="submit" disabled={busy || !authEnabled}>
                  {busy ? "Sending…" : "Send code"}
                </button>
              </>
            ) : (
              <>
                <label htmlFor="m-otp">Enter the 6-digit code</label>
                <input
                  id="m-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <button type="submit" disabled={busy}>
                  {busy ? "Verifying…" : "Verify & continue"}
                </button>
                <button type="button" className="link-button" onClick={() => setConfirmation(null)}>
                  Use a different number
                </button>
              </>
            )}
          </form>
        )}

        {/* Invisible reCAPTCHA host required by Firebase phone auth. */}
        <div id="recaptcha-host" />
      </div>
    </div>
  );
}
