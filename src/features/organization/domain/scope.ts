import type { ContractSector, ProviderInfo } from "@/features/account/domain/availability";
import type { Property } from "@/features/account/domain/property";
import type { Appeal } from "@/features/appeals/domain/appeal";
import type { Payment, PaymentLine } from "@/features/billing/domain/payment";
import type { Sector } from "@/features/catalog/domain/types";
import type { ContractApplication } from "@/features/contracts/domain/contract";
import { sectorOfResource, type Meter } from "@/features/meters/domain/meter";
import type { MeterRequest } from "@/features/meters/domain/meter-request";
import type { Reading } from "@/features/meters/domain/reading";

/** The organization the employee works for: what it does and where (spec 12.1, 12.3). */
export type OrgInfo = {
  id: string;
  name: string;
  sector: Sector;
  territories: "all" | readonly string[];
};

export function orgFromProviders(
  id: string | undefined,
  providers: readonly ProviderInfo[],
): OrgInfo | undefined {
  const found = providers.find((item) => item.id === id);
  return found
    ? { id: found.id, name: found.name, sector: found.sector, territories: found.territories }
    : undefined;
}

const serves = (org: OrgInfo, territoryId: string | undefined): boolean =>
  org.territories === "all" || (territoryId !== undefined && org.territories.includes(territoryId));

/** The utility of a meter or a request fits the organization and the object is in its area. */
function covers(
  org: OrgInfo,
  sector: ContractSector,
  property: Pick<Property, "territoryId"> | undefined,
): boolean {
  return org.sector === sector && serves(org, property?.territoryId);
}

/** Applications for a contract and contracts of this provider only (spec 12.3). */
export const contractsOf = (org: OrgInfo, contracts: readonly ContractApplication[]) =>
  contracts.filter((item) => item.providerId === org.id && item.status !== "draft");

/** Requests for work on meters that this organization carries out. */
export function requestsOf(
  org: OrgInfo,
  requests: readonly MeterRequest[],
  properties: readonly Property[],
): MeterRequest[] {
  return requests.filter((item) =>
    covers(
      org,
      sectorOfResource(item.resource),
      properties.find((property) => property.id === item.propertyId),
    ),
  );
}

/** Readings of the meters this organization reads. */
export function readingsOf(
  org: OrgInfo,
  readings: readonly Reading[],
  meters: readonly Meter[],
  properties: readonly Property[],
): Reading[] {
  return readings.filter((reading) => {
    const meter = meters.find((item) => item.id === reading.meterId);
    return (
      meter !== undefined &&
      covers(
        org,
        sectorOfResource(meter.resource),
        properties.find((property) => property.id === reading.propertyId),
      )
    );
  });
}

export const appealsOf = (org: OrgInfo, appeals: readonly Appeal[]) =>
  appeals.filter((item) => item.organizationId === org.id);

/** The part of each payment that goes to this provider (spec 12.2: "payments, where there is an integration"). */
export function paymentsOf(
  org: OrgInfo,
  payments: readonly Payment[],
): { payment: Payment; lines: PaymentLine[] }[] {
  return payments.flatMap((payment) => {
    const lines = payment.lines.filter((line) => line.providerId === org.id);
    return lines.length > 0 ? [{ payment, lines }] : [];
  });
}
