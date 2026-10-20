import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getCatalogRepository } from "./data";
import {
  parseCatalogParams,
  toServiceQuery,
  type CatalogParams,
  type RawParams,
} from "./domain/catalog-params";
import type { CatalogRepository } from "./domain/repository";
import type { Sector, SituationId } from "./domain/types";
import { toServiceCardData, type ServiceCardData } from "./ui/service-card-data";

export const CATALOG_PAGE_SIZE = 12;

type Named<Id extends string = string> = { id: Id; name: string };

export type CatalogData = {
  params: CatalogParams;
  cards: ServiceCardData[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  /** Every category with the number of services it would show under the other filters. */
  categories: (Named<Sector> & { count: number })[];
  situations: Named<SituationId>[];
  organizations: Named[];
  territories: Named[];
};

/** Everything the catalog page shows for one address. Runs on the server. */
export async function loadCatalog(
  lang: Locale,
  raw: RawParams,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<CatalogData> {
  const [territories, situations, categories, everyOrganization] = await Promise.all([
    catalog.listTerritories(),
    catalog.listSituations(),
    catalog.listCategories(),
    catalog.listOrganizations(),
  ]);

  const params = parseCatalogParams(raw, {
    territories: new Set(territories.map((territory) => territory.id)),
    organizations: new Set(everyOrganization.map((organization) => organization.id)),
  });

  const organizations = await catalog.listOrganizations(params.territory);
  const organizationName = new Map(
    everyOrganization.map((organization) => [organization.id, localize(organization.name, lang)]),
  );

  const [page, counts] = await Promise.all([
    catalog.searchServices(toServiceQuery(params, lang, CATALOG_PAGE_SIZE)),
    // One query per category, so every chip counts exactly what clicking it would show.
    Promise.all(
      categories.map(async (category) => {
        const result = await catalog.searchServices({
          ...toServiceQuery({ ...params, page: 1 }, lang, 1),
          categoryId: category.id,
        });
        return result.total;
      }),
    ),
  ]);

  return {
    params: { ...params, page: page.page },
    cards: page.items.map((service) =>
      toServiceCardData(service, organizationName.get(service.organizationId) ?? "", lang),
    ),
    total: page.total,
    page: page.page,
    pageCount: page.pageCount,
    pageSize: page.pageSize,
    categories: categories.map((category, index) => ({
      id: category.id,
      name: localize(category.name, lang),
      count: counts[index],
    })),
    situations: situations.map((situation) => ({
      id: situation.id,
      name: localize(situation.name, lang),
    })),
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: localize(organization.name, lang),
    })),
    territories: territories.map((territory) => ({
      id: territory.id,
      name: localize(territory.name, lang),
    })),
  };
}
