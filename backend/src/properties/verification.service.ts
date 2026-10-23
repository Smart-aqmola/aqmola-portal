import { Injectable, StreamableFile } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Attachment, Prisma, Property, Role } from "../../generated/prisma/client";
import { Database } from "../database";
import { ApiFault } from "../api-errors";
import type { Identity } from "../auth/auth.controller";
import { managementLock } from "../security/roles";
import { RegistryQuery } from "../security/security.dto";
import { propertyView } from "./property.service";
import { inspectDocument, MAX_DOCUMENTS, UploadedDocument } from "./document-format";
import { VerificationDecisionDto, VerificationRequestDto } from "./verification.dto";

type Verification = { status: string; documents: { id: string }[] };
const verification = (row: Property) => row.verification as unknown as Verification;
const attachmentView = (row: Attachment) => ({
  id: row.id,
  name: row.name,
  mimeType: row.mimeType,
  size: row.size,
  sha256: row.sha256,
  uploadedAt: row.uploadedAt,
});

@Injectable()
export class VerificationService {
  private readonly storage = resolve(process.cwd(), ".private-documents");
  constructor(private readonly db: Database) {}

  private path(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new ApiFault(404, "not_found");
    return resolve(this.storage, id);
  }
  private async own(tx: Prisma.TransactionClient, ownerId: string, id: string) {
    const rows = await tx.$queryRaw<
      Property[]
    >`SELECT * FROM "Property" WHERE "id" = ${id} AND "ownerId" = ${ownerId} FOR UPDATE`;
    if (!rows[0]) throw new ApiFault(404, "not_found");
    return rows[0];
  }
  private checkVersion(row: Property, expected: number) {
    if (row.version !== expected) throw new ApiFault(409, "stale");
  }
  private editable(row: Property) {
    if (!["unverified", "rejected"].includes(verification(row).status))
      throw new ApiFault(403, "forbidden");
  }
  private async audit(
    tx: Prisma.TransactionClient,
    actorId: string,
    row: Property,
    action: string,
    nextStatus: string,
    documentIds?: string[],
  ) {
    await tx.auditEntry.create({
      data: {
        userId: actorId,
        action,
        entityType: "property",
        entityId: row.id,
        before: { version: row.version, status: verification(row).status },
        after: {
          version: row.version + 1,
          status: nextStatus,
          ...(documentIds ? { documents: documentIds } : {}),
        },
      },
    });
  }

  async upload(ownerId: string, propertyId: string, version: number, file?: UploadedDocument) {
    // Check access before writing any bytes or accepting a metadata record.
    if (
      !(await this.db.property.findFirst({
        where: { id: propertyId, ownerId },
        select: { id: true },
      }))
    )
      throw new ApiFault(404, "not_found");
    const meta = inspectDocument(file);
    const id = randomUUID();
    let written = false;
    try {
      return await this.db.$transaction(async (tx) => {
        const property = await this.own(tx, ownerId, propertyId);
        this.checkVersion(property, version);
        this.editable(property);
        if ((await tx.attachment.count({ where: { propertyId } })) >= MAX_DOCUMENTS)
          throw new ApiFault(400, "validation_error", { documents: "format" });
        await mkdir(this.storage, { recursive: true });
        await writeFile(this.path(id), file!.buffer, { flag: "wx", mode: 0o600 });
        written = true;
        const row = await tx.attachment.create({
          data: {
            id,
            propertyId,
            ...meta,
            size: file!.buffer.length,
            sha256: createHash("sha256").update(file!.buffer).digest("hex"),
          },
        });
        await tx.property.update({
          where: { id: propertyId },
          data: { version: { increment: 1 } },
        });
        await this.audit(
          tx,
          ownerId,
          property,
          "document_uploaded",
          verification(property).status,
          [id],
        );
        return { ...attachmentView(row), version: property.version + 1 };
      });
    } catch (error) {
      if (written) await unlink(this.path(id)).catch(() => {});
      throw error;
    }
  }
  async documents(ownerId: string, propertyId: string) {
    if (
      !(await this.db.property.findFirst({
        where: { id: propertyId, ownerId },
        select: { id: true },
      }))
    )
      throw new ApiFault(404, "not_found");
    return (
      await this.db.attachment.findMany({ where: { propertyId }, orderBy: { uploadedAt: "asc" } })
    ).map(attachmentView);
  }
  async remove(ownerId: string, propertyId: string, id: string, expected: number) {
    const version = await this.db.$transaction(async (tx) => {
      const property = await this.own(tx, ownerId, propertyId);
      this.checkVersion(property, expected);
      this.editable(property);
      const document = await tx.attachment.findFirst({ where: { id, propertyId } });
      if (!document) throw new ApiFault(404, "not_found");
      await tx.attachment.delete({ where: { id } });
      // A rejected request may contain this file's metadata; invalidate it when the file is removed.
      await tx.property.update({
        where: { id: propertyId },
        data: {
          verification: { status: "unverified", documents: [] },
          version: { increment: 1 },
        },
      });
      await this.audit(tx, ownerId, property, "document_removed", "unverified", [id]);
      return property.version + 1;
    });
    // If removal fails, the orphaned private bytes remain inaccessible: authorization requires a DB record.
    await unlink(this.path(id)).catch(() => {});
    return { version };
  }
  async request(ownerId: string, id: string, input: VerificationRequestDto) {
    return this.db.$transaction(async (tx) => {
      const property = await this.own(tx, ownerId, id);
      this.checkVersion(property, input.version);
      this.editable(property);
      if (input.method === "state_integration") throw new ApiFault(503, "bad_request");
      const documents = await tx.attachment.findMany({
        where: { propertyId: id, id: { in: input.documents! } },
      });
      if (!documents.length || documents.length !== input.documents!.length)
        throw new ApiFault(400, "validation_error", { documents: "format" });
      // Missing or modified bytes must not enter the review queue.
      for (const document of documents) await this.bytes(document);
      const updated = await tx.property.update({
        where: { id },
        data: {
          verification: {
            status: "pending_check",
            method: "document",
            documents: documents.map((d) => ({
              ...attachmentView(d),
              uploadedAt: d.uploadedAt.toISOString(),
            })),
            at: new Date().toISOString(),
          },
          version: { increment: 1 },
        },
      });
      await this.audit(
        tx,
        ownerId,
        property,
        "verification_requested",
        "pending_check",
        documents.map((d) => d.id),
      );
      return propertyView(updated);
    });
  }

