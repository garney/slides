import { useEffect, useRef } from "react";
import Reveal from "reveal.js";
import { marked } from "marked";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/white.css";
import "reveal.js/dist/theme/black.css";
import "reveal.js/dist/theme/night.css";
import "reveal.js/dist/theme/simple.css";
import "../themes/astro.css";

marked.setOptions({ gfm: true, breaks: false });

const THEME_CLASS = {
  default: "white",
  dark: "black",
  night: "night",
  astro: "black",
  minimal: "simple",
};

/**
 * @param {{ document: { slides?: Array<{ id: string; markdown?: string; notes?: string; background?: string }>; meta?: Record<string, unknown> }; templateId: string; transparentBackground?: boolean }} props
 */
export default function RevealDeck({ document, templateId, transparentBackground = false }) {
  const hostRef = useRef(null);
  const revealRef = useRef(null);
  const slides = document?.slides || [];

  useEffect(() => {
    const host = hostRef.current;
    if (!host || slides.length === 0) {
      return undefined;
    }

    host.className = "reveal";
    const themeName = THEME_CLASS[templateId] || "white";
    host.dataset.theme = templateId === "astro" ? "astro" : themeName;
    host.classList.add(`theme-${themeName}`);
    if (templateId === "astro") {
      host.classList.add("theme-astro");
    }
    if (transparentBackground) {
      host.classList.add("theme-astro-transparent");
    }

    const deck = new Reveal(host, {
      hash: true,
      slideNumber: "c/t",
      transition: templateId === "night" ? "fade" : "slide",
      width: 1280,
      height: 720,
      margin: 0.08,
      minScale: 0.2,
      maxScale: 1.0,
    });

    revealRef.current = deck;
    deck.initialize().catch(console.error);

    return () => {
      if (revealRef.current?.destroy) {
        revealRef.current.destroy();
      }
      revealRef.current = null;
    };
  }, [document, templateId, slides.length, transparentBackground]);

  return (
    <div className={`reveal-viewport${transparentBackground ? " reveal-viewport--space-bg" : ""}`}>
      <div className="reveal" ref={hostRef}>
        <div className="slides">
          {slides.map((slide) => (
            <section
              key={slide.id}
              data-background={slide.background || undefined}
            >
              <div
                className="slide-markdown"
                dangerouslySetInnerHTML={{
                  __html: renderSlideHtml(slide.markdown),
                }}
              />
              {slide.notes ? (
                <aside
                  className="notes"
                  dangerouslySetInnerHTML={{
                    __html: renderSlideHtml(slide.notes),
                  }}
                />
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {string | undefined} markdown
 */
function renderSlideHtml(markdown) {
  return marked.parse(markdown || "", { async: false });
}

/**
 * Render markdown to HTML for editor preview panes.
 * @param {string} markdown
 */
export function renderMarkdownPreview(markdown) {
  return renderSlideHtml(markdown);
}
