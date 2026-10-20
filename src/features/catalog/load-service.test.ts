import { describe, expect, it } from "vitest";
import { listServiceSlugs, loadService } from "./load-service";

describe("loadService", () => {
  it("returns null for an unknown service", async () => {
    expect(await loadService("ru", "no-such-service")).toBeNull();
  });

  it("describes a service with its provider, number, term and dates", async () => {
    const service = (await loadService("ru", "gas-contract"))!;
    expect(service.card).toMatchObject({
      slug: "gas-contract",
      title: "Заключение договора газоснабжения",
      organization: "Газ Акмола",
      free: true,
    });
    expect(service.code).toMatch(/^\d{4}$/);
    expect(service.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(service.situation.name).toBe("Договоры, лицевые счета и ЕПД");
    expect(service.category.name).toBe("Газоснабжение");
  });

  it("gives the full official name only where it exists", async () => {
    expect((await loadService("ru", "epd-mailing"))!.fullTitle).toMatch(/единого платёжного/);
    expect((await loadService("ru", "gas-contract"))!.fullTitle).toBeUndefined();
  });

  it("lists the steps and documents of the service", async () => {
    const online = (await loadService("ru", "water-meter-readings"))!;
    expect(online.steps).toEqual(["login", "data", "documents", "review", "sign", "result"]);
    expect(online.documents).toEqual(["identity", "meterPhoto"]);

    const visit = (await loadService("ru", "water-meter-sealing"))!;
    expect(visit.steps).toContain("visit");
  });

  it("says where the service is available", async () => {
    const region = (await loadService("ru", "gas-contract"))!;
    expect(region.area).toEqual({ kind: "region" });

    const city = (await loadService("ru", "waste-contract-kokshetau"))!;
    expect(city.area).toEqual({ kind: "territories", names: ["Кокшетау"] });
  });

  it("names the territories in the language of the visitor", async () => {
    const city = (await loadService("kk", "waste-contract-kokshetau"))!;
    expect(city.area).toEqual({ kind: "territories", names: ["Көкшетау"] });
  });

  it("suggests up to three other services of the same life situation for the same audience", async () => {
    const service = (await loadService("ru", "water-meter-readings"))!;
    expect(service.related.length).toBeGreaterThan(0);
    expect(service.related.length).toBeLessThanOrEqual(3);
    for (const other of service.related) {
      expect(other.slug).not.toBe("water-meter-readings");
      expect(other.situationId).toBe("meters");
    }
  });
});

describe("listServiceSlugs", () => {
  it("lists every service so the pages can be built in advance", async () => {
    const slugs = await listServiceSlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(40);
    expect(slugs).toContain("water-meter-readings");
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
