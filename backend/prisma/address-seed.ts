import { PrismaClient } from "../generated/prisma/client";
import { addresses } from "./data/addresses";
import { normalizeAddress } from "../src/addresses/normalize";

export async function seedAddresses(db: PrismaClient) {
  await db.$transaction(
    async (tx) => {
      for (const row of addresses) {
        const territory = await tx.territory.findUniqueOrThrow({ where: { id: row.territoryId } });
        const searchText = normalizeAddress(
          [
            row.id,
            ...Object.values(territory.name as Record<string, string>),
            ...Object.values(row.locality),
            ...Object.values(row.street),
          ].join(" "),
        );
        const data = {
          id: row.id,
          territoryId: row.territoryId,
          locality: row.locality,
          street: row.street,
          without: "without" in row ? [...row.without] : [],
          searchText,
        };
        await tx.address.upsert({ where: { id: row.id }, create: data, update: data });
      }
    },
    { timeout: 30000 },
  );
  return addresses.length;
}
