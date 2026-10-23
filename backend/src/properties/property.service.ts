import { Injectable } from "@nestjs/common";
import { Property, PropertyRelation, PropertyType } from "../../generated/prisma/client";
import { Database } from "../database";
import { ApiFault } from "../api-errors";
import { PropertyInputDto, UpdatePropertyDto } from "./property.dto";

const unverified = { status: "unverified", documents: [] };
function view(row: Property) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    territoryId: row.territoryId,
    locality: row.locality,
    street: row.street,
    house: row.house,
    ...(row.flat ? { flat: row.flat } : {}),
    type: row.type,
    relation: row.relation,
    ...(row.personalAccount ? { personalAccount: row.personalAccount } : {}),
    ownerInfo: row.ownerInfo,
    ...(row.addressId ? { addressId: row.addressId } : {}),
    verification: row.verification,
    version: row.version,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PropertyService {
  constructor(private readonly db: Database) {}

  private async normalize(input: PropertyInputDto) {
    const fields: Record<string, string> = {};
    const text = (key: "locality" | "street" | "ownerInfo", max: number) => {
      const value = input[key].trim();
      if (!value) fields[key] = "required";
      else if (value.length > max) fields[key] = "long";
      return value;
    };
    const number = (key: "house" | "flat", optional: boolean) => {
      const value = (input[key] ?? "").trim();
      if (!value) {
        if (!optional) fields[key] = "required";
      } else if (value.length > 10) fields[key] = "long";
      else if (!/^[\p{L}\d][\p{L}\d\s/-]*$/u.test(value)) fields[key] = "format";
      return value || null;
    };
    if (
      !input.territoryId ||
      input.territoryId.length > 60 ||
      !(await this.db.territory.findUnique({
        where: { id: input.territoryId },
        select: { id: true },
      }))
    )
      fields.territoryId = "required";
    if (!Object.values(PropertyType).includes(input.type as PropertyType)) fields.type = "required";
    if (!Object.values(PropertyRelation).includes(input.relation as PropertyRelation))
      fields.relation = "required";
    const personalAccount = (input.personalAccount ?? "").replace(/\s/g, "");
    if (personalAccount && !/^\d{6,12}$/.test(personalAccount)) fields.personalAccount = "format";
    const addressId = input.addressId?.trim() || null;
    if (addressId && (addressId.length > 100 || !/^[a-zA-Z0-9-]+$/.test(addressId)))
      fields.addressId = "format";
    const data = {
      territoryId: input.territoryId,
      locality: text("locality", 80),
      street: text("street", 80),
      house: number("house", false)!,
      flat: number("flat", input.type !== "apartment"),
      type: input.type as PropertyType,
      relation: input.relation as PropertyRelation,
      personalAccount: personalAccount || null,
      ownerInfo: text("ownerInfo", 120),
      addressId,
    };
    if (Object.keys(fields).length) throw new ApiFault(400, "validation_error", fields);
    return data;
  }

  async list(ownerId: string) {
    return (
      await this.db.property.findMany({
        where: { ownerId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      })
    ).map(view);
  }
  async get(ownerId: string, id: string) {
    const row = await this.db.property.findFirst({ where: { id, ownerId } });
    if (!row) throw new ApiFault(404, "not_found");
    return view(row);
  }
  async create(ownerId: string, input: PropertyInputDto) {
    const data = await this.normalize(input);
    return this.db.$transaction(async (tx) => {
      // Serialize additions per account so concurrent requests cannot exceed the frontend's limit.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${ownerId} FOR UPDATE`;
      if ((await tx.property.count({ where: { ownerId } })) >= 30)
        throw new ApiFault(400, "bad_request");
      const row = await tx.property.create({
        data: { ...data, ownerId, verification: unverified },
      });
      await tx.auditEntry.create({
        data: {
          userId: ownerId,
          action: "created",
          entityType: "property",
          entityId: row.id,
          before: {},
          after: { version: row.version, verification: "unverified" },
        },
      });
      return view(row);
    });
  }
  async update(ownerId: string, id: string, input: UpdatePropertyDto) {
    // Check ownership before validating submitted data, using the same response for absent and foreign objects.
    await this.get(ownerId, id);
    const data = await this.normalize(input);
    return this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Property[]
      >`SELECT * FROM "Property" WHERE "id" = ${id} AND "ownerId" = ${ownerId} FOR UPDATE`;
      const previous = rows[0];
      if (!previous) throw new ApiFault(404, "not_found");
      if (previous.version !== input.version) throw new ApiFault(409, "stale");
      const row = await tx.property.update({
        where: { id },
        data: { ...data, verification: unverified, version: { increment: 1 } },
      });
      const changed = Object.keys(data).filter(
        (key) => previous[key as keyof Property] !== data[key as keyof typeof data],
      );
      await tx.auditEntry.create({
        data: {
          userId: ownerId,
          action: "updated",
          entityType: "property",
          entityId: id,
          before: { version: previous.version, verification: previous.verification },
          after: { version: row.version, verification: unverified, fields: changed },
        },
      });
      return view(row);
    });
  }
}
