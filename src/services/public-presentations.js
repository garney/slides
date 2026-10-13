import { nanoid } from "nanoid";
import {
  normalizePresentationDocument,
  rowToPresentation,
  toExportPayload,
  toListItem,
} from "./presentation-schema.js";
import { getPool } from "../db/pool.js";
import {
  createPresentation,
  getPresentationBySlug,
  updatePresentation,
} from "./presentations.js";
import { expandSlidesForPresenter } from "./mcp-slide-normalize.js";

/**
 * @param {unknown} slide
 * @param {number} index
 */
function slideFromInput(slide, index) {
  if (!slide || typeof slide !== "object") {
    throw new Error(`slides[${index}] must be an object with markdown`);
  }
  const s = /** @type {Record<string, unknown>} */ (slide);
  const markdown = typeof s.markdown === "string" ? s.markdown.trim() : "";
  if (!markdown) {
    throw new Error(`slides[${index}].markdown is required`);
  }
  const layout =
    typeof s.layout === "string" && s.layout.trim() ? s.layout.trim() : "content";
  return {
    id: typeof s.id === "string" && s.id.trim() ? s.id.trim() : nanoid(8),
    layout,
    markdown,
    notes: typeof s.notes === "string" ? s.notes : "",
    background: typeof s.background === "string" ? s.background : undefined,
  };
}

export async function listPublicPresentations() {
  const [rows] = await getPool().query(
    `SELECT * FROM presentations WHERE visibility = 'public' ORDER BY updated_at DESC`
  );
  return rows.map(rowToPresentation).map(toListItem);
}

/**
 * @param {string} slug
 */
export async function getPublicPresentationBySlug(slug) {
  const presentation = await getPresentationBySlug(slug);
  if (!presentation || presentation.visibility !== "public") {
    return null;
  }
  return presentation;
}

/**
 * @param {Record<string, unknown>} input
 */
export async function createPublicPresentation(input) {
  const slidesRaw = input.slides;
  if (!Array.isArray(slidesRaw) || slidesRaw.length === 0) {
    throw new Error("slides must be a non-empty array");
  }

  const expanded = expandSlidesForPresenter(
    slidesRaw.map((slide) => (typeof slide === "object" && slide ? slide : {}))
  );
  const slides = expanded.map((slide, index) => slideFromInput(slide, index));
  const templateId = input.templateId || "astro";
  const metaFromInput =
    input.meta && typeof input.meta === "object" && !Array.isArray(input.meta)
      ? /** @type {Record<string, unknown>} */ (input.meta)
      : {};

  const payload = {
    version: 1,
    title: input.title,
    slug: input.slug,
    templateId,
    visibility: "public",
    backgroundScene:
      input.backgroundScene ?? metaFromInput.backgroundScene ?? "full",
    backgroundOpacity:
      input.backgroundOpacity ?? metaFromInput.backgroundOpacity ?? 0.5,
    meta: {
      ...metaFromInput,
      backgroundScene:
        metaFromInput.backgroundScene ?? input.backgroundScene ?? "full",
      backgroundOpacity:
        metaFromInput.backgroundOpacity ?? input.backgroundOpacity ?? 0.5,
    },
    slides,
  };

  const doc = normalizePresentationDocument(payload);
  doc.visibility = "public";
  return createPresentation(doc);
}

/**
 * @param {string} slug
 * @param {unknown[]} slideInputs
 */
export async function appendSlidesToPublicPresentation(slug, slideInputs) {
  if (!Array.isArray(slideInputs) || slideInputs.length === 0) {
    throw new Error("slides must be a non-empty array");
  }

  const existing = await getPublicPresentationBySlug(slug);
  if (!existing) {
    throw new Error(`Public presentation not found: ${slug}`);
  }

  const doc = existing.document;
  const baseIndex = Array.isArray(doc.slides) ? doc.slides.length : 0;
  const expanded = expandSlidesForPresenter(
    slideInputs.map((slide) => (typeof slide === "object" && slide ? slide : {}))
  );
  const newSlides = expanded.map((slide, index) => slideFromInput(slide, baseIndex + index));

  const merged = {
    ...doc,
    visibility: "public",
    slides: [...(doc.slides || []), ...newSlides],
  };

  const updated = await updatePresentation(existing.id, merged);
  if (!updated) {
    throw new Error("Failed to update presentation");
  }
  return updated;
}

/**
 * @param {string} slug
 * @param {{ slideId?: string; slideIndex?: number; markdown?: string; layout?: string; notes?: string }} patch
 */
export async function updateSlideInPublicPresentation(slug, patch) {
  const slideId = typeof patch.slideId === "string" ? patch.slideId.trim() : "";
  const slideIndexRaw = patch.slideIndex;
  const hasIndex = typeof slideIndexRaw === "number" && Number.isFinite(slideIndexRaw);

  if (!slideId && !hasIndex) {
    throw new Error("slideId or slideIndex is required");
  }

  const existing = await getPublicPresentationBySlug(slug);
  if (!existing) {
    throw new Error(`Public presentation not found: ${slug}`);
  }

  const doc = existing.document;
  const slides = Array.isArray(doc.slides) ? [...doc.slides] : [];

  let idx = -1;
  if (slideId) {
    idx = slides.findIndex((slide) => slide && slide.id === slideId);
    if (idx < 0) {
      throw new Error(`Slide not found: ${slideId}`);
    }
  } else {
    const oneBased = Math.trunc(slideIndexRaw);
    if (oneBased < 1 || oneBased > slides.length) {
      throw new Error(`slideIndex must be between 1 and ${slides.length}`);
    }
    idx = oneBased - 1;
  }

  const current = slides[idx];
  if (!current || typeof current !== "object") {
    throw new Error("Invalid slide at target index");
  }

  const next = { ...current };

  if (patch.markdown !== undefined) {
    const markdown = typeof patch.markdown === "string" ? patch.markdown.trim() : "";
    if (!markdown) {
      throw new Error("markdown cannot be empty");
    }
    next.markdown = markdown;
  }

  if (patch.layout !== undefined) {
    const layout = typeof patch.layout === "string" ? patch.layout.trim() : "";
    if (!layout) {
      throw new Error("layout cannot be empty");
    }
    next.layout = layout;
  }

  if (patch.notes !== undefined) {
    next.notes = typeof patch.notes === "string" ? patch.notes : "";
  }

  if (
    patch.markdown === undefined &&
    patch.layout === undefined &&
    patch.notes === undefined
  ) {
    throw new Error("At least one of markdown, layout, or notes must be provided");
  }

  slides[idx] = next;

  const merged = {
    ...doc,
    visibility: "public",
    slides,
  };

  const updated = await updatePresentation(existing.id, merged);
  if (!updated) {
    throw new Error("Failed to update presentation");
  }
  return { updated, slideIndex: idx + 1, slideId: next.id };
}

/**
 * @param {string} slug
 */
export async function exportPublicPresentation(slug) {
  const presentation = await getPublicPresentationBySlug(slug);
  if (!presentation) {
    return null;
  }
  return toExportPayload(presentation.document);
}

/**
 * @param {string} publicUrl
 * @param {string} slug
 */
export function presenterUrl(publicUrl, slug) {
  const base = (publicUrl || "").replace(/\/$/, "");
  if (base) {
    return `${base}/p/${slug}`;
  }
  return `/p/${slug}`;
}
