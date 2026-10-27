import { describe, expect, it } from "vitest";
import { canOfferContract, servicesAtAddress } from "./availability";
import { CONTRACT_SECTORS } from "@/features/catalog/domain/contract-services";
import { loadMissingNetworks, loadProviders } from "../load-providers";

const stateOf = (services: ReturnType<typeof servicesAtAddress>) =>
  Object.fromEntries(services.map((item) => [item.sector, item.state]));

describe("servicesAtAddress with the test providers", () => {
  it("serves every utility in the regional centre, with the city waste company", async () => {
    const providers = await loadProviders("ru");
    const services = servicesAtAddress({ territoryId: "kokshetau", without: [] }, providers);
    expect(services.map((item) => item.sector)).toEqual([...CONTRACT_SECTORS]);
    expect(Object.values(stateOf(services))).toEqual(Array(5).fill("served"));
    const waste = services.find((item) => item.sector === "waste");
    expect(waste?.providers.map((p) => p.id)).toEqual(["kokshetau-eco"]);
  });

  it("gives a district its own waste company instead of the city one", async () => {
    const providers = await loadProviders("ru");
    const waste = servicesAtAddress({ territoryId: "akkol", without: [] }, providers).find(
      (item) => item.sector === "waste",
    );
    expect(waste?.providers.map((p) => p.id)).toEqual(["region-eco"]);
  });

  it("lists both electricity companies, in the language of the visitor", async () => {
    const providers = await loadProviders("kk");
    const electricity = servicesAtAddress(
      { territoryId: "kokshetau", without: [] },
      providers,
    ).find((item) => item.sector === "electricity");
    expect(electricity?.providers).toHaveLength(2);
    expect(electricity?.providers[0].name).toBe("Ақмола электр желілері");
  });

  it("refuses a utility the place has no network for, and offers nothing for it", async () => {
    const providers = await loadProviders("ru");
    const services = servicesAtAddress(
      { territoryId: "atbasar", without: ["gas", "heat"] },
      providers,
    );
    expect(stateOf(services)).toMatchObject({
      gas: "no_network",
      heat: "no_network",
      water: "served",
      electricity: "served",
    });
    const gas = services.find((item) => item.sector === "gas");
    expect(gas?.providers).toEqual([]);
    expect(gas && canOfferContract(gas)).toBe(false);
  });

  it("says the area has no provider when none works there", () => {
    const services = servicesAtAddress({ territoryId: "kokshetau", without: [] }, []);
    expect(Object.values(stateOf(services))).toEqual(Array(5).fill("no_provider"));
    expect(services.some(canOfferContract)).toBe(false);
  });

  it("respects a provider that works only in some territories", () => {
    const providers = [
      { id: "p", name: "P", sector: "gas" as const, territories: ["akkol"] as const },
    ];
    expect(stateOf(servicesAtAddress({ territoryId: "akkol", without: [] }, providers)).gas).toBe(
      "served",
    );
    expect(stateOf(servicesAtAddress({ territoryId: "esil", without: [] }, providers)).gas).toBe(
      "no_provider",
    );
  });
});

describe("loadMissingNetworks", () => {
  it("lists only the places that miss a network", () => {
    const missing = loadMissingNetworks();
    expect(missing["atbasar-marinovka"]).toEqual(["gas", "heat"]);
    expect(missing["kokshetau-abay"]).toBeUndefined();
  });
});
