import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config/env.js";

/** @type {ReturnType<typeof createRemoteJWKSet> | null} */
let jwks = null;

function getJwks() {
  if (!jwks) {
    const url = config.supabase.url?.replace(/\/$/, "");
    if (!url) {
      throw new Error("SUPABASE_URL is required when Supabase auth is enabled");
    }
    jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * @param {string} token
 */
export async function verifyAccessToken(token) {
  if (!config.supabase.enabled) {
    return { sub: "anonymous" };
  }

  const issuer = `${config.supabase.url.replace(/\/$/, "")}/auth/v1`;
  const { payload } = await jwtVerify(token, getJwks(), { issuer });

  const email =
    typeof payload.email === "string"
      ? payload.email
      : typeof payload.user_metadata === "object" &&
          payload.user_metadata &&
          typeof payload.user_metadata.email === "string"
        ? payload.user_metadata.email
        : undefined;

  return {
    username: email || String(payload.sub || ""),
    email,
    sub: String(payload.sub || ""),
  };
}

/**
 * Protect CMS write routes when Supabase auth is configured.
 */
export function supabaseAuthMiddleware(req, res, next) {
  if (!config.supabase.enabled) {
    next();
    return;
  }

  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  verifyAccessToken(match[1])
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: "Invalid or expired token" });
    });
}

/**
 * @param {import("../services/presentations.js").ReturnType} presentation
 * @param {{ sub?: string } | undefined} user
 */
export function canViewPresentation(presentation, user) {
  if (presentation.visibility !== "authenticated") {
    return true;
  }
  if (!config.supabase.enabled) {
    return true;
  }
  return Boolean(user?.sub && user.sub !== "anonymous");
}
