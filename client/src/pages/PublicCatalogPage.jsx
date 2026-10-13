import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deletePresentation, fetchConfig, listPublicPresentations } from "../api/client.js";
import { useApp } from "../context/AppProvider.jsx";
import { canManageOnPublicCatalog } from "../lib/presentationPermissions.js";
import { filterPresentations } from "../lib/presentationSearch.js";

export default function PublicCatalogPage() {
  const { auth, authLoading } = useApp();
  const [publicOpenEdit, setPublicOpenEdit] = useState(false);
  const showCatalogManageActions =
    !authLoading && canManageOnPublicCatalog(auth, { publicOpenEdit });
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const filteredItems = useMemo(
    () => filterPresentations(items, searchQuery),
    [items, searchQuery]
  );

  useEffect(() => {
    fetchConfig()
      .then((cfg) => setPublicOpenEdit(Boolean(cfg.publicOpenEdit)))
      .catch(() => setPublicOpenEdit(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listPublicPresentations();
        if (!cancelled) {
          setItems(data.presentations || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load public decks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onDelete(id, title) {
    if (!window.confirm(`Delete public deck "${title}"?`)) {
      return;
    }
    try {
      await deletePresentation(id);
      const data = await listPublicPresentations();
      setItems(data.presentations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="panel">
      <h1>Public presentations</h1>
      <p className="muted">
        Anyone with the link can open these decks at <code>/p/slug</code>. Authenticated-only decks
        are not listed here.
        {publicOpenEdit
          ? " Signed-in users can edit and delete any public deck listed here."
          : " Admins signed in see Edit and Delete for every public deck."}
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      {!loading && items.length > 0 ? (
        <div className="presentation-search">
          <label htmlFor="public-presentations-search">Search</label>
          <input
            id="public-presentations-search"
            type="search"
            data-test-id="public-presentations-search-input"
            placeholder="Title or slug…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="muted">No public presentations yet.</p>
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
              <Link
                className="btn primary"
                to={`/p/${item.slug}`}
                target="_blank"
                rel="noreferrer"
                data-test-id={`public-present-link-${item.slug}`}
              >
                Present
              </Link>
              {showCatalogManageActions ? (
                <>
                  <Link className="btn" to={`/edit/${item.id}`} data-test-id={`public-edit-${item.slug}`}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="danger"
                    data-test-id={`public-delete-${item.slug}`}
                    onClick={() => onDelete(item.id, item.title)}
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
