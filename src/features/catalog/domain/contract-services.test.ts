import { describe, expect, it } from "vitest";
import { getCatalogRepository } from "@/features/catalog/data";
import {
  CONTRACT_SERVICES,
  contractServiceBySlug,
  orderPath,
  serviceSlugFor,
} from "./contract-services";

describe("CONTRACT_SERVICES", () => {
  it("points only at services of the catalog, of the same provider and field", async () => {
    const catalog = getCatalogRepository();
    const organizations = await catalog.listOrganizations();
    for (const item of CONTRACT_SERVICES) {
      const service = await catalog.getService(item.slug);
      expect(service, item.slug).not.toBeNull();
      expect(service?.organizationId, item.slug).toBe(item.providerId);
      const organization = organizations.find((org) => org.id === item.providerId);
      expect(organization?.sector, item.slug).toBe(item.sector);
      expect(service?.audiences, item.slug).toContain("resident");
    }
  });

  it("covers every utility of a household", () => {
    expect(new Set(CONTRACT_SERVICES.map((item) => item.sector))).toEqual(
      new Set(["electricity", "water", "heat", "gas", "waste"]),
    );
  });
});

describe("orderPath", () => {
  it("sends a contract to the wizard and anything else to the plain application", () => {
    expect(orderPath("ru", "gas-contract")).toBe("/ru/contracts/new?service=gas-contract");
    expect(orderPath("kk", "water-meter-readings")).toBe("/kk/services/water-meter-readings/apply");
    expect(orderPath("ru", "electricity-contract-business")).toBe(
      "/ru/services/electricity-contract-business/apply",
    );
  });
});

describe("serviceSlugFor", () => {
  it("finds the exact service of a provider, and falls back to the first of the utility", () => {
    expect(serviceSlugFor("waste", "region-eco")).toBe("waste-contract-region");
    expect(serviceSlugFor("waste", "kokshetau-eco")).toBe("waste-contract-kokshetau");
    expect(serviceSlugFor("electricity", "akmola-grid")).toBe("electricity-contract-resident");
    expect(contractServiceBySlug("heat-contract")?.sector).toBe("heat");
    expect(contractServiceBySlug("nope")).toBeUndefined();
  });
});
