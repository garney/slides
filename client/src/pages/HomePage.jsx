import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deletePresentation, listPresentations } from "../api/client.js";
import { useApp } from "../context/AppProvider.jsx";
import { canManageInCms } from "../lib/presentationPermissions.js";
import { filterPresentations } from "../lib/presentationSearch.js";

export default function HomePage() {
  const { auth } = useApp();
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const filteredItems = useMemo(
    () => filterPresentations(items, searchQuery),
    [items, searchQuery]
  );

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listPresentations();
      setItems(data.presentations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onDelete(id, title) {
    if (!window.confirm(`Delete "${title}"?`)) {
      return;
    }
    try {
      await deletePresentation(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="panel">
      <h1>Presentations</h1>
      <p className="muted">
        Build decks in the CMS, present with Reveal.js, and round-trip the full deck as JSON.
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="btn-row" style={{ marginBottom: "1rem" }}>
        <Link className="btn primary" to="/edit">
          New presentation
        </Link>
        <button type="button" onClick={refresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="muted">No presentations yet. Import JSON or create one in the editor.</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="presentation-search">
          <label htmlFor="presentations-search">Search your presentations</label>
          <input
            id="presentations-search"
            type="search"
            data-test-id="presentations-search-input"
            placeholder="Title, slug, template, visibility…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}

      {!loading && items.length > 0 && filteredItems.length === 0 ? (
        <p className="muted">No presentations match &ldquo;{searchQuery.trim()}&rdquo;.</p>
      ) : null}

      <ul className="deck-list">
        {filteredItems.map((item) => {
          const manageable = canManageInCms(item, auth);
          return (
          <li key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <div className="meta">
                {item.slideCount} slides · template {item.templateId} ·{" "}
                <span className="badge">{item.visibility}</span>
              </div>
              <div className="meta">/p/{item.slug}</div>
            </div>
            <div className="btn-row">
              <Link className="btn" to={`/p/${item.slug}`} target="_blank" rel="noreferrer">
                Present
              </Link>
              {manageable ? (
                <>
                  <Link className="btn" to={`/edit/${item.id}`}>
                    Edit
                  </Link>
                  <button type="button" className="danger" onClick={() => onDelete(item.id, item.title)}>
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
