import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { addressDirectory } from "./data/address-directory";
import type { AddressSuggestion } from "./domain/address-search";

/** The whole test directory named in the visitor's language, ready for the search field. */
export async function loadAddressSuggestions(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<AddressSuggestion[]> {
  const territories = await catalog.listTerritories();
  const names = new Map(territories.map((item) => [item.id, localize(item.name, lang)]));

  return addressDirectory.flatMap((entry) => {
    const territory = names.get(entry.territoryId);
    if (!territory) return [];
    const locality = localize(entry.locality, lang);
    const street = localize(entry.street, lang);
    const place = locality === territory ? territory : `${territory}, ${locality}`;
    return [
      {
        id: entry.id,
        territoryId: entry.territoryId,
        locality,
        street,
        label: `${place}, ${street}`,
        without: entry.without ?? [],
      },
    ];
  });
}
