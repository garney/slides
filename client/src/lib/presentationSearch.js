/**
 * @param {Array<{ id: string; title?: string; slug?: string; templateId?: string; visibility?: string }>} items
 * @param {string} query
 */
export function filterPresentations(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter((item) => {
    const haystack = [
      item.title,
      item.slug,
      item.templateId,
      item.visibility,
      item.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
