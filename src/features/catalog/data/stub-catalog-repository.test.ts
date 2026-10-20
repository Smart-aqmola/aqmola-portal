import { describe, expect, it } from "vitest";
import { StubCatalogRepository } from "./stub-catalog-repository";

const repository = new StubCatalogRepository();

describe("StubCatalogRepository", () => {
  it("lists 3 cities and 17 districts", async () => {
    const territories = await repository.listTerritories();
    expect(territories.filter((item) => item.kind === "city")).toHaveLength(3);
    expect(territories.filter((item) => item.kind === "district")).toHaveLength(17);
  });

  it("lists the 8 life situations", async () => {
    expect(await repository.listSituations()).toHaveLength(8);
  });

  it("lists the 10 categories in filter order", async () => {
    const categories = await repository.listCategories();
    expect(categories).toHaveLength(10);
    expect(categories[0].id).toBe("water");
  });

  it("filters services by category", async () => {
    const page = await repository.searchServices({ lang: "ru", categoryId: "heat", pageSize: 100 });
    expect(page.total).toBeGreaterThan(0);
    for (const item of page.items) expect(item.categoryId).toBe("heat");
  });

  it("returns popular services for the home page", async () => {
    const page = await repository.searchServices({ lang: "ru", popular: true, pageSize: 6 });
    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) expect(item.popular).toBe(true);
  });

  it("separates services for residents and for business", async () => {
    const residents = await repository.searchServices({
      lang: "ru",
      audience: "resident",
      pageSize: 100,
    });
    const business = await repository.searchServices({
      lang: "ru",
      audience: "business",
      pageSize: 100,
    });
    expect(residents.items.map((item) => item.slug)).not.toContain("support-measures");
    expect(business.items.map((item) => item.slug)).toContain("support-measures");
    expect(business.items.map((item) => item.slug)).not.toContain("water-meter-sealing");
  });

  it("finds a service by its code", async () => {
    const service = await repository.getService("gas-contract");
    const page = await repository.searchServices({ lang: "ru", q: service!.code });
    expect(page.items.map((item) => item.slug)).toEqual(["gas-contract"]);
  });

  it("counts services per category, adding up to the total", async () => {
    const counts = await repository.countServicesByCategory();
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    expect(total).toBe((await repository.searchServices({ lang: "ru", pageSize: 100 })).total);
    for (const value of Object.values(counts)) expect(value).toBeGreaterThan(0);
  });

  it("returns only organizations that work in the territory", async () => {
    const inKokshetau = (await repository.listOrganizations("kokshetau")).map((org) => org.id);
    const inBurabay = (await repository.listOrganizations("burabay")).map((org) => org.id);
    expect(inKokshetau).toContain("kokshetau-eco");
    expect(inKokshetau).not.toContain("region-eco");
    expect(inBurabay).toContain("region-eco");
    expect(inBurabay).not.toContain("kokshetau-eco");
  });

  it("returns the first page of about 40 services", async () => {
    const page = await repository.searchServices({ lang: "ru" });
    expect(page.total).toBeGreaterThanOrEqual(40);
    expect(page.items).toHaveLength(12);
    expect(page.pageCount).toBe(Math.ceil(page.total / 12));
  });

  it("finds a service by words from its title", async () => {
    const page = await repository.searchServices({ lang: "ru", q: "лицевого счёта" });
    expect(page.items.map((item) => item.slug)).toContain("account-owner-change");
  });

  it("finds services even when the visitor types е instead of ё", async () => {
    const withYo = await repository.searchServices({ lang: "ru", q: "счётчика" });
    const withYe = await repository.searchServices({ lang: "ru", q: "счетчика" });
    expect(withYe.total).toBeGreaterThan(0);
    expect(withYe.items).toEqual(withYo.items);
  });

  it("offers the right waste collection services to the city and to the districts", async () => {
    const kokshetau = await repository.searchServices({
      lang: "ru",
      territoryId: "kokshetau",
      q: "вывоз тбо",
    });
    const burabay = await repository.searchServices({
      lang: "ru",
      territoryId: "burabay",
      q: "вывоз тбо",
    });
    expect(kokshetau.items.map((item) => item.slug)).toContain("waste-contract-kokshetau");
    expect(kokshetau.items.map((item) => item.slug)).not.toContain("waste-contract-region");
    expect(burabay.items.map((item) => item.slug)).toContain("waste-contract-region");
    expect(burabay.items.map((item) => item.slug)).not.toContain("waste-contract-kokshetau");
  });

  it("gets a service by slug or returns null", async () => {
    expect((await repository.getService("gas-contract"))?.situationId).toBe("contracts");
    expect(await repository.getService("no-such-service")).toBeNull();
  });

  it("counts services per situation, adding up to the total", async () => {
    const counts = await repository.countServicesBySituation();
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    expect(total).toBe((await repository.searchServices({ lang: "ru", pageSize: 100 })).total);
    for (const value of Object.values(counts)) expect(value).toBeGreaterThan(0);
  });
});
