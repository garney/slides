import { createClient } from "@supabase/supabase-js";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let supabase = null;

/** @type {Record<string, unknown> | null} */
let authConfig = null;

/** @type {import("@supabase/supabase-js").Session | null} */
let currentSession = null;

function getSupabase() {
  if (!authConfig?.enabled || !authConfig.url || !authConfig.anonKey) {
    return null;
  }
  if (!supabase) {
    supabase = createClient(authConfig.url, authConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabase;
}

export async function loadAuthConfig() {
  const res = await fetch("/api/auth/config");
  if (!res.ok) {
    throw new Error("Failed to load auth configuration");
  }
  authConfig = await res.json();
  supabase = null;
  return authConfig;
}

export async function initAuth() {
  await loadAuthConfig();
  const client = getSupabase();
  if (!client) {
    return getAuthState();
  }

  const { data } = await client.auth.getSession();
  currentSession = data.session;

  client.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
  });

  return getAuthState();
}

export async function handleAuthCallback() {
  await loadAuthConfig();
  const client = getSupabase();
  if (!client) {
    throw new Error("Auth is not enabled");
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
  }

  const { data } = await client.auth.getSession();
  currentSession = data.session;
  return getAuthState();
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signInWithPassword(email, password) {
  const client = getSupabase();
  if (!client) {
    throw new Error("Auth is not enabled");
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  const { data } = await client.auth.getSession();
  currentSession = data.session;
  return getAuthState();
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signUpWithPassword(email, password) {
  const client = getSupabase();
  if (!client) {
    throw new Error("Auth is not enabled");
  }
  const { error } = await client.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
  const { data } = await client.auth.getSession();
  currentSession = data.session;
  return getAuthState();
}

export async function signOut() {
  const client = getSupabase();
  if (!client) {
    return;
  }
  await client.auth.signOut();
  currentSession = null;
}

export async function getAccessToken() {
  if (!authConfig?.enabled) {
    return null;
  }
  const client = getSupabase();
  if (!client) {
    return null;
  }
  const { data } = await client.auth.getSession();
  currentSession = data.session;
  return currentSession?.access_token ?? null;
}

export function getAuthState() {
  const enabled = Boolean(authConfig?.enabled);
  const authenticated = enabled ? Boolean(currentSession?.access_token) : true;
  const email = currentSession?.user?.email || "";

  return { enabled, authenticated, email, sub: currentSession?.user?.id || "", isAdmin: false };
}

export async function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const token = await getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
