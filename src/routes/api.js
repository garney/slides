import { config } from "../config/env.js";
import { buildPublicAuthConfig } from "../config/auth.js";
import { listTemplates } from "../templates/index.js";
import { assetUpload } from "../middleware/assetUpload.js";
import { resolveUserEmail } from "../config/admin.js";
import {
  canViewPresentation,
  supabaseAuthMiddleware,
  verifyAccessToken,
} from "../middleware/supabaseAuth.js";
import {
  adminAuthMiddleware,
  assertCanMutatePresentationId,
  canMutatePresentation,
  userIsAdmin,
} from "../middleware/presentationAccess.js";
import {
  assetsStatus,
  getAssetObject,
  uploadAsset,
} from "../services/s3-assets.js";
import {
  createPresentation,
  deletePresentation,
  exportPresentation,
  getPresentationById,
  getPresentationBySlug,
  importPresentation,
  listPresentations,
  replacePresentation,
  updatePresentation,
} from "../services/presentations.js";
import { listPublicPresentations } from "../services/public-presentations.js";

/**
 * @param {import('express').Request} req
 */
async function optionalUser(req) {
  if (!config.supabase.enabled) {
    return undefined;
  }
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return undefined;
  }
  try {
    return await verifyAccessToken(match[1]);
  } catch {
    return undefined;
  }
}

/**
 * @param {import('express').Request} req
 */
function resolvePublicUrl(req) {
  if (config.publicUrl) {
    return config.publicUrl.replace(/\/$/, "");
  }
  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${host}`;
}

/**
 * @param {import('express').Express} app
 */
export function registerRoutes(app) {
  app.get("/api/health", async (_req, res) => {
    res.json({
      ok: true,
      authEnabled: config.supabase.enabled,
      databaseConfigured: Boolean(config.database.connectionString),
      assets: assetsStatus(),
    });
  });

  app.get("/api/auth/config", (req, res) => {
    const publicUrl = resolvePublicUrl(req);
    res.json(
      buildPublicAuthConfig({
        url: config.supabase.url,
        anonKey: config.supabase.anonKey,
      })
    );
  });

  app.get("/api/auth/me", supabaseAuthMiddleware, (req, res) => {
    const email = resolveUserEmail(req.user);
    res.json({
      email,
      username: req.user?.username || "",
      sub: req.user?.sub || "",
      isAdmin: userIsAdmin(req.user),
    });
  });

  app.get(
    "/api/admin/public-presentations",
    supabaseAuthMiddleware,
    adminAuthMiddleware,
    async (_req, res, next) => {
      try {
        const items = await listPublicPresentations();
        res.json({ presentations: items });
      } catch (err) {
        next(err);
      }
    }
  );

  app.get("/api/config", (req, res) => {
    const publicUrl = resolvePublicUrl(req);
    res.json({
      auth: buildPublicAuthConfig({
        url: config.supabase.url,
        anonKey: config.supabase.anonKey,
      }),
      publicUrl,
      helpPresentationUrl: config.helpPresentationUrl,
      mcpEnabled: config.mcp.enabled,
      mcpUrl: config.mcp.enabled && config.publicUrl ? `${config.publicUrl.replace(/\/$/, "")}/mcp` : "",
      assets: assetsStatus(),
      astroAssetsBaseUrl: config.astroAssetsBaseUrl.replace(/\/$/, ""),
      publicOpenEdit: config.public.openEdit,
    });
  });

  app.post(
    "/api/assets/upload",
    supabaseAuthMiddleware,
    assetUpload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "file is required" });
          return;
        }
        const result = await uploadAsset(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname,
          resolvePublicUrl(req)
        );
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get("/api/assets/:encodedKey", async (req, res, next) => {
    try {
      const key = decodeURIComponent(req.params.encodedKey);
      const asset = await getAssetObject(key);
      if (!asset) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.type(asset.contentType);
      res.send(asset.body);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/templates", (_req, res) => {
    res.json({ templates: listTemplates() });
  });

  app.get("/api/presentations/public", async (_req, res, next) => {
    try {
      const items = await listPublicPresentations();
      res.json({ presentations: items });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/presentations", supabaseAuthMiddleware, async (_req, res, next) => {
    try {
      const items = await listPresentations();
      res.json({ presentations: items });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/presentations", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const created = await createPresentation(req.body || {}, req.user);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/presentations/import", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const body = req.body || {};
      const {
        importMode,
        targetId,
        targetSlug,
        ...presentation
      } = body;

      if (importMode === "replace") {
        let target = null;
        if (typeof targetId === "string") {
          target = await getPresentationById(targetId);
        } else if (typeof targetSlug === "string") {
          target = await getPresentationBySlug(targetSlug);
        }
        if (target && !canMutatePresentation(target, req.user)) {
          res.status(403).json({ error: "You do not have permission to replace this presentation" });
          return;
        }
      }

      const created = await importPresentation(presentation, {
        mode: importMode === "replace" ? "replace" : "create",
        targetId: typeof targetId === "string" ? targetId : undefined,
        targetSlug: typeof targetSlug === "string" ? targetSlug : undefined,
        owner: req.user,
      });
      res.status(importMode === "replace" ? 200 : 201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/presentations/:id/replace", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const existing = await assertCanMutatePresentationId(req, res, req.params.id);
      if (!existing) {
        return;
      }
      const replaced = await replacePresentation(req.params.id, req.body || {});
      if (!replaced) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(replaced);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/presentations/by-slug/:slug", async (req, res, next) => {
    try {
      const presentation = await getPresentationBySlug(req.params.slug);
      if (!presentation) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const user = await optionalUser(req);
      if (!canViewPresentation(presentation, user)) {
        res.status(403).json({ error: "This presentation requires sign-in" });
        return;
      }
      res.json(presentation);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/presentations/:id", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const presentation = await getPresentationById(req.params.id);
      if (!presentation) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (!canViewPresentation(presentation, req.user)) {
        res.status(403).json({ error: "This presentation requires sign-in" });
        return;
      }
      if (!canMutatePresentation(presentation, req.user)) {
        res.status(403).json({ error: "You do not have permission to edit this presentation" });
        return;
      }
      res.json(presentation);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/presentations/:id/export", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const existing = await assertCanMutatePresentationId(req, res, req.params.id);
      if (!existing) {
        return;
      }
      const payload = await exportPresentation(req.params.id);
      if (!payload) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/presentations/:id", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const existing = await assertCanMutatePresentationId(req, res, req.params.id);
      if (!existing) {
        return;
      }
      const updated = await updatePresentation(req.params.id, req.body || {});
      if (!updated) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/presentations/:id", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const existing = await assertCanMutatePresentationId(req, res, req.params.id);
      if (!existing) {
        return;
      }
      const deleted = await deletePresentation(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
}
