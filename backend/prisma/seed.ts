import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { territories } from "../../src/features/catalog/data/territories";
import { organizations } from "../../src/features/catalog/data/organizations";
import { categories } from "../../src/features/catalog/data/categories";
import { situations } from "../../src/features/catalog/data/situations";
import { services } from "../../src/features/catalog/data/services";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await db.$transaction(
      async (tx) => {
        for (const row of territories)
          await tx.territory.upsert({ where: { id: row.id }, create: row, update: row });
        for (const row of categories)
          await tx.category.upsert({ where: { id: row.id }, create: row, update: row });
        for (const row of situations)
          await tx.situation.upsert({ where: { id: row.id }, create: row, update: row });
        for (const { territories: area, ...row } of organizations) {
          const data = { ...row, servesAll: area === "all" };
          await tx.organization.upsert({ where: { id: row.id }, create: data, update: data });
          await tx.organizationTerritory.deleteMany({ where: { organizationId: row.id } });
          if (area !== "all")
            await tx.organizationTerritory.createMany({
              data: area.map((territoryId) => ({ organizationId: row.id, territoryId })),
            });
        }
        for (const row of services) {
          const organization = organizations.find((org) => org.id === row.organizationId)!;
          const searchText = [
            row.code,
            ...Object.values(row.title),
            ...Object.values(row.summary),
            ...Object.values(organization.name),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .replaceAll("ё", "е");
          const data = {
            ...row,
            audiences: [...row.audiences],
            fullTitle: row.fullTitle ?? undefined,
            updatedAt: new Date(`${row.updatedAt}T00:00:00Z`),
            searchText,
          };
          await tx.service.upsert({ where: { id: row.id }, create: data, update: data });
        }
      },
      { timeout: 30000 },
    );
    console.log(
      `Seed complete: ${territories.length} territories, ${organizations.length} organizations, ${services.length} services (fictional).`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("Seed failed. Check database and configuration.");
  process.exitCode = 1;
});
