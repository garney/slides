import { useState } from "react";
import { useApp } from "../context/AppProvider.jsx";
import { signInWithPassword, signUpWithPassword } from "../api/auth.js";

export default function AuthScreen() {
  const { refreshAuth } = useApp();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      if (mode === "signup") {
        await signUpWithPassword(email.trim(), password);
        setStatus("Account created. Check your email if confirmation is required, then sign in.");
      } else {
        await signInWithPassword(email.trim(), password);
        await refreshAuth();
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Authentication failed");
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="panel auth-panel">
        <p className="muted">Slide CMS</p>
        <h1>slides</h1>
        <p className="muted">
          {mode === "signup"
            ? "Create an account to build and edit presentations."
            : "Sign in to create and edit presentations."}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit" className="primary" disabled={busy}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="muted">
          {mode === "signup" ? (
            <button type="button" className="link-button" onClick={() => setMode("signin")}>
              Already have an account? Sign in
            </button>
          ) : (
            <button type="button" className="link-button" onClick={() => setMode("signup")}>
              Need an account? Register
            </button>
          )}
        </p>
        {status ? <p className="error-banner">{status}</p> : null}
      </section>
    </main>
  );
}
