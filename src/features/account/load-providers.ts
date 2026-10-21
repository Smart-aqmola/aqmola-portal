import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { addressDirectory } from "./data/address-directory";
import type { ProviderInfo } from "./domain/availability";

/** Every provider of the region with its name in the visitor's language. */
export async function loadProviders(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<ProviderInfo[]> {
  const organizations = await catalog.listOrganizations();
  return organizations.map((organization) => ({
    id: organization.id,
    name: localize(organization.name, lang),
    sector: organization.sector,
    territories: organization.territories,
  }));
}

/** For addresses picked from the directory: which networks the place does not have. */
export function loadMissingNetworks(): Record<string, readonly Sector[]> {
  return Object.fromEntries(
    addressDirectory.flatMap((entry) => (entry.without?.length ? [[entry.id, entry.without]] : [])),
  );
}