  private async reviewer<T>(
    actor: Identity,
    work: (tx: Prisma.TransactionClient, scope: Prisma.PropertyWhereInput) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      // Shares the lock with role changes and organization blocks: recheck authority inside the operation.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${managementLock}, 0))::text`;
      const user = await tx.user.findUnique({
        where: { id: actor.user.id },
        include: { organization: { include: { territories: true } } },
      });
      const session = await tx.session.findUnique({ where: { id: actor.sessionId } });
      const org = user?.organization;
      if (
        !user ||
        user.blocked ||
        !user.roles.includes(Role.request_specialist) ||
        !org ||
        org.blocked ||
        !session ||
        session.userId !== user.id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        throw new ApiFault(403, "forbidden");
      const scope: Prisma.PropertyWhereInput = {
        ownerId: { not: user.id },
        ...(org.servesAll
          ? {}
          : { territoryId: { in: org.territories.map((t) => t.territoryId) } }),
      };
      return work(tx, scope);
    });
  }
  async queue(actor: Identity, query: RegistryQuery) {
    return this.reviewer(actor, async (tx, scope) => {
      const where: Prisma.PropertyWhereInput = {
        ...scope,
        verification: { path: ["status"], equals: "pending_check" },
      };
      const total = await tx.property.count({ where });
      const rows = await tx.property.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      return { items: rows.map(propertyView), total, page: query.page, pageSize: query.pageSize };
    });
  }
  async reviewDetails(actor: Identity, id: string) {
    return this.reviewer(actor, async (tx, scope) => {
      const property = await tx.property.findFirst({
        where: { ...scope, id, verification: { path: ["status"], equals: "pending_check" } },
      });
      if (!property) throw new ApiFault(404, "not_found");
      return propertyView(property);
    });
  }
  async decide(actor: Identity, id: string, input: VerificationDecisionDto) {
    if (input.decision === "rejected" && !input.note?.trim())
      throw new ApiFault(400, "validation_error", { note: "required" });
    return this.reviewer(actor, async (tx, scope) => {
      await tx.$queryRaw`SELECT "id" FROM "Property" WHERE "id" = ${id} FOR UPDATE`;
      const property = await tx.property.findFirst({ where: { ...scope, id } });
      if (!property) throw new ApiFault(404, "not_found");
      this.checkVersion(property, input.version);
      if (verification(property).status !== "pending_check") throw new ApiFault(403, "forbidden");
      const documentIds = verification(property).documents.map((d) => d.id);
      const documents = await tx.attachment.findMany({
        where: { propertyId: id, id: { in: documentIds } },
      });
      if (documents.length !== documentIds.length || !documents.length)
        throw new ApiFault(403, "forbidden");
      for (const document of documents) await this.bytes(document);
      const updated = await tx.property.update({
        where: { id },
        data: {
          verification: {
            ...(property.verification as Prisma.JsonObject),
            status: input.decision,
            ...(input.decision === "rejected" ? { note: input.note! } : {}),
            at: new Date().toISOString(),
          },
          version: { increment: 1 },
        },
      });
      await this.audit(
        tx,
        actor.user.id,
        property,
        "verification_decided",
        input.decision,
        documentIds,
      );
      return propertyView(updated);
    });
  }
  private async bytes(document: Attachment) {
    let buffer: Buffer;
    try {
      buffer = await readFile(this.path(document.id));
    } catch {
      throw new ApiFault(500, "internal_error");
    }
    if (
      buffer.length !== document.size ||
      createHash("sha256").update(buffer).digest("hex") !== document.sha256
    )
      throw new ApiFault(500, "internal_error");
    return buffer;
  }
  async download(ownerId: string, propertyId: string, documentId: string) {
    const document = await this.db.attachment.findFirst({
      where: { id: documentId, propertyId, property: { ownerId } },
    });
    if (!document) throw new ApiFault(404, "not_found");
    return this.file(document);
  }
  async reviewDownload(actor: Identity, propertyId: string, documentId: string) {
    return this.reviewer(actor, async (tx, scope) => {
      const property = await tx.property.findFirst({
        where: {
          ...scope,
          id: propertyId,
          verification: { path: ["status"], equals: "pending_check" },
        },
      });
      if (!property || !verification(property).documents.some((d) => d.id === documentId))
        throw new ApiFault(404, "not_found");
      const document = await tx.attachment.findFirst({ where: { id: documentId, propertyId } });
      if (!document) throw new ApiFault(404, "not_found");
      return this.file(document);
    });
  }
  private async file(document: Attachment) {
    return new StreamableFile(await this.bytes(document), {
      type: "application/octet-stream",
      length: document.size,
      disposition: `attachment; filename="${document.id}"; filename*=UTF-8''${encodeURIComponent(document.name).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16))}`,
    });
  }
}
