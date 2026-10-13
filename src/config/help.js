export const HELP_PRESENTATION_SLUG = "how-to-create-presentations";

/** Default public help deck URL when APP_HELP_PRESENTATION_URL is unset. */
export const DEFAULT_HELP_PRESENTATION_URL =
  "https://my-slides.stationalpha.com/p/how-to-create-presentations";

/**
 * @param {string | undefined} configured
 */
export function resolveHelpPresentationUrl(configured) {
  const trimmed = configured?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  return DEFAULT_HELP_PRESENTATION_URL;
}
