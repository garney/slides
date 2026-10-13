import { config } from "../config/env.js";
import { isAdminUser, isPresentationOwner, resolveUserEmail } from "../config/admin.js";
import { getPresentationById } from "../services/presentations.js";

/**
 * @param {{ email?: string; username?: string } | undefined} user
 */
export function userIsAdmin(user) {
  return isAdminUser(user, config.admin.emails, { authEnabled: config.supabase.enabled });
}

/**
 * @param {{ createdByEmail?: string | null; createdBySub?: string | null }} presentation
 * @param {{ email?: string; username?: string; sub?: string } | undefined} user
 */
function isAuthenticatedUser(user) {
  if (!user) {
    return false;
  }
  if (resolveUserEmail(user)) {
    return true;
  }
  const sub = user.sub?.trim() || "";
  return Boolean(sub && sub !== "anonymous");
}

/**
 * @param {{ visibility?: string }} presentation
 */
export function isPublicPresentation(presentation) {
  return presentation.visibility !== "authenticated";
}

export function publicOpenEditEnabled() {
  return Boolean(config.public.openEdit);
}

export function canMutatePresentation(presentation, user) {
  if (userIsAdmin(user)) {
    return true;
  }
  if (isPresentationOwner(presentation, user)) {
    return true;
  }
  if (
    config.public.openEdit &&
    isPublicPresentation(presentation) &&
    (!config.supabase.enabled || isAuthenticatedUser(user))
  ) {
    return true;
  }
  return false;
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function adminAuthMiddleware(req, res, next) {
  if (!userIsAdmin(req.user)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} presentationId
 */
export async function assertCanMutatePresentationId(req, res, presentationId) {
  const presentation = await getPresentationById(presentationId);
  if (!presentation) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  if (!canMutatePresentation(presentation, req.user)) {
    res.status(403).json({ error: "You do not have permission to modify this presentation" });
    return null;
  }
  return presentation;
}
