import { nanoid } from "nanoid";
import { getTemplate } from "../templates/index.js";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @param {string} title
 */
export function slugify(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "presentation";
}

/**
 * @param {unknown} body
 */
export function normalizePresentationDocument(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Presentation body must be an object");
  }

  const raw = /** @type {Record<string, unknown>} */ (body);
  const version = Number(raw.version ?? 1);
  if (version !== 1) {
    throw new Error(`Unsupported presentation version: ${version}`);
  }

  const title = String(raw.title || "Untitled presentation").trim();
  const templateId = String(raw.templateId || "default");
  getTemplate(templateId);

  const visibility = raw.visibility === "authenticated" ? "authenticated" : "public";

  let slug = String(raw.slug || slugify(title));
  if (!SLUG_RE.test(slug)) {
    slug = `${slugify(title)}-${nanoid(6).toLowerCase()}`;
  }

  const slides = Array.isArray(raw.slides) ? raw.slides : [];
  const normalizedSlides = slides.map((slide, index) => normalizeSlide(slide, index));

  const meta = normalizePresentationMeta(raw.meta, templateId, raw);

  return {
    version: 1,
    title,
    slug,
    templateId,
    visibility,
    meta,
    slides: normalizedSlides,
  };
}

/**
 * @param {unknown} rawMeta
 * @param {string} templateId
 * @param {Record<string, unknown>} raw
 */
function normalizePresentationMeta(rawMeta, templateId, raw) {
  const meta = typeof rawMeta === "object" && rawMeta ? { ...rawMeta } : {};

  const sceneRaw = raw.backgroundScene ?? meta.backgroundScene;
  if (sceneRaw !== undefined) {
    const scene = String(sceneRaw);
    if (!["none", "minimal", "full"].includes(scene)) {
      throw new Error(`backgroundScene must be none, minimal, or full (got ${scene})`);
    }
    meta.backgroundScene = scene;
  } else if (templateId === "astro" && meta.backgroundScene === undefined) {
    meta.backgroundScene = "minimal";
  }

  const opacityRaw = raw.backgroundOpacity ?? meta.backgroundOpacity;
  if (opacityRaw !== undefined) {
    const opacity = Number(opacityRaw);
    if (Number.isNaN(opacity) || opacity < 0.1 || opacity > 1) {
      throw new Error("backgroundOpacity must be a number between 0.1 and 1");
    }
    meta.backgroundOpacity = opacity;
  } else if (meta.backgroundScene && meta.backgroundScene !== "none") {
    meta.backgroundOpacity = meta.backgroundOpacity ?? 0.5;
  }

  if (raw.assetsBaseUrl !== undefined) {
    meta.assetsBaseUrl = String(raw.assetsBaseUrl).replace(/\/$/, "");
  } else if (typeof meta.assetsBaseUrl === "string") {
    meta.assetsBaseUrl = meta.assetsBaseUrl.replace(/\/$/, "");
  }

  return meta;
}

/**
 * @param {unknown} slide
 * @param {number} index
 */
function normalizeSlide(slide, index) {
  if (!slide || typeof slide !== "object") {
    return {
      id: nanoid(8),
      layout: "content",
      markdown: `# Slide ${index + 1}`,
      notes: "",
    };
  }

  const s = /** @type {Record<string, unknown>} */ (slide);
  const layout = typeof s.layout === "string" ? s.layout : "content";
  const markdown =
    typeof s.markdown === "string"
      ? s.markdown
      : typeof s.content === "string"
        ? s.content
        : `# Slide ${index + 1}`;

  return {
    id: typeof s.id === "string" ? s.id : nanoid(8),
    layout,
    markdown,
    notes: typeof s.notes === "string" ? s.notes : "",
    background: typeof s.background === "string" ? s.background : undefined,
  };
}

/**
 * @param {ReturnType<typeof normalizePresentationDocument>} doc
 */
export function toExportPayload(doc) {
  return {
    version: doc.version,
    title: doc.title,
    slug: doc.slug,
    templateId: doc.templateId,
    visibility: doc.visibility,
    meta: doc.meta,
    slides: doc.slides,
  };
}

/**
 * @param {unknown} value
 */
export function parseDocumentColumn(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return { version: 1, slides: [] };
    }
  }
  if (typeof value === "object" && value) {
    return value;
  }
  return { version: 1, slides: [] };
}

/**
 * @param {Record<string, unknown>} row
 */
export function rowToPresentation(row) {
  const document = parseDocumentColumn(row.document);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    templateId: row.template_id,
    visibility: row.visibility,
    document,
    createdByEmail:
      typeof row.created_by_email === "string" ? row.created_by_email : null,
    createdBySub: typeof row.created_by_sub === "string" ? row.created_by_sub : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @param {ReturnType<typeof rowToPresentation>} presentation
 */
export function toListItem(presentation) {
  return {
    id: presentation.id,
    slug: presentation.slug,
    title: presentation.title,
    templateId: presentation.templateId,
    visibility: presentation.visibility,
    slideCount: Array.isArray(presentation.document?.slides)
      ? presentation.document.slides.length
      : 0,
    createdByEmail: presentation.createdByEmail,
    createdBySub: presentation.createdBySub,
    updatedAt: presentation.updatedAt,
  };
}
