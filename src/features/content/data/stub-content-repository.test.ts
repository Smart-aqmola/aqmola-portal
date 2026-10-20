import { describe, expect, it } from "vitest";
import { StubContentRepository } from "./stub-content-repository";

const repository = new StubContentRepository();

describe("StubContentRepository", () => {
  describe("news", () => {
    it("searches, orders by views and pages", async () => {
      const base = { lang: "ru" as const, sort: "latest" as const, page: 1, pageSize: 4 };
      const first = await repository.searchNews(base);
      expect(first.items).toHaveLength(4);
      expect(first.pageCount).toBeGreaterThan(1);
      const popular = await repository.searchNews({ ...base, sort: "popular" });
      const views = popular.items.map((item) => item.views);
      expect(views).toEqual(views.toSorted((a, b) => b - a));
      const found = await repository.searchNews({ ...base, q: "набережную" });
      expect(found.items.map((item) => item.slug)).toEqual(["stepnogorsk-embankment"]);
    });

    it("returns the newest news first", async () => {
      const news = await repository.listNews();
      const dates = news.map((item) => item.date);
      expect(dates).toEqual([...dates].sort().reverse());
    });

    it("limits the number of items", async () => {
      expect(await repository.listNews({ limit: 3 })).toHaveLength(3);
    });

    it("returns territory news together with region-wide news", async () => {
      const all = await repository.listNews();
      const burabay = await repository.listNews({ territoryId: "burabay" });
      expect(burabay.length).toBeGreaterThan(0);
      expect(burabay.length).toBeLessThan(all.length);
      for (const item of burabay) {
        expect(item.territoryId === undefined || item.territoryId === "burabay").toBe(true);
      }
      expect(burabay.some((item) => item.territoryId === undefined)).toBe(true);
      expect(burabay.some((item) => item.territoryId === "burabay")).toBe(true);
    });

    it("gets one item by slug or returns null", async () => {
      const [first] = await repository.listNews({ limit: 1 });
      expect((await repository.getNews(first.slug))?.id).toBe(first.id);
      expect(await repository.getNews("no-such-news")).toBeNull();
    });
  });

  describe("places", () => {
    it("lists places and finds one by slug", async () => {
      const places = await repository.listPlaces();
      expect(places.length).toBeGreaterThanOrEqual(5);
      expect((await repository.getPlace("burabay"))?.territoryId).toBe("burabay");
      expect(await repository.getPlace("no-such-place")).toBeNull();
    });
  });

  describe("coming soon", () => {
    it("lists announced sections", async () => {
      expect((await repository.listComingSoon()).length).toBeGreaterThanOrEqual(4);
    });
  });
});
