import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createPresentation,
  exportPresentation,
  fetchTemplates,
  fetchConfig,
  getPresentation,
  importPresentation,
  updatePresentation,
  uploadAsset,
  replacePresentationFromJson,
} from "../api/client.js";
import { renderMarkdownPreview } from "../components/RevealDeck.jsx";

const EMPTY_DOC = {
  version: 1,
  title: "Untitled presentation",
  slug: "",
  templateId: "default",
  visibility: "public",
  meta: {},
  slides: [
    {
      id: "slide-1",
      layout: "title",
      markdown: "# Title slide\n\nSubtitle or speaker name",
      notes: "",
    },
  ],
};

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [doc, setDoc] = useState(EMPTY_DOC);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [savedId, setSavedId] = useState(id || "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [importText, setImportText] = useState("");
  const [defaultAssetsBaseUrl, setDefaultAssetsBaseUrl] = useState("https://assets.astro.space");

  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        if (cfg.astroAssetsBaseUrl) {
          setDefaultAssetsBaseUrl(cfg.astroAssetsBaseUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTemplates()
      .then((data) => setTemplates(data.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    if (!id) {
      setDoc(EMPTY_DOC);
      setSavedId("");
      return;
    }
    setError("");
    getPresentation(id)
      .then((row) => {
        setSavedId(row.id);
        setDoc({
          version: 1,
          title: row.title,
          slug: row.slug,
          templateId: row.templateId,
          visibility: row.visibility,
          meta: row.document?.meta || {},
          slides: row.document?.slides || [],
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [id]);

  const activeSlide = doc.slides[activeSlideIndex] || doc.slides[0];

  function updateMeta(patch) {
    setDoc((prev) => ({
      ...prev,
      meta: { ...(prev.meta || {}), ...patch },
    }));
  }

  const backgroundScene =
    doc.meta?.backgroundScene || (doc.templateId === "astro" ? "minimal" : "none");
  const backgroundOpacity = Number(doc.meta?.backgroundOpacity ?? 0.5);

  function updateDoc(patch) {
    setDoc((prev) => ({ ...prev, ...patch }));
  }

  function updateSlide(index, patch) {
    setDoc((prev) => {
      const slides = prev.slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, slides };
    });
  }

  function addSlide() {
    setDoc((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        {
          id: `slide-${prev.slides.length + 1}`,
          layout: "content",
          markdown: "## New slide\n\nContent here",
          notes: "",
        },
      ],
    }));
    setActiveSlideIndex(doc.slides.length);
  }

  function moveSlide(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= doc.slides.length) {
      return;
    }
    setDoc((prev) => {
      const slides = [...prev.slides];
      const [item] = slides.splice(index, 1);
      slides.splice(target, 0, item);
      return { ...prev, slides };
    });
    setActiveSlideIndex(target);
  }

  function removeSlide(index) {
    if (doc.slides.length <= 1) {
      return;
    }
    setDoc((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
    }));
    setActiveSlideIndex(Math.max(0, index - 1));
  }

  async function onSave() {
    setError("");
    setStatus("Saving…");
    try {
      const payload = { ...doc };
      const row = savedId
        ? await updatePresentation(savedId, payload)
        : await createPresentation(payload);
      setSavedId(row.id);
      setDoc({
        version: 1,
        title: row.title,
        slug: row.slug,
        templateId: row.templateId,
        visibility: row.visibility,
        meta: row.document?.meta || {},
        slides: row.document?.slides || [],
      });
      setStatus("Saved");
      if (!id) {
        navigate(`/edit/${row.id}`, { replace: true });
      }
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function onExport() {
    if (!savedId) {
      setError("Save the presentation before exporting");
      return;
    }
    try {
      const payload = await exportPresentation(savedId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${doc.slug || "presentation"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  async function onImport(asNew = true) {
    setError("");
    try {
      const parsed = JSON.parse(importText);
      if (!asNew && savedId) {
        const row = await replacePresentationFromJson(savedId, parsed);
        setDoc({
          version: 1,
          title: row.title,
          slug: row.slug,
          templateId: row.templateId,
          visibility: row.visibility,
          meta: row.document?.meta || {},
          slides: row.document?.slides || [],
        });
        setImportText("");
        setStatus("Presentation replaced from JSON");
        return;
      }
      const row = await importPresentation(parsed);
      navigate(`/edit/${row.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed - check JSON");
    }
  }

  async function onImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !activeSlide) {
      return;
    }
    setError("");
    setStatus("Uploading image…");
    try {
      const { url } = await uploadAsset(file);
      const alt = file.name.replace(/\.[^.]+$/, "") || "image";
      updateSlide(activeSlideIndex, {
        markdown: `${activeSlide.markdown}\n\n![${alt}](${url})\n`,
      });
      setStatus("Image added to slide markdown");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="btn-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ marginBottom: "0.25rem" }}>Editor</h1>
            <p className="muted" style={{ margin: 0 }}>
              {status || "Unsaved changes are kept in the browser until you save."}
            </p>
          </div>
          <div className="btn-row">
            {savedId ? (
              <Link className="btn" to={`/p/${doc.slug}`} target="_blank" rel="noreferrer">
                Present
              </Link>
            ) : null}
            <button type="button" className="primary" onClick={onSave}>
              Save
            </button>
            <button type="button" onClick={onExport} disabled={!savedId}>
              Export JSON
            </button>
          </div>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}

        <div className="grid-2">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={doc.title}
              onChange={(e) => updateDoc({ title: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="slug">URL slug</label>
            <input
              id="slug"
              value={doc.slug}
              placeholder="auto-generated on save if empty"
              onChange={(e) => updateDoc({ slug: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="template">Template</label>
            <select
              id="template"
              value={doc.templateId}
              onChange={(e) => updateDoc({ templateId: e.target.value })}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="visibility">Visibility</label>
            <select
              id="visibility"
              value={doc.visibility}
              onChange={(e) => updateDoc({ visibility: e.target.value })}
            >
              <option value="public">Public link (anyone with URL)</option>
              <option value="authenticated">Cognito required (when auth enabled)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="backgroundScene">Space background</label>
            <select
              id="backgroundScene"
              value={backgroundScene}
              onChange={(e) => updateMeta({ backgroundScene: e.target.value })}
            >
              <option value="none">Off</option>
              <option value="minimal">Astro minimal (account client default)</option>
              <option value="full">Astro full (planets / richer scene)</option>
            </select>
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.35rem" }}>
              Loads PIXI scene from{" "}
              <code>{defaultAssetsBaseUrl}/scenes/full-screen-background.js</code> — same as
              astro-account.
            </p>
          </div>
          <div className="field">
            <label htmlFor="backgroundOpacity">
              Background opacity ({backgroundOpacity.toFixed(2)})
            </label>
            <input
              id="backgroundOpacity"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={backgroundOpacity}
              disabled={backgroundScene === "none"}
              onChange={(e) => updateMeta({ backgroundOpacity: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="editor-layout">
        <div className="panel">
          <div className="btn-row" style={{ marginBottom: "0.75rem" }}>
            <strong>Slides</strong>
            <button type="button" onClick={addSlide}>
              Add
            </button>
          </div>
          <ul className="slide-list">
            {doc.slides.map((slide, index) => (
              <li key={slide.id}>
                <button
                  type="button"
                  className={index === activeSlideIndex ? "active" : ""}
                  onClick={() => setActiveSlideIndex(index)}
                >
                  {index + 1}. {slide.layout}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          {activeSlide ? (
            <>
              <div className="field">
                <label>Layout</label>
                <select
                  value={activeSlide.layout}
                  onChange={(e) => updateSlide(activeSlideIndex, { layout: e.target.value })}
                >
                  <option value="title">Title</option>
                  <option value="section">Section</option>
                  <option value="content">Content</option>
                  <option value="two-column">Two column</option>
                </select>
              </div>
              <div className="field">
                <label>Markdown</label>
                <textarea
                  value={activeSlide.markdown}
                  onChange={(e) => updateSlide(activeSlideIndex, { markdown: e.target.value })}
                />
                <div className="btn-row" style={{ marginTop: "0.5rem" }}>
                  <label className="btn" style={{ cursor: "pointer", marginBottom: 0 }}>
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={onImageUpload}
                    />
                  </label>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    Inserts <code>![alt](url)</code> (stored in LocalStack S3)
                  </span>
                </div>
              </div>
              <div className="field">
                <label>Speaker notes</label>
                <textarea
                  style={{ minHeight: "80px" }}
                  value={activeSlide.notes}
                  onChange={(e) => updateSlide(activeSlideIndex, { notes: e.target.value })}
                />
              </div>
              <div className="btn-row">
                <button type="button" onClick={() => moveSlide(activeSlideIndex, -1)}>
                  Move up
                </button>
                <button type="button" onClick={() => moveSlide(activeSlideIndex, 1)}>
                  Move down
                </button>
                <button type="button" className="danger" onClick={() => removeSlide(activeSlideIndex)}>
                  Remove slide
                </button>
              </div>
            </>
          ) : null}
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Preview</h3>
          <div
            className="preview-pane"
            dangerouslySetInnerHTML={{
              __html: renderMarkdownPreview(activeSlide?.markdown || ""),
            }}
          />
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <h2>Import JSON</h2>
        <p className="muted">
          Paste a full presentation document. Use <strong>Replace</strong> to overwrite the deck you are
          editing (same link at <code>/p/{doc.slug || "…"}</code>). Use <strong>Import new</strong> to
          create a copy.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{ "version": 1, "title": "...", "slides": [] }'
          style={{ minHeight: "140px" }}
        />
        <div className="btn-row" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="primary"
            onClick={() => onImport(false)}
            disabled={!importText.trim() || !savedId}
          >
            Replace this presentation
          </button>
          <button type="button" onClick={() => onImport(true)} disabled={!importText.trim()}>
            Import as new presentation
          </button>
        </div>
      </div>
    </div>
  );
}
