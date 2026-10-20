import { describe, expect, it } from "vitest";
import { format } from "./format";

describe("format", () => {
  it("replaces placeholders with values", () => {
    expect(format("Популярные услуги: {name}", { name: "Счётчики" })).toBe(
      "Популярные услуги: Счётчики",
    );
  });

  it("accepts numbers and replaces every occurrence", () => {
    expect(format("{n} из {n}", { n: 3 })).toBe("3 из 3");
  });

  it("keeps unknown placeholders visible so mistakes are easy to spot", () => {
    expect(format("№ {code}", {})).toBe("№ {code}");
  });

  it("returns text without placeholders unchanged", () => {
    expect(format("Бесплатно", { n: 1 })).toBe("Бесплатно");
  });
});
