import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";

/** Cities and districts for the "where" select, named in the visitor's language. */
export async function loadTerritoryOptions(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<{ id: string; name: string }[]> {
  const territories = await catalog.listTerritories();
  return territories.map((item) => ({ id: item.id, name: localize(item.name, lang) }));
}

/** Organizations for the operator sign-in, named in the visitor's language. */
export async function loadOrganizationOptions(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<{ id: string; name: string }[]> {
  const organizations = await catalog.listOrganizations();
  return organizations.map((item) => ({ id: item.id, name: localize(item.name, lang) }));
}
