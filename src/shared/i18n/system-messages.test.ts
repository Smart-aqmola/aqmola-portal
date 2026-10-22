import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { systemMessages } from "./system-messages";

describe("systemMessages", () => {
  it("has every text in every language", () => {
    for (const locale of locales) {
      const { notFound, error } = systemMessages[locale];
      for (const text of [...Object.values(notFound), ...Object.values(error)]) {
        expect(text.trim().length, locale).toBeGreaterThan(2);
      }
    }
  });

  it("never lets technical words into what the visitor reads (18.8)", () => {
    const all = locales.flatMap((locale) => [
      ...Object.values(systemMessages[locale].error),
      ...Object.values(systemMessages[locale].notFound),
    ]);
    expect(all.join(" ")).not.toMatch(/stack|exception|undefined|null|500|TypeError|digest/i);
  });
});
