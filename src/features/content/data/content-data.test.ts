import { describe, expect, it } from "vitest";
import { territories } from "@/features/catalog/data/territories";
import { newsTopics, type Photo } from "../domain/types";
import { comingSoon } from "./coming-soon";
import { news } from "./news";
import { places } from "./places";

const territoryIds = new Set(territories.map((territory) => territory.id));

function expectCredited(photo: Photo, label: string) {
  expect(photo.url, label).toMatch(/^https:\/\/thumb\.wikimedia\.org\//);
  expect(photo.alt.ru.trim(), label).not.toBe("");
  expect(photo.credit.author.trim(), label).not.toBe("");
  expect(photo.credit.license, label).toBe("CC BY-SA 4.0");
  expect(photo.credit.sourceUrl, label).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
}

describe("content test data", () => {
  it("has unique ids and slugs", () => {
    for (const list of [news, places, comingSoon]) {
      const ids = list.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const list of [news, places]) {
      const slugs = list.map((item) => item.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("uses real ISO dates for news", () => {
    for (const item of news) {
      expect(item.date, item.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(item.date)), item.id).toBe(false);
    }
  });

  it("points news and places at real territories", () => {
    for (const item of news) {
      if (item.territoryId) expect(territoryIds.has(item.territoryId), item.id).toBe(true);
    }
    for (const place of places) expect(territoryIds.has(place.territoryId), place.id).toBe(true);
  });

  it("credits the author of every photo", () => {
    for (const item of news) expectCredited(item.photo, item.id);
    for (const place of places) expectCredited(place.photo, place.id);
  });

  it("names every place in all languages", () => {
    for (const place of places) {
      expect(place.name.kk?.trim(), place.id).toBeTruthy();
      expect(place.name.en?.trim(), place.id).toBeTruthy();
    }
  });

  it("has Russian text for everything", () => {
    for (const item of news) {
      expect(item.title.ru.trim(), item.id).not.toBe("");
      expect(item.summary.ru.trim(), item.id).not.toBe("");
    }
    for (const item of comingSoon) {
      expect(item.title.ru.trim(), item.id).not.toBe("");
      expect(item.summary.ru.trim(), item.id).not.toBe("");
    }
  });

  it("gives every news item a known topic, a view count and a text", () => {
    for (const item of news) {
      expect(newsTopics, item.id).toContain(item.topic);
      expect(item.views, item.id).toBeGreaterThanOrEqual(0);
      expect(item.body.ru.trim(), item.id).not.toBe("");
    }
    expect(new Set(news.map((item) => item.topic)).size).toBe(newsTopics.length);
  });

  it("describes every place", () => {
    for (const place of places) expect(place.description.ru.trim(), place.id).not.toBe("");
  });

  it("has Kazakh and English texts for every news item, place and announcement", () => {
    const hasCyrillic = /[\u0400-\u04FF]/;
    for (const lang of ["kk", "en"] as const) {
      const texts = [
        ...news.flatMap((item) => [item.title, item.summary, item.body, item.photo.alt]),
        ...places.flatMap((place) => [
          place.name,
          place.summary,
          place.description,
          place.photo.alt,
        ]),
        ...comingSoon.flatMap((item) => [item.title, item.summary]),
      ];
      for (const text of texts) {
        expect(text[lang]?.trim(), `${lang}: ${text.ru}`).toBeTruthy();
        if (lang === "en") expect(text.en, text.ru).not.toMatch(hasCyrillic);
      }
    }
  });
});
