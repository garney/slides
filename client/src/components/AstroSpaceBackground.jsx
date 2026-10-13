import { useEffect, useRef } from "react";

/** @type {Promise<void> | null} */
let scriptLoadPromise = null;

/**
 * @param {string} assetsBaseUrl
 */
function loadBackgroundScripts(assetsBaseUrl) {
  if (typeof customElements !== "undefined" && customElements.get("full-screen-background")) {
    return Promise.resolve();
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  const base = assetsBaseUrl.replace(/\/$/, "");

  scriptLoadPromise = new Promise((resolve, reject) => {
    const loadScene = () => {
      if (document.getElementById("my-slides-fsbg-script")) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = "my-slides-fsbg-script";
      script.src = `${base}/scenes/full-screen-background.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Astro background scene"));
      document.head.appendChild(script);
    };

    if (window.PIXI) {
      loadScene();
      return;
    }

    const existingPixi = document.getElementById("my-slides-pixi-script");
    if (existingPixi) {
      existingPixi.addEventListener("load", loadScene, { once: true });
      return;
    }

    const pixi = document.createElement("script");
    pixi.id = "my-slides-pixi-script";
    pixi.src = `${base}/scenes/pixi.js`;
    pixi.onload = loadScene;
    pixi.onerror = () => reject(new Error("Failed to load PIXI for Astro background"));
    document.head.appendChild(pixi);
  });

  return scriptLoadPromise;
}

/**
 * Same web component as astro-account FullScreenBackground.astro (PIXI + full-screen-background.js).
 *
 * @param {{ scene: 'none' | 'minimal' | 'full'; opacity: number; assetsBaseUrl: string }} props
 */
export default function AstroSpaceBackground({ scene, opacity, assetsBaseUrl }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || scene === "none") {
      return undefined;
    }

    let cancelled = false;
    let element = null;

    void loadBackgroundScripts(assetsBaseUrl)
      .then(() => {
        if (cancelled) {
          return;
        }
        element = document.createElement("full-screen-background");
        element.setAttribute(
          "style",
          [
            "display:block",
            "position:fixed",
            "inset:0",
            "width:100%",
            "height:100%",
            "z-index:0",
            "pointer-events:none",
            `opacity:${opacity}`,
          ].join(";")
        );
        if (scene === "minimal") {
          element.setAttribute("minimal-mode", "");
        }
        host.appendChild(element);
      })
      .catch((err) => {
        console.warn(err);
      });

    return () => {
      cancelled = true;
      element?.remove();
    };
  }, [scene, opacity, assetsBaseUrl]);

  if (scene === "none") {
    return null;
  }

  return <div ref={hostRef} className="astro-space-background-host" aria-hidden="true" />;
}
