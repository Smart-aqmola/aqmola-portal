import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getDictionary } from "./get-dictionary";

type Tree = { [key: string]: string | string[] | Tree };

/** Lists of words become keys like "home.hero.rotator.words.0", so their length is compared too. */
function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") return { ...acc, [path]: value };
    if (Array.isArray(value)) {
      return {
        ...acc,
        ...Object.fromEntries(value.map((item, index) => [`${path}.${index}`, item])),
      };
    }
    return { ...acc, ...flatten(value, path) };
  }, {});
}

describe("dictionaries", () => {
  it("have the same keys in every locale", async () => {
    const [reference, ...others] = await Promise.all(
      locales.map(async (locale) => Object.keys(flatten(await getDictionary(locale))).sort()),
    );
    for (const keys of others) expect(keys).toEqual(reference);
  });

  it("have no empty strings", async () => {
    for (const locale of locales) {
      const entries = Object.entries(flatten(await getDictionary(locale)));
      for (const [key, value] of entries) {
        expect(value.trim(), `${locale}:${key}`).not.toBe("");
      }
    }
  });

  it("translate texts instead of copying Russian", async () => {
    const ru = flatten(await getDictionary("ru"));
    for (const locale of ["kk", "en"] as const) {
      const other = flatten(await getDictionary(locale));
      expect(other["nav.services"], locale).not.toBe(ru["nav.services"]);
      expect(other["header.signIn"], locale).not.toBe(ru["header.signIn"]);
    }
  });
});
