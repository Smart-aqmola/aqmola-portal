import { describe, expect, it } from "vitest";
import { isSituationId, loadSituation, loadSituations } from "./load-situation";

describe("loadSituations", () => {
  it("lists all eight life situations with the number of their services", async () => {
    const all = await loadSituations("ru");
    expect(all).toHaveLength(8);
    expect(all.every((item) => item.name && item.summary)).toBe(true);
    expect(all.reduce((sum, item) => sum + item.count, 0)).toBeGreaterThan(0);
  });
});

describe("loadSituation", () => {
  it("returns the services of the situation and counts them by category", async () => {
    const page = await loadSituation("ru", "meters");
    expect(page?.name).toBe("Приборы учёта и показания");
    expect(page?.cards.length).toBeGreaterThan(0);
    expect(page?.cards.every((card) => card.situationId === "meters")).toBe(true);
    const total = page?.categories.reduce((sum, item) => sum + item.count, 0);
    expect(total).toBe(page?.cards.length);
    const counts = page?.categories.map((item) => item.count) ?? [];
    expect(counts).toEqual(counts.toSorted((a, b) => b - a));
    expect(page?.others).toHaveLength(7);
    expect(page?.others.some((item) => item.id === "meters")).toBe(false);
  });

  it("speaks the language of the page", async () => {
    const page = await loadSituation("kk", "meters");
    expect(page?.name).toBe("Есептеу құралдары мен көрсеткіштер");
  });

  it("returns nothing for an unknown situation", async () => {
    expect(await loadSituation("ru", "space")).toBeNull();
    expect(isSituationId("meters")).toBe(true);
    expect(isSituationId("__proto__")).toBe(false);
  });
});
