import { describe, expect, it } from "vitest";
import { defaultLocale, hasLocale, localizePath, locales, pickLocale } from "./config";

describe("hasLocale", () => {
  it("accepts supported locales", () => {
    for (const locale of locales) expect(hasLocale(locale)).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(hasLocale("fr")).toBe(false);
    expect(hasLocale("")).toBe(false);
    expect(hasLocale("RU")).toBe(false);
  });
});

describe("pickLocale", () => {
  it("falls back to the default locale without a header", () => {
    expect(pickLocale(null)).toBe(defaultLocale);
    expect(pickLocale(undefined)).toBe(defaultLocale);
    expect(pickLocale("")).toBe(defaultLocale);
  });

  it("matches the primary language subtag", () => {
    expect(pickLocale("kk-KZ,kk;q=0.9")).toBe("kk");
    expect(pickLocale("en-US")).toBe("en");
  });

  it("respects quality values", () => {
    expect(pickLocale("en;q=0.5,kk;q=0.9")).toBe("kk");
  });

  it("skips unsupported languages", () => {
    expect(pickLocale("fr-FR,de;q=0.8,en;q=0.5")).toBe("en");
  });

  it("falls back when nothing matches", () => {
    expect(pickLocale("fr-FR,de")).toBe(defaultLocale);
  });

  it("ignores malformed entries", () => {
    expect(pickLocale(";q=abc,,kk")).toBe("kk");
  });
});

describe("localizePath", () => {
  it("replaces the locale segment", () => {
    expect(localizePath("/ru/services", "kk")).toBe("/kk/services");
    expect(localizePath("/en", "ru")).toBe("/ru");
  });

  it("adds a locale when the path has none", () => {
    expect(localizePath("/services", "en")).toBe("/en/services");
    expect(localizePath("/", "kk")).toBe("/kk");
  });

  it("keeps deeper segments untouched", () => {
    expect(localizePath("/ru/services/water-meter-readings", "en")).toBe(
      "/en/services/water-meter-readings",
    );
  });

  it("does not treat a longer segment as a locale", () => {
    expect(localizePath("/russia/services", "kk")).toBe("/kk/russia/services");
  });
});
