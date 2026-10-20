export const FAVORITES_KEY = "aqmola:favorites";
export const MAX_FAVORITES = 100;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Read the saved list defensively: anything unexpected in storage is ignored. */
export function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const slugs = value.filter(
      (item): item is string => typeof item === "string" && SLUG.test(item),
    );
    return [...new Set(slugs)].slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

/** Add a service (newest first) or remove it when it is already saved. */
export function toggleFavorite(list: readonly string[], slug: string): string[] {
  if (list.includes(slug)) return list.filter((item) => item !== slug);
  return [slug, ...list].slice(0, MAX_FAVORITES);
}
