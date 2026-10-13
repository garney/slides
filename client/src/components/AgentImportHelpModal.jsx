import { useEffect, useId, useRef } from "react";

const AGENT_PROMPT = `Create a my-slides presentation JSON (version 1) about [YOUR TOPIC].

Output rules:
- Return a single JSON object only (no markdown fences, no commentary).
- Required: "version": 1, "title", "slides" (array).
- Each slide must have "markdown" (string). Optional: "id", "layout", "notes", "background".
- Optional deck fields: "slug" (kebab-case), "templateId" (default|dark|night|astro|minimal), "visibility" (public|authenticated), "meta" (object), "backgroundScene", "backgroundOpacity".

Slide layouts: title | section | content | two-column
Use section slides between major parts. One main idea per content slide.
Markdown supports headings, lists, code fences, tables, and ![images](url).

Match the structure in docs/examples/reference-presentation.json in the my-slides repo.`;

const MINIMAL_EXAMPLE = `{
  "version": 1,
  "title": "My talk title",
  "slug": "my-talk-2026",
  "templateId": "astro",
  "visibility": "public",
  "slides": [
    {
      "id": "title-1",
      "layout": "title",
      "markdown": "# My talk title\\n\\nSubtitle or event"
    },
    {
      "id": "section-1",
      "layout": "section",
      "markdown": "## First section"
    },
    {
      "id": "content-1",
      "layout": "content",
      "markdown": "## Key point\\n\\n- First bullet\\n- Second bullet"
    }
  ]
}`;

/**
 * @param {{ open: boolean; onClose: () => void }} props
 */
export default function AgentImportHelpModal({ open, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-test-id="agent-import-help-modal"
      >
        <header className="modal-header">
          <h2 id={titleId}>Agent import guide</h2>
          <button
            type="button"
            className="btn icon-btn"
            onClick={onClose}
            aria-label="Close"
            data-test-id="agent-import-help-close"
          >
            ×
          </button>
        </header>

        <p className="muted">
          Use this when asking Cursor, ChatGPT, or another agent to generate a deck you can{" "}
          <strong>Import JSON</strong> into my-slides.
        </p>

        <h3>Suggested agent prompt</h3>
        <pre className="code-block" data-test-id="agent-import-help-prompt">
          {AGENT_PROMPT}
        </pre>
        <button
          type="button"
          className="btn"
          data-test-id="agent-import-help-copy-prompt"
          onClick={() => void navigator.clipboard.writeText(AGENT_PROMPT)}
        >
          Copy prompt
        </button>

        <h3>Minimal JSON shape</h3>
        <pre className="code-block code-block-sm" data-test-id="agent-import-help-example-json">
          {MINIMAL_EXAMPLE}
        </pre>
        <button
          type="button"
          className="btn"
          data-test-id="agent-import-help-copy-json"
          onClick={() => void navigator.clipboard.writeText(MINIMAL_EXAMPLE)}
        >
          Copy example JSON
        </button>

        <ul className="modal-list muted">
          <li>
            Full reference: <code>docs/examples/reference-presentation.json</code> in the repo
          </li>
          <li>
            Schema: <code>docs/presentation-schema.json</code>
          </li>
          <li>
            Replace existing deck: editor → <strong>Replace this presentation</strong>, or{" "}
            <code>importMode: &quot;replace&quot;</code> with <code>targetSlug</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
