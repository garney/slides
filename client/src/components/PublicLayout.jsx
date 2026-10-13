import { Link, Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/public" className="brand" data-test-id="public-header-logo">
          my-slides
        </Link>
        <nav className="header-nav">
          <Link to="/public" data-test-id="public-catalog-link">
            Public decks
          </Link>
          <Link to="/" data-test-id="public-cms-link">
            My presentations
          </Link>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
