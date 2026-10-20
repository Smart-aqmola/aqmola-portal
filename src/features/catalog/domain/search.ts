import type { Page } from "./types";

/** Lowercase, drop diacritics (ё→е, й→и) and collapse spaces, so searching is forgiving. */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when every word of the query appears somewhere in the text. */
export function matchesQuery(text: string, query: string): boolean {
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(text);
  return words.every((word) => haystack.includes(word));
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  return {
    items: items.slice(start, start + size),
    total: items.length,
    page: current,
    pageSize: size,
    pageCount,
  };
}
