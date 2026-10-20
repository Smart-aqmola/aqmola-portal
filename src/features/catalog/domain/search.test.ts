import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeText, paginate } from "./search";

describe("normalizeText", () => {
  it("ignores case, ё/е, й/и and extra spaces", () => {
    expect(normalizeText("  Лицевой   СЧЁТ ")).toBe("лицевои счет");
  });

  it("keeps Kazakh letters intact", () => {
    expect(normalizeText("Қызметтер Ғимарат Өтініш")).toBe("қызметтер ғимарат өтініш");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeText("   ")).toBe("");
  });
});

describe("matchesQuery", () => {
  const text = "Передача показаний приборов учёта воды";

  it("matches when every word is present, in any order", () => {
    expect(matchesQuery(text, "воды показания")).toBe(false);
    expect(matchesQuery(text, "воды показаний")).toBe(true);
    expect(matchesQuery(text, "воды передача")).toBe(true);
  });

  it("matches parts of words and ignores case and ё", () => {
    expect(matchesQuery(text, "УЧЕТА")).toBe(true);
    expect(matchesQuery(text, "показан")).toBe(true);
  });

  it("matches everything for an empty query", () => {
    expect(matchesQuery(text, "")).toBe(true);
    expect(matchesQuery(text, "   ")).toBe(true);
  });

  it("does not match when a word is missing", () => {
    expect(matchesQuery(text, "газ")).toBe(false);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, index) => index + 1);

  it("returns the requested page and the totals", () => {
    const page = paginate(items, 2, 10);
    expect(page.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(page).toMatchObject({ total: 25, page: 2, pageSize: 10, pageCount: 3 });
  });

  it("returns a shorter last page", () => {
    expect(paginate(items, 3, 10).items).toEqual([21, 22, 23, 24, 25]);
  });

  it("clamps a page that is too high or too low", () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -4, 10).page).toBe(1);
  });

  it("handles an empty list with one empty page", () => {
    expect(paginate([], 1, 10)).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      pageCount: 1,
    });
  });
});
