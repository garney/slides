/** Default when server/env does not override (see APP_HELP_PRESENTATION_URL). */
export const DEFAULT_HELP_PRESENTATION_URL =
  "https://my-slides.stationalpha.com/p/how-to-create-presentations";

export const HELP_PRESENTATION_SLUG = "how-to-create-presentations";

/**
 * @param {string | undefined} configured From /api/config helpPresentationUrl
 */
export function resolveHelpPresentationUrl(configured) {
  const trimmed = configured?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  return DEFAULT_HELP_PRESENTATION_URL;
}
