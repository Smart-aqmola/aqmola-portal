import { servicesAtAddress, type ProviderInfo } from "@/features/account/domain/availability";
import type { Sector } from "@/features/catalog/domain/types";
import type { FeedProvider } from "./repository";

/**
 * The providers an object gets charges from: one for every utility that is served at its address.
 * Where there are several (two sellers of electricity) the first is taken. This is a demo choice:
 * with a backend it follows the contract the person has with a provider (spec 9.1).
 */
export function connectedProviders(
  place: { territoryId: string; without: readonly Sector[] },
  providers: readonly ProviderInfo[],
): FeedProvider[] {
  return servicesAtAddress(place, providers).flatMap((service) =>
    service.state === "served"
      ? [{ id: service.providers[0].id, name: service.providers[0].name, sector: service.sector }]
      : [],
  );
}
