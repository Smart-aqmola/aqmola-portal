import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getCatalogRepository } from "./data";
import type { CatalogRepository } from "./domain/repository";
import type { Sector } from "./domain/types";

export type OrganizationEntry = {
  id: string;
  name: string;
  /** "all" when the organization works across the whole region, else the territory names. */
  area: "all" | string[];
  services: number;
};

export type OrganizationGroup = {
  sector: Sector;
  name: string;
  items: OrganizationEntry[];
};

/** Organizations of the region by field of work, with where each works (spec 1.1, 4.3). */
export async function loadOrganizations(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<OrganizationGroup[]> {
  const [organizations, territories, categories] = await Promise.all([
    catalog.listOrganizations(),
    catalog.listTerritories(),
    catalog.listCategories(),
  ]);
  const territoryName = new Map(
    territories.map((territory) => [territory.id, localize(territory.name, lang)]),
  );

  const entries = await Promise.all(
    organizations.map(async (organization) => {
      const page = await catalog.searchServices({
        lang,
        organizationId: organization.id,
        pageSize: 1,
      });
      const entry: OrganizationEntry = {
        id: organization.id,
        name: localize(organization.name, lang),
        area:
          organization.territories === "all"
            ? "all"
            : organization.territories.map((id) => territoryName.get(id) ?? id),
        services: page.total,
      };
      return { sector: organization.sector, entry };
    }),
  );

  return categories
    .map((category) => ({
      sector: category.id,
      name: localize(category.name, lang),
      items: entries.filter((item) => item.sector === category.id).map((item) => item.entry),
    }))
    .filter((group) => group.items.length > 0);
}
