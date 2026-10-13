import { apiFetch } from "./auth.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Request failed");
  }
  return data;
}

export async function fetchConfig() {
  return parseJson(await apiFetch("/api/config"));
}

export async function fetchAuthMe() {
  return parseJson(await apiFetch("/api/auth/me"));
}

export async function listAdminPublicPresentations() {
  return parseJson(await apiFetch("/api/admin/public-presentations"));
}

export async function fetchTemplates() {
  return parseJson(await apiFetch("/api/templates"));
}

export async function listPresentations() {
  return parseJson(await apiFetch("/api/presentations"));
}

export async function listPublicPresentations() {
  const res = await fetch("/api/presentations/public");
  return parseJson(res);
}

export async function getPresentation(id) {
  return parseJson(await apiFetch(`/api/presentations/${id}`));
}

export async function getPresentationBySlug(slug) {
  return parseJson(await apiFetch(`/api/presentations/by-slug/${slug}`));
}

export async function createPresentation(body) {
  return parseJson(
    await apiFetch("/api/presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function updatePresentation(id, body) {
  return parseJson(
    await apiFetch(`/api/presentations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function deletePresentation(id) {
  const res = await apiFetch(`/api/presentations/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    await parseJson(res);
  }
}

export async function exportPresentation(id) {
  return parseJson(await apiFetch(`/api/presentations/${id}/export`));
}

export async function importPresentation(body, options = {}) {
  const payload =
    options.mode === "replace"
      ? {
          ...body,
          importMode: "replace",
          targetId: options.targetId,
          targetSlug: options.targetSlug,
        }
      : body;

  const res = await apiFetch("/api/presentations/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function replacePresentationFromJson(id, body) {
  return parseJson(
    await apiFetch(`/api/presentations/${id}/replace`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function uploadAsset(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/api/assets/upload", { method: "POST", body: form });
  return parseJson(res);
}
