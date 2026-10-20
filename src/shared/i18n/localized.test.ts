import { describe, expect, it } from "vitest";
import { localize } from "./localized";

describe("localize", () => {
  const title = { ru: "Услуги", kk: "Қызметтер", en: "Services" };

  it("returns the text for the requested language", () => {
    expect(localize(title, "kk")).toBe("Қызметтер");
    expect(localize(title, "en")).toBe("Services");
    expect(localize(title, "ru")).toBe("Услуги");
  });

  it("falls back to Russian when a translation is missing", () => {
    expect(localize({ ru: "Вода" }, "kk")).toBe("Вода");
    expect(localize({ ru: "Вода", en: "Water" }, "kk")).toBe("Вода");
  });

  it("does not fall back from an empty string", () => {
    expect(localize({ ru: "Вода", en: "" }, "en")).toBe("Вода");
  });
});
