import type { Dictionary } from "./get-dictionary";

/**
 * Only the parts of the dictionary a client component needs. Whatever a client component gets is
 * written into the page, so passing the whole dictionary (about 150 KB) would weigh down every page.
 */
export function pickDictionary<K extends keyof Dictionary>(
  dict: Dictionary,
  ...keys: K[]
): Pick<Dictionary, K> {
  const part = {} as Pick<Dictionary, K>;
  for (const key of keys) part[key] = dict[key];
  return part;
}
