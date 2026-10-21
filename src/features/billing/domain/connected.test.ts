import { describe, expect, it } from "vitest";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { connectedProviders } from "./connected";

const providers: ProviderInfo[] = [
  { id: "water", name: "Водоканал", sector: "water", territories: "all" },
  { id: "gas", name: "Газ", sector: "gas", territories: "all" },
  { id: "sales", name: "Энергосбыт", sector: "electricity", territories: "all" },
  { id: "grid", name: "Электросети", sector: "electricity", territories: "all" },
  { id: "eco", name: "Чистая область", sector: "waste", territories: ["atbasar"] },
];

describe("connectedProviders", () => {
  it("takes the first provider of every utility served at the address", () => {
    const found = connectedProviders({ territoryId: "atbasar", without: [] }, providers);
    expect(found.map((item) => [item.sector, item.id])).toEqual([
      ["electricity", "sales"],
      ["water", "water"],
      ["gas", "gas"],
      ["waste", "eco"],
    ]);
  });

  it("leaves out a network the place does not have and a utility nobody serves there", () => {
    const found = connectedProviders({ territoryId: "kokshetau", without: ["gas"] }, providers);
    expect(found.map((item) => item.sector)).toEqual(["electricity", "water"]);
  });
});
