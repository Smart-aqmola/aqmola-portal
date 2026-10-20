import { describe, expect, it } from "vitest";
import { queryNews } from "./query-news";
import type { NewsItem } from "./types";

const photo = {
  url: "https://thumb.wikimedia.org/x/960px-a.jpg",
  alt: { ru: "Фото" },
  credit: {
    author: "A",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:a.jpg",
  },
};

const item = (
  slug: string,
  date: string,
  views: number,
  topic: NewsItem["topic"],
  title: string,
  extra: Partial<NewsItem> = {},
): NewsItem => ({
  id: slug,
  slug,
  date,
  views,
  topic,
  title: { ru: title },
  summary: { ru: `Кратко: ${title}` },
  body: { ru: "Текст" },
  photo,
  ...extra,
});

const items = [
  item("a", "2026-10-01", 50, "utilities", "Промывка сетей"),
  item("b", "2026-10-05", 10, "services", "Показания онлайн"),
  item("c", "2026-10-03", 90, "utilities", "Отключение воды", { territoryId: "burabay" }),
  item("d", "2026-10-04", 90, "city", "Новая набережная"),
];

const base = { lang: "ru" as const, sort: "latest" as const, page: 1, pageSize: 10 };

describe("queryNews", () => {
  it("puts the newest first on the latest tab", () => {
    expect(queryNews(items, base).items.map((n) => n.slug)).toEqual(["b", "d", "c", "a"]);
  });

  it("orders by views on the popular tab, newer first among equals", () => {
    expect(queryNews(items, { ...base, sort: "popular" }).items.map((n) => n.slug)).toEqual([
      "d",
      "c",
      "a",
      "b",
    ]);
  });

  it("filters by topic", () => {
    expect(queryNews(items, { ...base, topic: "utilities" }).items.map((n) => n.slug)).toEqual([
      "c",
      "a",
    ]);
  });

  it("searches the title and summary without regard to case", () => {
    expect(queryNews(items, { ...base, q: "НАБЕРЕЖНАЯ" }).items.map((n) => n.slug)).toEqual(["d"]);
    expect(queryNews(items, { ...base, q: "кратко: показ" }).items.map((n) => n.slug)).toEqual([
      "b",
    ]);
  });

  it("returns a territory's news together with region-wide news", () => {
    const slugs = queryNews(items, { ...base, territoryId: "kokshetau" }).items.map((n) => n.slug);
    expect(slugs).not.toContain("c");
    expect(slugs).toContain("a");
  });

  it("cuts pages and reports the total", () => {
    const page = queryNews(items, { ...base, pageSize: 3, page: 2 });
    expect(page.items.map((n) => n.slug)).toEqual(["a"]);
    expect(page).toMatchObject({ total: 4, page: 2, pageCount: 2 });
  });

  it("keeps the page inside the range", () => {
    expect(queryNews(items, { ...base, pageSize: 3, page: 9 }).page).toBe(2);
    expect(queryNews([], base)).toMatchObject({ items: [], total: 0, page: 1, pageCount: 1 });
  });
});
