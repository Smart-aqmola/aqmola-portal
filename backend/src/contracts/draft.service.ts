import { Injectable } from "@nestjs/common";
import { ContractApplication, Prisma, User } from "../../generated/prisma/client";
import { Database } from "../database";
import { ApiFault } from "../api-errors";
import type { Identity } from "../auth/auth.controller";
import { AvailabilityService } from "../addresses/availability.service";
import { localized } from "../addresses/address.service";
import { normalizeAddress } from "../addresses/normalize";
import { managementLock } from "../security/roles";
import { RegistryQuery } from "../security/security.dto";
import { CreateDraftDto, SaveDraftDto } from "./draft.dto";

// Exact pairs from frontend contracts/domain/contract-services.ts; no guessed service aliases.
const targets = [
  {
    slug: "electricity-contract-resident",
    sector: "electricity",
    providerId: "akmola-energy-sales",
  },
  { slug: "water-contract-resident", sector: "water", providerId: "akmola-water" },
  { slug: "heat-contract", sector: "heat", providerId: "akmola-heat" },
  { slug: "gas-contract", sector: "gas", providerId: "akmola-gas" },
  { slug: "waste-contract-kokshetau", sector: "waste", providerId: "kokshetau-eco" },
  { slug: "waste-contract-region", sector: "waste", providerId: "region-eco" },
] as const;

type DraftPayload = {
  sector: string;
  serviceSlug: string;
  serviceTitle: string;
  providerName: string;
  address: string;
  propertyType: string;
  basis: string;
  applicant: {
    lastName: string;
    firstName: string;
    middleName: string;
    iin: string;
    phone: string;
    email: string;
  };
  rightSince: string;
  personalAccount: string;
  previousContract: string;
  meter: { has: boolean; serial: string; reading: string };
  notifyBy: string;
  attachments: never[];
  consents: { personalData: boolean; terms: boolean };
};
type StoredDraft = { payload: DraftPayload; updatedAt: string };
const masked = (iin: string) =>
  /^\d{12}$/.test(iin)
    ? `${iin.slice(0, 6)}••••${iin.slice(-2)}`
    : /^\d{6}••••\d{2}$/.test(iin)
      ? iin
      : "••••••••••••";
