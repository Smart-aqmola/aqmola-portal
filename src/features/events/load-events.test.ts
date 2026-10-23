import { describe, expect, it } from "vitest";
import { listEventSlugs, loadEvent, loadPoster, parsePosterParams } from "./load-events";

const wednesday = new Date("2026-10-21T06:00:00Z");

describe("loadPoster", () => {
  it("fills every section with upcoming events in the language of the page", async () => {
    const data = await loadPoster("ru", {}, wednesday);
    expect(data.all.length).toBeGreaterThan(5);
    const dates = data.all.map((item) => item.startsAt);
    expect(dates).toEqual(dates.toSorted());
    expect(data.popular.length).toBeGreaterThan(0);
    expect(data.weekend.every((item) => /2026-10-2[45]/.test(item.startsAt))).toBe(true);
    expect(data.free.every((item) => item.price === null)).toBe(true);
    expect(data.venues).toHaveLength(6);
    expect(data.filtered).toBeUndefined();
    expect(data.credits.length).toBeGreaterThan(0);
  });

  it("filters by the genre or the venue from the address and ignores unknown values", async () => {
    const theatre = await loadPoster("kk", { genre: "theatre" }, wednesday);
    expect(theatre.filtered?.every((item) => item.genre === "theatre")).toBe(true);
    const venue = await loadPoster("ru", { venue: "kokshetau-museum" }, wednesday);
    expect(venue.filtered?.every((item) => item.venue === "Музей истории Кокшетау")).toBe(true);
    expect(parsePosterParams({ genre: "opera", venue: "x" }, ["a"])).toEqual({});
  });
});

describe("loadEvent", () => {
  it("returns the event with its venue, paragraphs and others to see", async () => {
    const [slug] = await listEventSlugs();
    const event = await loadEvent("ru", slug, wednesday);
    expect(event?.paragraphs.length).toBeGreaterThan(1);
    expect(event?.venue.address).toBeTruthy();
    expect(event?.related.some((item) => item.slug === slug)).toBe(false);
    expect(await loadEvent("ru", "nothing", wednesday)).toBeNull();
  });
});
