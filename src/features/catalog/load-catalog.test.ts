import { describe, expect, it } from "vitest";
import { loadCatalog } from "./load-catalog";

describe("loadCatalog", () => {
  it("opens for residents with the first page of services", async () => {
    const catalog = await loadCatalog("ru", {});
    expect(catalog.params).toEqual({ q: "", audience: "resident", page: 1 });
    expect(catalog.cards).toHaveLength(12);
    expect(catalog.pageSize).toBe(12);
    expect(catalog.pageCount).toBeGreaterThan(1);
    expect(catalog.total).toBeGreaterThan(12);
  });

  it("shows popular services first when nothing is searched", async () => {
    const { cards } = await loadCatalog("ru", {});
    const flags = cards.map((card) => card.popular);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });

  it("keeps business-only services away from residents and the other way round", async () => {
    const residents = await loadCatalog("ru", { for: "resident" });
    const business = await loadCatalog("ru", { for: "business" });
    const all = (c: typeof residents) => c.cards.map((card) => card.audience);
    expect(all(residents)).not.toContain("business");
    expect(all(business)).not.toContain("resident");
    expect(residents.total + business.total).toBeGreaterThan(0);
  });

  it("filters by every parameter of the address", async () => {
    const catalog = await loadCatalog("ru", {
      q: "договор",
      territory: "burabay",
      for: "business",
      category: "electricity",
    });
    expect(catalog.params).toMatchObject({ territory: "burabay", audience: "business" });
    expect(catalog.cards.length).toBeGreaterThan(0);
    for (const card of catalog.cards) {
      expect(card.categoryId).toBe("electricity");
      expect(card.title.toLowerCase()).toContain("договор");
    }
  });

  it("finds a service by its number", async () => {
    const catalog = await loadCatalog("ru", { q: "1001", for: "resident" });
    expect(catalog.cards.map((card) => card.code)).toEqual(["1001"]);
  });

  it("counts every category with the same filters, so the chips add up to the result", async () => {
    const catalog = await loadCatalog("ru", { for: "business", territory: "kokshetau" });
    const sum = catalog.categories.reduce((total, category) => total + category.count, 0);
    expect(sum).toBe(catalog.total);
    expect(catalog.categories).toHaveLength(10);
    expect(catalog.categories[0].id).toBe("water");
  });

  it("keeps the selected category in the chips but counts the others without it", async () => {
    const catalog = await loadCatalog("ru", { category: "water" });
    const water = catalog.categories.find((category) => category.id === "water")!;
    expect(water.count).toBe(catalog.total);
    expect(
      catalog.categories.some((category) => category.id !== "water" && category.count > 0),
    ).toBe(true);
  });

  it("goes to the last page when the page is too high", async () => {
    const catalog = await loadCatalog("ru", { page: "999" });
    expect(catalog.page).toBe(catalog.pageCount);
    expect(catalog.cards.length).toBeGreaterThan(0);
  });

  it("returns no cards for an empty result but still offers filters", async () => {
    const catalog = await loadCatalog("ru", { q: "самолёт" });
    expect(catalog.cards).toEqual([]);
    expect(catalog.total).toBe(0);
    expect(catalog.situations).toHaveLength(8);
    expect(catalog.territories).toHaveLength(20);
  });

  it("offers only the providers that work in the chosen territory", async () => {
    const kokshetau = await loadCatalog("ru", { territory: "kokshetau" });
    const burabay = await loadCatalog("ru", { territory: "burabay" });
    expect(kokshetau.organizations.map((org) => org.name)).toContain("Эко Кокшетау");
    expect(burabay.organizations.map((org) => org.name)).not.toContain("Эко Кокшетау");
  });

  it("ignores broken parameters instead of failing", async () => {
    const catalog = await loadCatalog("ru", {
      territory: "mars",
      situation: "party",
      page: "abc",
      q: ["вода", "газ"],
    });
    expect(catalog.params).toEqual({ q: "вода", audience: "resident", page: 1 });
  });

  it("speaks the language of the visitor", async () => {
    const kk = await loadCatalog("kk", {});
    expect(kk.categories[0].name).toBe("Сумен жабдықтау және су бұру");
    expect(kk.situations[0].name).toBe("Есептеу құралдары мен көрсеткіштер");
  });
});
