import { describe, expect, it } from "vitest";
import { newsHref, parseNewsParams } from "./news-params";

describe("parseNewsParams", () => {
  it("uses defaults for an empty address", () => {
    expect(parseNewsParams({})).toEqual({ q: "", tab: "latest", page: 1 });
  });

  it("reads known values", () => {
    expect(
      parseNewsParams({ q: "  вода  ", topic: "utilities", tab: "popular", page: "2" }),
    ).toEqual({
      q: "вода",
      topic: "utilities",
      tab: "popular",
      page: 2,
    });
  });

  it("drops anything unknown or broken", () => {
    expect(parseNewsParams({ topic: "x", tab: "y", page: "-3", q: "a".repeat(300) })).toEqual({
      q: "a".repeat(100),
      tab: "latest",
      page: 1,
    });
    expect(parseNewsParams({ page: ["4", "5"] }).page).toBe(4);
  });
});

describe("newsHref", () => {
  it("writes only what differs from the defaults", () => {
    expect(newsHref("ru", { q: "", tab: "latest", page: 1 })).toBe("/ru/news");
    expect(newsHref("kk", { q: "су", topic: "city", tab: "popular", page: 2 })).toBe(
      "/kk/news?q=%D1%81%D1%83&topic=city&tab=popular&page=2",
    );
  });
});
