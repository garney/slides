import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchAuthMe } from "../api/client.js";
import { initAuth, signOut } from "../api/auth.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [auth, setAuth] = useState({
    enabled: false,
    authenticated: false,
    email: "",
    isAdmin: false,
    sub: "",
  });

  const refreshAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const authState = await initAuth();
      if (authState.authenticated) {
        try {
          const me = await fetchAuthMe();
          setAuth({
            ...authState,
            email: me.email || authState.email,
            sub: me.sub || "",
            isAdmin: Boolean(me.isAdmin),
          });
          return {
            ...authState,
            email: me.email || authState.email,
            sub: me.sub || "",
            isAdmin: Boolean(me.isAdmin),
          };
        } catch {
          setAuth(authState);
          return authState;
        }
      }
      setAuth(authState);
      return authState;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const onCallback =
      window.location.pathname === "/auth/callback" ||
      window.location.pathname === "/auth/callback.html";
    if (onCallback) {
      setAuthLoading(false);
      return;
    }
    void refreshAuth();
  }, [refreshAuth]);

  const value = useMemo(
    () => ({
      auth,
      authLoading,
      signOut,
      refreshAuth,
    }),
    [auth, authLoading, refreshAuth]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
