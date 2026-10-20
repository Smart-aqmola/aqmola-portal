import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps a path of the same language", () => {
    expect(safeNextPath("ru", "/ru/services/gas-contract/apply")).toBe(
      "/ru/services/gas-contract/apply",
    );
  });

  it("falls back to the applications page for anything else", () => {
    const fallback = "/ru/applications";
    expect(safeNextPath("ru", undefined)).toBe(fallback);
    expect(safeNextPath("ru", "https://evil.example/ru/x")).toBe(fallback);
    expect(safeNextPath("ru", "//evil.example")).toBe(fallback);
    expect(safeNextPath("ru", "/en/services")).toBe(fallback);
    expect(safeNextPath("ru", "/ru/\\evil")).toBe(fallback);
    expect(safeNextPath("ru", "/ru/a\nb")).toBe(fallback);
  });
});
