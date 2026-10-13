import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "./context/AppProvider.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import Layout from "./components/Layout.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import PresentPage from "./pages/PresentPage.jsx";
import PublicLayout from "./components/PublicLayout.jsx";
import PublicCatalogPage from "./pages/PublicCatalogPage.jsx";
import AdminPublicPage from "./pages/AdminPublicPage.jsx";

function LoadingScreen() {
  return (
    <main className="auth-screen">
      <section className="panel auth-panel">
        <h1>Loading…</h1>
        <p className="muted">Checking authentication.</p>
      </section>
    </main>
  );
}

function AuthGuard() {
  const { authLoading, auth } = useApp();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (auth.enabled && !auth.authenticated) {
    return <AuthScreen />;
  }

  return <Outlet />;
}

function AdminGuard() {
  const { authLoading, auth } = useApp();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (auth.enabled && !auth.authenticated) {
    return <AuthScreen />;
  }

  if (!auth.isAdmin) {
    return (
      <main className="auth-screen">
        <section className="panel auth-panel">
          <h1>Admin access required</h1>
          <p className="muted">
            Your account is not in <code>ADMIN_EMAILS</code>. Use the public catalog to view decks.
          </p>
          <p>
            <a href="/public">Public presentations</a>
          </p>
        </section>
      </main>
    );
  }

  return <Outlet />;
}

function LegacyAuthCallbackRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: "/auth/callback", search: location.search, hash: location.hash }}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/callback.html" element={<LegacyAuthCallbackRedirect />} />
      <Route path="/p/:slug" element={<PresentPage />} />
      <Route element={<PublicLayout />}>
        <Route path="/public" element={<PublicCatalogPage />} />
      </Route>
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/edit/:id" element={<EditorPage />} />
          <Route path="/edit" element={<EditorPage />} />
        </Route>
        <Route element={<AdminGuard />}>
          <Route element={<Layout />}>
            <Route path="/admin/public" element={<AdminPublicPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
