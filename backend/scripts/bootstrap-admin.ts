import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../generated/prisma/client";
import { isEmployee, managementLock } from "../src/security/roles";

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length !== 2 ||
    args[0] !== "--user-id" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(args[1])
  ) {
    throw new Error("Usage: pnpm admin:bootstrap --user-id <registered-user-uuid>");
  }
  if (!process.env.DATABASE_URL || process.env.NODE_ENV !== "development")
    throw new Error("Local development configuration is required");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${managementLock}, 0))::text`;
      if (await tx.user.count({ where: { blocked: false, roles: { has: Role.system_admin } } })) {
        throw new Error("An active system administrator already exists; use the protected API");
      }
      const user = await tx.user.findUnique({ where: { id: args[1] } });
      if (!user || user.blocked || user.organizationId || isEmployee(user.roles))
        throw new Error("An active registered user without staff access is required");
      const roles = [...new Set([...user.roles, Role.system_admin])];
      await tx.user.update({ where: { id: user.id }, data: { roles, version: { increment: 1 } } });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditEntry.create({
        data: {
          userId: user.id,
          action: "bootstrap_system_admin",
          entityType: "user",
          entityId: user.id,
          before: { roles: user.roles },
          after: { roles },
        },
      });
    });
    console.log(
      "First local system administrator assigned. Sign in again to obtain a new session.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error: unknown) => {
  // Only operational messages authored above are printed, never database connection details.
  const allowed = ["Usage:", "Local development", "An active"];
  const message =
    error instanceof Error && allowed.some((prefix) => error.message.startsWith(prefix))
      ? error.message
      : "Administrator bootstrap failed; check local configuration";
  console.error(message);
  process.exitCode = 1;
});
