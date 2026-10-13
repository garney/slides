import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppProvider.jsx";
import { fetchConfig, getPresentationBySlug } from "../api/client.js";
import AstroSpaceBackground from "../components/AstroSpaceBackground.jsx";
import RevealDeck from "../components/RevealDeck.jsx";
import { resolveBackgroundSettings } from "../lib/astroBackgroundSettings.js";

export default function PresentPage() {
  const { slug } = useParams();
  const { auth } = useApp();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [assetsBaseUrl, setAssetsBaseUrl] = useState("https://assets.astro.space");
  const [error, setError] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        if (cfg.astroAssetsBaseUrl) {
          setAssetsBaseUrl(cfg.astroAssetsBaseUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setError("");
    setNeedsAuth(false);
    getPresentationBySlug(slug)
      .then(setPresentation)
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load presentation";
        setError(message);
        setNeedsAuth(message.toLowerCase().includes("sign-in"));
      });
  }, [slug]);

  if (error) {
    return (
      <div className="present-shell" style={{ padding: "2rem" }}>
        <div className="error-banner">{error}</div>
        {needsAuth && auth.enabled ? (
          <div className="btn-row">
            <button type="button" className="primary" onClick={() => navigate("/")}>
              Sign in
            </button>
            <Link className="btn" to="/">
              CMS home
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  if (!presentation) {
    return <div className="present-shell" />;
  }

  const background = resolveBackgroundSettings(
    presentation.document,
    presentation.templateId,
    assetsBaseUrl
  );
  const hasSpaceBg = background.scene !== "none";

  return (
    <div className={`present-shell${hasSpaceBg ? " present-shell--space-bg" : ""}`}>
      <AstroSpaceBackground
        scene={background.scene}
        opacity={background.opacity}
        assetsBaseUrl={background.assetsBaseUrl}
      />
      <RevealDeck
        document={presentation.document}
        templateId={presentation.templateId}
        transparentBackground={hasSpaceBg}
      />
    </div>
  );
}
