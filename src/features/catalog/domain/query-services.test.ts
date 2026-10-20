import { describe, expect, it } from "vitest";
import {
  countByCategory,
  countBySituation,
  organizationServes,
  queryServices,
  type CatalogData,
} from "./query-services";
import type { Organization, Service } from "./types";

const water: Organization = {
  id: "water",
  name: { ru: "Водоканал Кокшетау", kk: "Көкшетау су арнасы" },
  sector: "water",
  territories: ["kokshetau"],
};
const power: Organization = {
  id: "power",
  name: { ru: "Электросети области" },
  sector: "electricity",
  territories: "all",
};

function service(overrides: Partial<Service> & Pick<Service, "id" | "code">): Service {
  return {
    slug: overrides.id,
    situationId: "meters",
    categoryId: "water",
    organizationId: "water",
    audiences: ["resident"],
    title: { ru: overrides.id },
    summary: { ru: "" },
    free: true,
    workingDays: 3,
    channel: "online",
    popular: false,
    isNew: false,
    updatedAt: "2026-10-15",
    ...overrides,
  };
}

const data: CatalogData = {
  territories: [
    { id: "kokshetau", kind: "city", name: { ru: "Кокшетау" } },
    { id: "burabay", kind: "district", name: { ru: "Бурабайский район" } },
  ],
  organizations: [water, power],
  services: [
    service({
      id: "water-readings",
      code: "1001",
      popular: true,
      title: { ru: "Передача показаний воды", kk: "Су көрсеткіштерін беру" },
      summary: { ru: "Передайте показания счётчика онлайн" },
    }),
    service({
      id: "power-readings",
      code: "1002",
      categoryId: "electricity",
      organizationId: "power",
      title: { ru: "Показания электросчётчика" },
      summary: { ru: "Передача показаний за свет" },
    }),
    service({
      id: "water-connection",
      code: "1003",
      situationId: "connection",
      popular: true,
      isNew: true,
      title: { ru: "Подключение к воде" },
      summary: { ru: "Технические условия" },
      audiences: ["resident", "business"],
    }),
    service({
      id: "business-contract",
      code: "1004",
      situationId: "contracts",
      categoryId: "electricity",
      organizationId: "power",
      audiences: ["business"],
      title: { ru: "Договор электроснабжения для юрлиц" },
    }),
  ],
};

const ids = (query: Parameters<typeof queryServices>[1]) =>
  queryServices(data, query).items.map((item) => item.id);

describe("organizationServes", () => {
  it("serves any territory when it works across the region", () => {
    expect(organizationServes(power, "burabay")).toBe(true);
  });

  it("serves only the listed territories otherwise", () => {
    expect(organizationServes(water, "kokshetau")).toBe(true);
    expect(organizationServes(water, "burabay")).toBe(false);
  });
});

describe("queryServices", () => {
  it("returns everything without filters", () => {
    expect(ids({ lang: "ru" })).toHaveLength(4);
  });

  it("filters by life situation", () => {
    expect(ids({ lang: "ru", situationId: "connection" })).toEqual(["water-connection"]);
  });

  it("filters by category", () => {
    expect(ids({ lang: "ru", categoryId: "water" })).toEqual([
      "water-readings",
      "water-connection",
    ]);
    expect(ids({ lang: "ru", categoryId: "electricity" })).toEqual([
      "power-readings",
      "business-contract",
    ]);
    expect(ids({ lang: "ru", categoryId: "gas" })).toEqual([]);
  });

  it("filters by audience", () => {
    expect(ids({ lang: "ru", audience: "business" })).toEqual([
      "water-connection",
      "business-contract",
    ]);
    expect(ids({ lang: "ru", audience: "resident" })).toEqual([
      "water-readings",
      "power-readings",
      "water-connection",
    ]);
  });

  it("filters by organization", () => {
    expect(ids({ lang: "ru", organizationId: "power" })).toEqual([
      "power-readings",
      "business-contract",
    ]);
  });

  it("can list popular services first, keeping the data order inside each group", () => {
    expect(ids({ lang: "ru", sort: "popular" })).toEqual([
      "water-readings",
      "water-connection",
      "power-readings",
      "business-contract",
    ]);
  });

  it("keeps the better text match first even when sorting by popularity", () => {
    // "показаний": title match (water-readings, popular) still beats summary match (power-readings).
    expect(ids({ lang: "ru", q: "показаний", sort: "popular" })).toEqual([
      "water-readings",
      "power-readings",
    ]);
  });

  it("returns only popular services when asked", () => {
    expect(ids({ lang: "ru", popular: true })).toEqual(["water-readings", "water-connection"]);
  });

  it("shows only services available in the territory", () => {
    expect(ids({ lang: "ru", territoryId: "burabay" })).toEqual([
      "power-readings",
      "business-contract",
    ]);
    expect(ids({ lang: "ru", territoryId: "kokshetau" })).toHaveLength(4);
  });

  it("combines filters", () => {
    expect(
      ids({ lang: "ru", territoryId: "burabay", audience: "resident", q: "показания" }),
    ).toEqual(["power-readings"]);
    expect(ids({ lang: "ru", territoryId: "burabay", popular: true })).toEqual([]);
  });

  it("searches title, summary and organization name", () => {
    expect(ids({ lang: "ru", q: "водоканал" })).toEqual(["water-readings", "water-connection"]);
    expect(ids({ lang: "ru", q: "технические условия" })).toEqual(["water-connection"]);
  });

  it("finds a service by its code", () => {
    expect(ids({ lang: "ru", q: "1002" })).toEqual(["power-readings"]);
    expect(ids({ lang: "ru", q: " 1004 " })).toEqual(["business-contract"]);
    expect(ids({ lang: "ru", q: "9999" })).toEqual([]);
  });

  it("puts title matches before other matches", () => {
    // "показаний" is in the title of water-readings and only in the summary of power-readings.
    expect(ids({ lang: "ru", q: "показаний" })).toEqual(["water-readings", "power-readings"]);
  });

  it("searches in the language of the visitor, falling back to Russian", () => {
    expect(ids({ lang: "kk", q: "көрсеткіш" })).toEqual(["water-readings"]);
    expect(ids({ lang: "kk", q: "подключение" })).toEqual(["water-connection"]);
  });

  it("returns nothing when no service matches", () => {
    const page = queryServices(data, { lang: "ru", q: "самолёт" });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.pageCount).toBe(1);
  });

  it("paginates the results", () => {
    const page = queryServices(data, { lang: "ru", pageSize: 3, page: 2 });
    expect(page.items.map((item) => item.id)).toEqual(["business-contract"]);
    expect(page).toMatchObject({ total: 4, page: 2, pageCount: 2 });
  });
});

describe("countBySituation", () => {
  it("counts services per life situation", () => {
    expect(countBySituation(data)).toMatchObject({
      meters: 2,
      connection: 1,
      contracts: 1,
      heating: 0,
    });
  });

  it("counts only what is available in the territory", () => {
    expect(countBySituation(data, "burabay")).toMatchObject({
      meters: 1,
      connection: 0,
      contracts: 1,
    });
  });
});

describe("countByCategory", () => {
  it("counts services per category, with zero for empty ones", () => {
    expect(countByCategory(data)).toMatchObject({ water: 2, electricity: 2, gas: 0 });
  });

  it("counts only what is available in the territory", () => {
    expect(countByCategory(data, "burabay")).toMatchObject({ water: 0, electricity: 2 });
  });
});
