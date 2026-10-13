/** @typedef {'none' | 'minimal' | 'full'} BackgroundScene */

export const BACKGROUND_SCENES = /** @type {const} */ (["none", "minimal", "full"]);

/**
 * @param {unknown} scene
 * @returns {scene is BackgroundScene}
 */
export function isBackgroundScene(scene) {
  return BACKGROUND_SCENES.includes(/** @type {BackgroundScene} */ (scene));
}

/**
 * @param {number} value
 */
export function clampOpacity(value) {
  if (Number.isNaN(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0.1, value));
}

/**
 * @param {{ meta?: Record<string, unknown> } | undefined} document
 * @param {string} templateId
 * @param {string} [defaultAssetsBaseUrl]
 */
export function resolveBackgroundSettings(document, templateId, defaultAssetsBaseUrl) {
  const meta = document?.meta || {};
  /** @type {BackgroundScene} */
  let scene = isBackgroundScene(meta.backgroundScene) ? meta.backgroundScene : "none";
  if (scene === "none" && templateId === "astro" && meta.backgroundScene === undefined) {
    scene = "minimal";
  }

  const opacity = clampOpacity(Number(meta.backgroundOpacity ?? 0.5));
  const assetsBaseUrl = String(
    meta.assetsBaseUrl || defaultAssetsBaseUrl || "https://assets.astro.space"
  ).replace(/\/$/, "");

  return { scene, opacity, assetsBaseUrl };
}
