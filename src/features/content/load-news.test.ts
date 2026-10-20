import { describe, expect, it } from "vitest";
import { loadArticle, loadNews, listNewsSlugs } from "./load-news";
import { loadPlace, loadPlaces } from "./load-places";

describe("loadNews", () => {
  it("returns the first page of the latest news with territory names", async () => {
    const data = await loadNews("ru", {});
    expect(data.items).toHaveLength(4);
    expect(data.total).toBeGreaterThan(4);
    expect(data.items.find((item) => item.territory)?.territory).toBeTruthy();
    const dates = data.items.map((item) => item.date);
    expect(dates).toEqual(dates.toSorted().toReversed());
  });

  it("applies the topic, the search and the tab from the address", async () => {
    const topic = await loadNews("ru", { topic: "city" });
    expect(topic.items.every((item) => item.topic === "city")).toBe(true);
    const search = await loadNews("ru", { q: "набережную" });
    expect(search.items).toHaveLength(1);
    const popular = await loadNews("ru", { tab: "popular" });
    const views = popular.items.map((item) => item.views);
    expect(views).toEqual(views.toSorted((a, b) => b - a));
  });

  it("keeps a page number that is too big inside the range", async () => {
    const data = await loadNews("ru", { page: "99" });
    expect(data.page).toBe(data.pageCount);
    expect(data.params.page).toBe(data.pageCount);
  });
});

describe("loadArticle", () => {
  it("returns paragraphs and other news without the article itself", async () => {
    const [slug] = await listNewsSlugs();
    const article = await loadArticle("ru", slug);
    expect(article?.paragraphs.length).toBeGreaterThan(0);
    expect(article?.other).toHaveLength(3);
    expect(article?.other.some((item) => item.slug === slug)).toBe(false);
  });

  it("returns null for an unknown slug", async () => {
    expect(await loadArticle("ru", "no-such-news")).toBeNull();
  });
});

describe("places", () => {
  it("lists places with one credit per photo author", async () => {
    const { places, credits } = await loadPlaces("en");
    expect(places).toHaveLength(6);
    expect(places.find((place) => place.slug === "zerenda")?.name).toBe("Zerenda");
    expect(credits.length).toBeGreaterThan(0);
  });

  it("returns a place with a description and other places", async () => {
    const place = await loadPlace("ru", "burabay");
    expect(place?.paragraphs.length).toBeGreaterThan(0);
    expect(place?.others).toHaveLength(3);
    expect(await loadPlace("ru", "nowhere")).toBeNull();
  });
});
