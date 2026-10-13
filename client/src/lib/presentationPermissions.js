/**
 * CMS home: edit/delete if admin or creator (legacy decks without owner remain editable by anyone signed in).
 */
export function canManageInCms(item, auth) {
  if (auth.isAdmin) {
    return true;
  }
  return isOwner(item, auth);
}

/**
 * Public catalog: edit/delete any public deck when admin, or when server flag publicOpenEdit is on and user is signed in.
 * @param {{ isAdmin?: boolean; authenticated?: boolean }} auth
 * @param {{ publicOpenEdit?: boolean }} [options]
 */
export function canManageOnPublicCatalog(auth, options = {}) {
  if (auth.isAdmin) {
    return true;
  }
  if (options.publicOpenEdit && auth.authenticated) {
    return true;
  }
  return false;
}

function isOwner(item, auth) {
  const email = (auth.email || "").trim().toLowerCase();
  const sub = auth.sub || "";
  const ownerEmail = (item.createdByEmail || "").trim().toLowerCase();
  const ownerSub = (item.createdBySub || "").trim();

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
