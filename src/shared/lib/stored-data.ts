/**
 * Checks for data read back from the browser. Anything can be there (an old version, an
 * extension, a hand edit), so every field is checked before it is trusted.
 */

const ID = /^[a-z0-9-]{1,60}$/;

export const isText = (value: unknown, max = 200): value is string =>
  typeof value === "string" && value.length <= max;
export const isId = (value: unknown): value is string => isText(value, 60) && ID.test(value);
export const isOneOf = (value: unknown, list: readonly string[]): boolean =>
  typeof value === "string" && list.includes(value);
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const isFile = (value: unknown): boolean =>
  isObject(value) && isText(value.name, 200) && typeof value.size === "number" && value.size >= 0;

/** A saved list: what does not pass `check` is dropped, and no more than `max` are kept. */
export function parseList<T>(
  raw: string | null,
  check: (value: unknown) => value is T,
  max: number,
): T[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(check).slice(0, max);
  } catch {
    return [];
  }
}
