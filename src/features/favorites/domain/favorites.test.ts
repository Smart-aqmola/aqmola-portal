import { describe, expect, it } from "vitest";
import { MAX_FAVORITES, parseFavorites, toggleFavorite } from "./favorites";

describe("parseFavorites", () => {
  it("reads a saved list", () => {
    expect(parseFavorites('["gas-contract","epd-mailing"]')).toEqual([
      "gas-contract",
      "epd-mailing",
    ]);
  });

  it("returns an empty list for nothing, broken text or the wrong shape", () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites("")).toEqual([]);
    expect(parseFavorites("{not json")).toEqual([]);
    expect(parseFavorites('{"a":1}')).toEqual([]);
    expect(parseFavorites('"gas-contract"')).toEqual([]);
  });

  it("keeps only valid service slugs and removes duplicates", () => {
    expect(parseFavorites('["a-b", 5, null, "a-b", "Bad Slug", "<script>", "c"]')).toEqual([
      "a-b",
      "c",
    ]);
  });

  it("does not grow without limit", () => {
    const many = JSON.stringify(
      Array.from({ length: MAX_FAVORITES + 50 }, (_, index) => `s${index}`),
    );
    expect(parseFavorites(many)).toHaveLength(MAX_FAVORITES);
  });
});

describe("toggleFavorite", () => {
  it("adds a service that is not saved yet, newest first", () => {
    expect(toggleFavorite(["a"], "b")).toEqual(["b", "a"]);
  });

  it("removes a service that is already saved", () => {
    expect(toggleFavorite(["b", "a"], "b")).toEqual(["a"]);
  });

  it("does not change the original list", () => {
    const original = ["a"];
    toggleFavorite(original, "b");
    expect(original).toEqual(["a"]);
  });

  it("drops the oldest favorite when the list is full", () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, index) => `s${index}`);
    const next = toggleFavorite(full, "new");
    expect(next).toHaveLength(MAX_FAVORITES);
    expect(next[0]).toBe("new");
    expect(next).not.toContain(`s${MAX_FAVORITES - 1}`);
  });
});
