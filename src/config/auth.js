/**
 * Public auth settings for the browser (Supabase anon key only).
 */

/**
 * @param {{
 *   url: string;
 *   anonKey: string;
 * }} options
 */
export function buildPublicAuthConfig(options) {
  const url = (options.url || "").replace(/\/$/, "");
  const anonKey = options.anonKey || "";

  return {
    enabled: Boolean(url && anonKey),
    url,
    anonKey,
  };
}
