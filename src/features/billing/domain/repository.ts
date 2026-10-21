import type { ContractSector } from "@/features/account/domain/availability";
import type { Charge } from "./charge";

/** The providers of an object as the billing needs them (the names are in the visitor's language). */
export type FeedProvider = { id: string; name: string; sector: ContractSector };

/**
 * Where charges come from. The stub makes test amounts; with a backend the same interface reads
 * what the providers sent through the integration (spec 9.6).
 */
export interface ChargeRepository {
  listForProperty(input: {
    propertyId: string;
    providers: readonly FeedProvider[];
    now: Date;
  }): Charge[];
}
