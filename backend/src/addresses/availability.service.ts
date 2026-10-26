import { Injectable } from "@nestjs/common";
import { Prisma, Property } from "../../generated/prisma/client";
import { Database } from "../database";
import { ApiFault } from "../api-errors";
import { localized } from "./address.service";
import { normalizeAddress } from "./normalize";

export const contractSectors = ["electricity", "water", "heat", "gas", "waste"] as const;

@Injectable()
export class AvailabilityService {
  constructor(private readonly db: Database) {}
  private async resolve(tx: Prisma.TransactionClient, property: Property) {
    const rows = await tx.address.findMany({
      where: {
        territoryId: property.territoryId,
        ...(property.addressId ? { id: property.addressId } : {}),
      },
    });
    const matches = rows.filter(
      (row) =>
        ["ru", "kk"].some(
          (lang) =>
            normalizeAddress(localized(row.locality, lang)) === normalizeAddress(property.locality),
        ) &&
        ["ru", "kk"].some(
          (lang) =>
            normalizeAddress(localized(row.street, lang)) === normalizeAddress(property.street),
        ),
    );
    if (matches.length !== 1) throw new ApiFault(422, "not_serviced");
    return matches[0];
  }
  async evaluate(tx: Prisma.TransactionClient, ownerId: string, id: string, lang: string) {
    const property = await tx.property.findFirst({ where: { id, ownerId } });
    if (!property) throw new ApiFault(404, "not_found");
    if ((property.verification as { status?: string }).status !== "confirmed")
      throw new ApiFault(403, "forbidden");
    const address = await this.resolve(tx, property);
    const organizations = await tx.organization.findMany({
      where: {
        blocked: false,
        sector: { in: [...contractSectors] },
        OR: [{ servesAll: true }, { territories: { some: { territoryId: property.territoryId } } }],
      },
      include: { territories: true },
      orderBy: { id: "asc" },
    });
    return contractSectors.map((sector) => {
      if (address.without.includes(sector))
        return { sector, state: "no_network" as const, providers: [] };
      const providers = organizations
        .filter((org) => org.sector === sector)
        .map((org) => ({
          id: org.id,
          name: localized(org.name, lang),
          sector: org.sector,
          territories: org.servesAll
            ? ("all" as const)
            : org.territories.map((t) => t.territoryId).sort(),
        }));
      return {
        sector,
        state: providers.length ? ("served" as const) : ("no_provider" as const),
        providers,
      };
    });
  }
  async services(ownerId: string, id: string, lang: string) {
    return this.db.$transaction((tx) => this.evaluate(tx, ownerId, id, lang), {
      isolationLevel: "RepeatableRead",
    });
  }
  /** Must be repeated by future application submission in its own write transaction. */
  async service(ownerId: string, id: string, code: string, lang: string) {
    return this.db.$transaction(
      async (tx) => {
        const availability = await this.evaluate(tx, ownerId, id, lang);
        const row = await tx.service.findUnique({ where: { code } });
        if (!row) throw new ApiFault(404, "service_not_found");
        if (
          !availability.some(
            (item) =>
              item.state === "served" && item.providers.some((p) => p.id === row.organizationId),
          )
        )
          throw new ApiFault(422, "not_serviced");
        const { searchText: _searchText, ...data } = row;
        return {
          ...data,
          fullTitle: row.fullTitle ?? undefined,
          updatedAt: row.updatedAt.toISOString().slice(0, 10),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
}
