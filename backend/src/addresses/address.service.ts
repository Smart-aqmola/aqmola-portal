import { Injectable } from "@nestjs/common";
import { Database } from "../database";
import { AddressSearchQuery } from "./address.dto";
import { normalizeAddress } from "./normalize";

export function localized(value: unknown, lang: string): string {
  const text = value as Record<string, unknown>;
  return String(text[lang] ?? text.ru ?? "");
}
@Injectable()
export class AddressService {
  constructor(private readonly db: Database) {}
  async search(query: AddressSearchQuery) {
    const words = normalizeAddress(query.q ?? "")
      .split(" ")
      .filter(Boolean);
    if (!words.length) return [];
    const rows = await this.db.address.findMany({
      where: {
        ...(query.territoryId ? { territoryId: query.territoryId } : {}),
        AND: words.map((word) => ({ searchText: { contains: word } })),
      },
      include: { territory: { select: { name: true } } },
      orderBy: { id: "asc" },
      take: 8,
    });
    return rows.map((row) => {
      const territory = localized(row.territory.name, query.lang);
      const locality = localized(row.locality, query.lang);
      const street = localized(row.street, query.lang);
      const place =
        normalizeAddress(territory) === normalizeAddress(locality)
          ? territory
          : `${territory}, ${locality}`;
      return {
        id: row.id,
        territoryId: row.territoryId,
        locality,
        street,
        label: `${place}, ${street}`,
        without: row.without,
      };
    });
  }
}
