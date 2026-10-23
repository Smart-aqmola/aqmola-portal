import { Injectable } from "@nestjs/common";
import { Database } from "../database";
import { ApiFault } from "../api-errors";
import { Prisma, Role } from "../../generated/prisma/client";
import type { Identity } from "../auth/auth.controller";
import { isEmployee, organizationRoles, managementLock } from "./roles";
import { OrganizationAccessDto, RegistryQuery, UserAccessDto } from "./security.dto";

const userSelect = {
  id: true,
  iin: true,
  phone: true,
  firstName: true,
  lastName: true,
  middleName: true,
  roles: true,
  organizationId: true,
  blocked: true,
  version: true,
  createdAt: true,
} as const;
type AccessUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;
const userView = (user: AccessUser) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  ...(user.middleName ? { middleName: user.middleName } : {}),
  iin: "••••••••••••",
  phone: `+7 ${user.phone.slice(2, 5)} ••• •• ${user.phone.slice(-2)}`,
  roles: user.roles,
  ...(user.organizationId ? { organizationId: user.organizationId } : {}),
  status: user.blocked ? "blocked" : "active",
  version: user.version,
  createdAt: user.createdAt,
});
const accessSnapshot = (user: AccessUser) => ({
  roles: user.roles,
  organizationId: user.organizationId,
  status: user.blocked ? "blocked" : "active",
});

@Injectable()
export class SecurityService {
  constructor(private readonly db: Database) {}

  async staff(identity: Identity, query: RegistryQuery) {
    if (!identity.user.roles.includes(Role.organization_admin))
      throw new ApiFault(403, "forbidden");
    const organization = await this.ownOrganization(identity);
    return this.users(query, organization.id);
  }

  async users(query: RegistryQuery, organizationId?: string) {
    const where: Prisma.UserWhereInput = organizationId
      ? {
          organizationId,
          roles: { hasSome: [...organizationRoles] },
          organization: { blocked: false },
        }
      : {};
    const [total, rows] = await this.db.$transaction(
      [
        this.db.user.count({ where }),
        this.db.user.findMany({
          where,
          select: userSelect,
          orderBy: { id: "asc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return {
      items: rows.map(userView),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: Math.ceil(total / query.pageSize),
    };
  }

  async organizations(query: RegistryQuery) {
    const [total, rows] = await this.db.$transaction(
      [
        this.db.organization.count(),
        this.db.organization.findMany({
          include: { territories: true },
          orderBy: { id: "asc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return {
      items: rows.map(({ servesAll, territories, ...row }) => ({
        ...row,
        territories: servesAll ? "all" : territories.map((territory) => territory.territoryId),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: Math.ceil(total / query.pageSize),
    };
  }

  async ownOrganization(identity: Identity) {
    const id = identity.user.organizationId;
    if (!id || !isEmployee(identity.user.roles)) throw new ApiFault(403, "forbidden");
    const row = await this.db.organization.findUnique({
      where: { id, blocked: false },
      include: { territories: true },
    });
    if (!row) throw new ApiFault(403, "forbidden");
    const { servesAll, territories, ...organization } = row;
    return {
      ...organization,
      territories: servesAll ? "all" : territories.map((area) => area.territoryId),
    };
  }

  private async mutate<T>(actor: Identity, work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      // Serializes demotions/blocks and prevents two administrators removing each other's final access.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${managementLock}, 0))::text`;
      const current = await tx.user.findUnique({ where: { id: actor.user.id } });
      const session = await tx.session.findUnique({ where: { id: actor.sessionId } });
      if (
        !current ||
        current.blocked ||
        !current.roles.includes(Role.system_admin) ||
        !session ||
        session.userId !== current.id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      ) {
        throw new ApiFault(403, "forbidden");
      }
      return work(tx);
    });
  }

  async updateUser(actor: Identity, id: string, input: UserAccessDto) {
    if (
      input.roles === undefined &&
      input.status === undefined &&
      input.organizationId === undefined
    )
      throw new ApiFault(400, "validation_error");
    return this.mutate(actor, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
      const before = await tx.user.findUnique({ where: { id }, select: userSelect });
      if (!before) throw new ApiFault(404, "not_found");
      if (before.version !== input.version) throw new ApiFault(409, "stale");
      const roles = input.roles ?? before.roles;
      const organizationId =
        input.organizationId === undefined ? before.organizationId : input.organizationId;
      const blocked = input.status === undefined ? before.blocked : input.status === "blocked";
      if (
        (isEmployee(roles) && !organizationId) ||
        (!isEmployee(roles) && organizationId) ||
        (roles.includes(Role.system_admin) && (isEmployee(roles) || organizationId))
      ) {
        throw new ApiFault(400, "validation_error", { organizationId: "format", roles: "format" });
      }
      if (
        organizationId &&
        !(await tx.organization.findUnique({ where: { id: organizationId } }))
      ) {
        throw new ApiFault(400, "validation_error", { organizationId: "format" });
      }
      if (
        !before.blocked &&
        before.roles.includes(Role.system_admin) &&
        (blocked || !roles.includes(Role.system_admin))
      ) {
        const remaining = await tx.user.count({
          where: { blocked: false, roles: { has: Role.system_admin } },
        });
        if (remaining <= 1) throw new ApiFault(403, "forbidden");
      }
      const user = await tx.user.update({
        where: { id },
        data: { roles, organizationId, blocked, version: { increment: 1 } },
        select: userSelect,
      });
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditEntry.create({
        data: {
          userId: actor.user.id,
          action: "access_updated",
          entityType: "user",
          entityId: id,
          before: accessSnapshot(before),
          after: accessSnapshot(user),
        },
      });
      return userView(user);
    });
  }

  async updateOrganization(actor: Identity, id: string, input: OrganizationAccessDto) {
    return this.mutate(actor, async (tx) => {
      const before = await tx.organization.findUnique({ where: { id } });
      if (!before) throw new ApiFault(404, "not_found");
      if (before.version !== input.version) throw new ApiFault(409, "stale");
      const updated = await tx.organization.update({
        where: { id },
        data: { blocked: input.blocked, version: { increment: 1 } },
      });
      if (input.blocked)
        await tx.session.updateMany({
          where: { user: { organizationId: id }, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await tx.auditEntry.create({
        data: {
          userId: actor.user.id,
          action: "access_updated",
          entityType: "organization",
          entityId: id,
          before: { blocked: before.blocked },
          after: { blocked: updated.blocked },
        },
      });
      return {
        id: updated.id,
        name: updated.name,
        blocked: updated.blocked,
        version: updated.version,
      };
    });
  }
}
