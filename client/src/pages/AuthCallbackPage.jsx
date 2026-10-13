import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleAuthCallback } from "../api/auth.js";
import { useApp } from "../context/AppProvider.jsx";

export default function AuthCallbackPage() {
  const { refreshAuth } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;

    void handleAuthCallback()
      .then(() => refreshAuth())
      .then(() => {
        navigate("/", { replace: true });
      })
      .catch((err) => {
        handledRef.current = false;
        setError(err instanceof Error ? err.message : "Unknown error");
      });
  }, [navigate, refreshAuth]);

  if (error) {
    return (
      <main className="auth-screen">
        <section className="panel auth-panel">
          <h1>Sign-in failed</h1>
          <div className="error-banner">{error}</div>
          <p>
            <a href="/">Return to app</a>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section className="panel auth-panel">
        <h1>Signing in…</h1>
        <p className="muted">Completing sign-in.</p>
      </section>
    </main>
  );
}
