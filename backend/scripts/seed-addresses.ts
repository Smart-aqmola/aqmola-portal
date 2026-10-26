import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { seedAddresses } from "../prisma/address-seed";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    console.log(`Seeded ${await seedAddresses(db)} fictional street addresses.`);
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("Address seed failed; check territories and configuration.");
  process.exitCode = 1;
});
