import { randomUUID } from "node:crypto";
import { nanoid } from "nanoid";
import { getPool } from "../db/pool.js";
import { resolveUserEmail } from "../config/admin.js";
import {
  normalizePresentationDocument,
  rowToPresentation,
  slugify,
  toExportPayload,
  toListItem,
} from "./presentation-schema.js";

/**
 * @param {string} baseSlug
 */
async function uniqueSlug(baseSlug) {
  const pool = getPool();
  let candidate = baseSlug;
  let attempt = 0;
  while (attempt < 20) {
    const [rows] = await pool.query(`SELECT 1 AS ok FROM presentations WHERE slug = ? LIMIT 1`, [
      candidate,
    ]);
    if (rows.length === 0) {
      return candidate;
    }
    candidate = `${baseSlug}-${nanoid(4).toLowerCase()}`;
    attempt += 1;
  }
  return `${baseSlug}-${nanoid(8).toLowerCase()}`;
}

export async function listPresentations() {
  const [rows] = await getPool().query(`SELECT * FROM presentations ORDER BY updated_at DESC`);
  return rows.map(rowToPresentation).map(toListItem);
}

/**
 * @param {string} id
 */
export async function getPresentationById(id) {
  const [rows] = await getPool().query(`SELECT * FROM presentations WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) {
    return null;
  }
  return rowToPresentation(rows[0]);
}

/**
 * @param {string} slug
 */
export async function getPresentationBySlug(slug) {
  const [rows] = await getPool().query(`SELECT * FROM presentations WHERE slug = ? LIMIT 1`, [
    slug,
  ]);
  if (rows.length === 0) {
    return null;
  }
  return rowToPresentation(rows[0]);
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ email?: string; username?: string; sub?: string } | undefined} [owner]
 */
export async function createPresentation(input, owner) {
  const doc = normalizePresentationDocument(input);
  doc.slug = await uniqueSlug(doc.slug || slugify(doc.title));
  const id = randomUUID();
  const createdByEmail = resolveUserEmail(owner) || null;
  const createdBySub = owner?.sub?.trim() || null;

  await getPool().query(
    `INSERT INTO presentations (id, slug, title, template_id, visibility, document, created_by_email, created_by_sub)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      doc.slug,
      doc.title,
      doc.templateId,
      doc.visibility,
      JSON.stringify(doc),
      createdByEmail,
      createdBySub,
    ]
  );

  const created = await getPresentationById(id);
  if (!created) {
    throw new Error("Failed to load presentation after insert");
  }
  return created;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} input
 */
export async function updatePresentation(id, input) {
  const existing = await getPresentationById(id);
  if (!existing) {
    return null;
  }

  const merged = {
    ...existing.document,
    ...input,
    slug: input.slug ?? existing.slug,
    title: input.title ?? existing.title,
  };

  const doc = normalizePresentationDocument(merged);
  if (doc.slug !== existing.slug) {
    doc.slug = await uniqueSlug(doc.slug);
  }

  const [result] = await getPool().query(
    `UPDATE presentations
     SET slug = ?, title = ?, template_id = ?, visibility = ?, document = ?
     WHERE id = ?`,
    [doc.slug, doc.title, doc.templateId, doc.visibility, JSON.stringify(doc), id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getPresentationById(id);
}

/**
 * Replace an existing presentation entirely from import JSON (no merge).
 * @param {string} id
 * @param {Record<string, unknown>} payload
 */
export async function replacePresentation(id, payload) {
  const existing = await getPresentationById(id);
  if (!existing) {
    return null;
  }

  const doc = normalizePresentationDocument(payload);

  const [conflicts] = await getPool().query(
    `SELECT id FROM presentations WHERE slug = ? AND id != ? LIMIT 1`,
    [doc.slug, id]
  );
  if (conflicts.length > 0) {
    throw new Error(`Slug "${doc.slug}" is already used by another presentation`);
  }

  const [result] = await getPool().query(
    `UPDATE presentations
     SET slug = ?, title = ?, template_id = ?, visibility = ?, document = ?
     WHERE id = ?`,
    [doc.slug, doc.title, doc.templateId, doc.visibility, JSON.stringify(doc), id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getPresentationById(id);
}

/**
 * @param {string} id
 */
export async function deletePresentation(id) {
  const [result] = await getPool().query(`DELETE FROM presentations WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{ mode?: 'create' | 'replace'; targetId?: string; targetSlug?: string; owner?: { email?: string; username?: string; sub?: string } }} [options]
 */
export async function importPresentation(payload, options = {}) {
  const mode = options.mode || "create";
  const targetId = options.targetId;
  const targetSlug = options.targetSlug;

  if (mode === "replace") {
    let id = targetId;
    if (!id && targetSlug) {
      const row = await getPresentationBySlug(targetSlug);
      if (!row) {
        throw new Error(`No presentation found with slug "${targetSlug}"`);
      }
      id = row.id;
    }
    if (!id) {
      throw new Error("Replace import requires targetId or targetSlug");
    }
    const replaced = await replacePresentation(id, payload);
    if (!replaced) {
      throw new Error("Presentation not found");
    }
    return replaced;
  }

  const doc = normalizePresentationDocument(payload);
  doc.slug = await uniqueSlug(doc.slug);
  return createPresentation(doc, options.owner);
}

/**
 * @param {string} id
 */
export async function exportPresentation(id) {
  const row = await getPresentationById(id);
  if (!row) {
    return null;
  }
  return toExportPayload(row.document);
}
