import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deletePresentation, listAdminPublicPresentations } from "../api/client.js";
import { filterPresentations } from "../lib/presentationSearch.js";

export default function AdminPublicPage() {
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
      const data = await listAdminPublicPresentations();
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
    if (!window.confirm(`Delete public deck "${title}"?`)) {
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
      <h1>Admin · public presentations</h1>
      <p className="muted">
        Edit or delete any public deck. Access is limited to emails in{" "}
        <code>ADMIN_EMAILS</code>.
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="btn-row" style={{ marginBottom: "1rem" }}>
        <button type="button" onClick={refresh} disabled={loading}>
          Refresh
        </button>
        <Link className="btn" to="/public">
          Public catalog
        </Link>
      </div>

      {!loading && items.length > 0 ? (
        <div className="presentation-search">
          <label htmlFor="admin-public-search">Search</label>
          <input
            id="admin-public-search"
            type="search"
            data-test-id="admin-public-search-input"
            placeholder="Title or slug…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="muted">No public presentations.</p>
      ) : null}

      {!loading && items.length > 0 && filteredItems.length === 0 ? (
        <p className="muted">No decks match &ldquo;{searchQuery.trim()}&rdquo;.</p>
      ) : null}

      <ul className="deck-list">
        {filteredItems.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <div className="meta">
                {item.slideCount} slides · template {item.templateId}
              </div>
              <div className="meta">/p/{item.slug}</div>
            </div>
            <div className="btn-row">
              <Link className="btn" to={`/p/${item.slug}`} target="_blank" rel="noreferrer">
                Present
              </Link>
              <Link className="btn primary" to={`/edit/${item.id}`} data-test-id={`admin-edit-${item.slug}`}>
                Edit
              </Link>
              <button
                type="button"
                className="danger"
                data-test-id={`admin-delete-${item.slug}`}
                onClick={() => onDelete(item.id, item.title)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