const defined = <T extends object>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
function view(row: ContractApplication) {
  const { payload } = row.draft as unknown as StoredDraft;
  return {
    ...payload,
    applicant: { ...payload.applicant, iin: masked(payload.applicant.iin) },
    id: row.id,
    ownerId: row.ownerId,
    propertyId: row.propertyId,
    serviceId: row.serviceId,
    providerId: row.providerId,
    status: row.status,
    signatures: {},
    history: [{ status: "draft", at: row.createdAt.toISOString(), actor: "applicant" }],
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
@Injectable()
export class DraftService {
  constructor(
    private readonly db: Database,
    private readonly availability: AvailabilityService,
  ) {}

  private async mutate<T>(
    identity: Identity,
    work: (tx: Prisma.TransactionClient, user: User) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${managementLock}, 0))::text`;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${identity.user.id} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: identity.user.id } });
      const session = await tx.session.findUnique({ where: { id: identity.sessionId } });
      if (
        !user ||
        user.blocked ||
        !session ||
        session.userId !== user.id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        throw new ApiFault(403, "forbidden");
      return work(tx, user);
    });
  }
  async create(identity: Identity, input: CreateDraftDto) {
    return this.mutate(identity, async (tx, user) => {
      await tx.$queryRaw`SELECT "id" FROM "Property" WHERE "id" = ${input.propertyId} AND "ownerId" = ${user.id} FOR UPDATE`;
      const available = await this.availability.evaluate(tx, user.id, input.propertyId, input.lang);
      const target = targets.find((item) => item.slug === input.serviceSlug);
      const service = await tx.service.findUnique({
        where: { slug: input.serviceSlug },
        include: { organization: true },
      });
      if (!service) throw new ApiFault(404, "service_not_found");
      if (
        !target ||
        service.organizationId !== target.providerId ||
        service.organization.sector !== target.sector ||
        !available.some(
          (item) =>
            item.sector === target.sector &&
            item.state === "served" &&
            item.providers.some((p) => p.id === target.providerId),
        )
      )
        throw new ApiFault(422, "not_serviced");
      if ((await tx.contractApplication.count({ where: { ownerId: user.id } })) >= 60)
        throw new ApiFault(400, "bad_request");
      const property = await tx.property.findUniqueOrThrow({
        where: { id: input.propertyId },
        include: { territory: true },
      });
      const territory = localized(property.territory.name, input.lang);
      const place =
        normalizeAddress(territory) === normalizeAddress(property.locality)
          ? property.locality
          : `${territory}, ${property.locality}`;
      const now = new Date();
      const payload: DraftPayload = {
        sector: target.sector,
        serviceSlug: service.slug,
        serviceTitle: localized(service.title, input.lang),
        providerName: localized(service.organization.name, input.lang),
        address: [place, property.street, property.house, property.flat].filter(Boolean).join(", "),
        propertyType: property.type,
        basis: property.relation,
        applicant: {
          lastName: user.lastName,
          firstName: user.firstName,
          middleName: user.middleName ?? "",
          iin: masked(user.iin),
          phone: user.phone,
          email: user.email ?? "",
        },
        rightSince: "",
        personalAccount: property.personalAccount ?? "",
        previousContract: "",
        meter: { has: false, serial: "", reading: "" },
        notifyBy: "cabinet",
        attachments: [],
        consents: { personalData: false, terms: false },
      };
      const row = await tx.contractApplication.create({
        data: {
          ownerId: user.id,
          propertyId: property.id,
          serviceId: service.id,
          providerId: service.organizationId,
          status: "draft",
          draft: { payload, updatedAt: now.toISOString() },
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.auditEntry.create({
        data: {
          userId: user.id,
          action: "draft_created",
          entityType: "contract_application",
          entityId: row.id,
          before: {},
          after: { status: "draft", version: 1 },
        },
      });
      return view(row);
    });
  }
  async list(ownerId: string, query: RegistryQuery) {
    const where = { ownerId, status: "draft" as const };
    const [total, rows] = await this.db.$transaction(
      [
        this.db.contractApplication.count({ where }),
        this.db.contractApplication.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return { items: rows.map(view), total, page: query.page, pageSize: query.pageSize };
  }
  async get(ownerId: string, id: string) {
    const row = await this.db.contractApplication.findFirst({
      where: { id, ownerId, status: "draft" },
    });
    if (!row) throw new ApiFault(404, "not_found");
    return view(row);
  }
  async save(identity: Identity, id: string, input: SaveDraftDto) {
    await this.get(identity.user.id, id);
    const changes = Object.entries(input).filter(
      ([key, v]) =>
        key !== "version" &&
        v !== undefined &&
        (v === null ||
          typeof v !== "object" ||
          Array.isArray(v) ||
          Object.values(v).some((x) => x !== undefined)),
    );
    if (!changes.length) throw new ApiFault(400, "validation_error");
    return this.mutate(identity, async (tx, user) => {
      const rows = await tx.$queryRaw<
        ContractApplication[]
      >`SELECT * FROM "ContractApplication" WHERE "id" = ${id} AND "ownerId" = ${user.id} FOR UPDATE`;
      const row = rows[0];
      if (!row) throw new ApiFault(404, "not_found");
      if (row.status !== "draft") throw new ApiFault(403, "forbidden");
      if (row.version !== input.version) throw new ApiFault(409, "stale");
      const stored = row.draft as unknown as StoredDraft;
      const old = stored.payload;
      if (
        input.applicant?.iin !== undefined &&
        input.applicant.iin !== masked(user.iin) &&
        input.applicant.iin !== user.iin
      )
        throw new ApiFault(400, "validation_error", { "applicant.iin": "format" });
      const payload: DraftPayload = {
        ...old,
        applicant: { ...old.applicant, ...defined(input.applicant ?? {}), iin: masked(user.iin) },
        rightSince: input.rightSince ?? old.rightSince,
        personalAccount: input.personalAccount ?? old.personalAccount,
        previousContract: input.previousContract ?? old.previousContract,
        meter: { ...old.meter, ...defined(input.meter ?? {}) },
        notifyBy: input.notifyBy ?? old.notifyBy,
        consents: { ...old.consents, ...defined(input.consents ?? {}) },
        attachments: [],
      };
      const now = new Date();
      const updated = await tx.contractApplication.update({
        where: { id },
        data: {
          draft: { payload, updatedAt: now.toISOString() },
          version: { increment: 1 },
          updatedAt: now,
        },
      });
      await tx.auditEntry.create({
        data: {
          userId: user.id,
          action: "draft_saved",
          entityType: "contract_application",
          entityId: id,
          before: { status: "draft", version: row.version },
          after: { status: "draft", version: updated.version, fields: changes.map(([key]) => key) },
        },
      });
      return view(updated);
    });
  }
}
