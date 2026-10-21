import { Injectable, NotFoundException } from "@nestjs/common";
import { Database } from "./database";
import { CatalogQuery } from "./catalog.dto";
import type { Prisma, Service } from "../generated/prisma/client";

@Injectable()
export class CatalogService {
  constructor(private readonly db: Database) {}

  territories() {
    return this.db.territory.findMany({ orderBy: { id: "asc" } });
  }
  categories() {
    return this.db.category.findMany({ orderBy: { id: "asc" } });
  }
  situations() {
    return this.db.situation.findMany({ orderBy: { id: "asc" } });
  }

  async organizations(territoryId?: string) {
    const rows = await this.db.organization.findMany({
      where: territoryId
        ? { OR: [{ servesAll: true }, { territories: { some: { territoryId } } }] }
        : {},
      include: { territories: true },
      orderBy: { id: "asc" },
    });
    return rows.map(({ servesAll, territories, ...row }) => ({
      ...row,
      territories: servesAll ? "all" : territories.map((t) => t.territoryId),
    }));
  }

  private present({ searchText: _searchText, ...row }: Service) {
    return {
      ...row,
      updatedAt: row.updatedAt.toISOString().slice(0, 10),
      fullTitle: row.fullTitle ?? undefined,
    };
  }

  async service(slug: string) {
    const row = await this.db.service.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException("SERVICE_NOT_FOUND");
    return this.present(row);
  }

  async search(query: CatalogQuery) {
    const where: Prisma.ServiceWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.situationId ? { situationId: query.situationId } : {}),
      ...(query.audience ? { audiences: { has: query.audience } } : {}),
      ...(query.popular === "true" ? { popular: true } : {}),
      ...(query.territoryId
        ? {
            organization: {
              OR: [
                { servesAll: true },
                { territories: { some: { territoryId: query.territoryId } } },
              ],
            },
          }
        : {}),
      AND: (
        query.q?.trim().toLocaleLowerCase().replaceAll("ё", "е").split(/\s+/).filter(Boolean) ?? []
      ).map((word) => ({ searchText: { contains: word } })),
    };
    const [total, rows] = await this.db.$transaction(
      [
        this.db.service.count({ where }),
        this.db.service.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy:
            query.sort === "popular" ? [{ popular: "desc" }, { code: "asc" }] : { code: "asc" },
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return {
      items: rows.map((row) => this.present(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: Math.ceil(total / query.pageSize),
    };
  }
}
