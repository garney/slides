import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { fetchConfig } from "../api/client.js";
import { useApp } from "../context/AppProvider.jsx";
import AgentImportHelpModal from "./AgentImportHelpModal.jsx";
import { DEFAULT_HELP_PRESENTATION_URL, resolveHelpPresentationUrl } from "../lib/helpConfig.js";

export default function Layout() {
  const { auth, signOut } = useApp();
  const [agentHelpOpen, setAgentHelpOpen] = useState(false);
  const [helpPresentationUrl, setHelpPresentationUrl] = useState(DEFAULT_HELP_PRESENTATION_URL);

  useEffect(() => {
    fetchConfig()
      .then((cfg) => setHelpPresentationUrl(resolveHelpPresentationUrl(cfg.helpPresentationUrl)))
      .catch(() => {
        setHelpPresentationUrl(DEFAULT_HELP_PRESENTATION_URL);
      });
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" data-test-id="header-logo">
          my-slides
        </Link>
        <nav className="header-nav">
          <a
            href={helpPresentationUrl}
            target="_blank"
            rel="noreferrer"
            className="header-help-link"
            title="How to create presentations"
            data-test-id="header-help-link"
          >
            <span className="header-help-icon" aria-hidden="true">
              ?
            </span>
            <span className="header-help-label">Help</span>
          </a>
          <button
            type="button"
            className="btn header-agent-guide-btn"
            title="How to prompt an AI agent for import JSON"
            data-test-id="header-agent-guide-button"
            onClick={() => setAgentHelpOpen(true)}
          >
            Agent guide
          </button>
          <Link to="/public" data-test-id="header-public-decks-link">
            Public decks
          </Link>
          {auth.isAdmin ? (
            <Link to="/admin/public" data-test-id="header-admin-public-link">
              Admin
            </Link>
          ) : null}
          <Link to="/edit" data-test-id="header-new-presentation-link">
            New presentation
          </Link>
          {auth.enabled && auth.email ? (
            <span className="muted header-user">Signed in as {auth.email}</span>
          ) : null}
          {auth.enabled ? (
            <button type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          ) : null}
        </nav>
      </header>
      <AgentImportHelpModal open={agentHelpOpen} onClose={() => setAgentHelpOpen(false)} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
