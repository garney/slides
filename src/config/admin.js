/**
 * @param {string | undefined} raw
 */
export function parseAdminEmails(raw) {
  return (raw || "")
    .split(/[,;\n]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {{ email?: string; username?: string } | undefined} user
 */
export function resolveUserEmail(user) {
  if (!user) {
    return "";
  }
  if (user.email) {
    return user.email.trim().toLowerCase();
  }
  const username = user.username?.trim() || "";
  if (username.includes("@")) {
    return username.toLowerCase();
  }
  return "";
}

/**
 * @param {string[]} adminEmails
 * @param {{ email?: string; username?: string } | undefined} user
 * @param {{ authEnabled: boolean }} options
 */
/**
 * @param {{ createdByEmail?: string | null; createdBySub?: string | null }} presentation
 * @param {{ email?: string; username?: string; sub?: string } | undefined} user
 */
export function isPresentationOwner(presentation, user) {
  const email = resolveUserEmail(user);
  const sub = user?.sub?.trim() || "";
  const ownerEmail = presentation.createdByEmail?.trim().toLowerCase() || "";
  const ownerSub = presentation.createdBySub?.trim() || "";

  if (!ownerEmail && !ownerSub) {
    return true;
  }
  if (ownerEmail && email && ownerEmail === email) {
    return true;
  }
  if (ownerSub && sub && ownerSub === sub) {
    return true;
  }
  return false;
}

export function isAdminUser(user, adminEmails, options) {
  const email = resolveUserEmail(user);
  if (adminEmails.length === 0) {
    return !options.authEnabled;
  }
  if (!email) {
    return false;
  }
  return adminEmails.includes(email);
}
