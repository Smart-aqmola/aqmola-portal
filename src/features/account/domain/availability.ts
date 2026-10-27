import type { Sector } from "@/features/catalog/domain/types";
import { CONTRACT_SECTORS, type ContractSector } from "@/features/catalog/domain/contract-services";

/** A provider as the cabinet needs it; the names are already in the visitor's language. */
export type ProviderInfo = {
  id: string;
  name: string;
  sector: Sector;
  territories: "all" | readonly string[];
};

/**
 * `served`: at least one provider works at this address. `no_network`: the place has no such
 * network (a village without gas). `no_provider`: the area has no provider for it yet.
 * In the last two the contract must not be offered (spec 1.5).
 */
export type SectorState = "served" | "no_network" | "no_provider";

export type SectorService = {
  sector: ContractSector;
  state: SectorState;
  providers: ProviderInfo[];
};

/** Which providers serve the address, utility by utility (spec 1.4, 3.7). */
export function servicesAtAddress(
  place: { territoryId: string; without: readonly Sector[] },
  providers: readonly ProviderInfo[],
): SectorService[] {
  return CONTRACT_SECTORS.map((sector) => {
    if (place.without.includes(sector)) return { sector, state: "no_network", providers: [] };
    const serving = providers.filter(
      (provider) =>
        provider.sector === sector &&
        (provider.territories === "all" || provider.territories.includes(place.territoryId)),
    );
    return serving.length > 0
      ? { sector, state: "served", providers: serving }
      : { sector, state: "no_provider", providers: [] };
  });
}

/** True when the contract for this utility may be offered at the address (spec 1.5). */
export function canOfferContract(service: Pick<SectorService, "state">): boolean {
  return service.state === "served";
}
