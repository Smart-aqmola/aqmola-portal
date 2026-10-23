import { describe, expect, it } from "vitest";
import { loadMyRegion } from "./load-my-region";

describe("loadMyRegion", () => {
  it("gathers today's weather, rates, photos, news, events, surveys and services", async () => {
    const data = await loadMyRegion("ru", new Date("2026-10-23T06:00:00Z"));
    expect(data.today).toBe("2026-10-23");
    expect(data.photos).toHaveLength(3);
    expect(data.news).toHaveLength(3);
    expect(data.events.length).toBeGreaterThan(0);
    expect(data.event?.slug).toBeTruthy();
    expect(data.openSurveys).toBeGreaterThan(0);
    expect(data.services).toHaveLength(2);
    expect(data.credits.length).toBeGreaterThan(0);
  });

  it("opens with another photo of the day the next day", async () => {
    const first = await loadMyRegion("ru", new Date("2026-10-23T06:00:00Z"));
    const next = await loadMyRegion("ru", new Date("2026-10-24T06:00:00Z"));
    expect(next.photos[0].url).not.toBe(first.photos[0].url);
  });
});
