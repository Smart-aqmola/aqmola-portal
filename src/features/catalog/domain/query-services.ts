import { localize } from "@/shared/i18n/localized";
import { matchesQuery, paginate } from "./search";
import {
  sectors,
  situationIds,
  type Organization,
  type Page,
  type Sector,
  type Service,
  type ServiceQuery,
  type SituationId,
  type Territory,
} from "./types";

export type CatalogData = {
  territories: readonly Territory[];
  organizations: readonly Organization[];
  services: readonly Service[];
};

export const DEFAULT_PAGE_SIZE = 12;

export function organizationServes(organization: Organization, territoryId: string): boolean {
  return organization.territories === "all" || organization.territories.includes(territoryId);
}

function servicesInTerritory(data: CatalogData, territoryId?: string): Service[] {
  if (!territoryId) return [...data.services];
  const organizations = new Map(data.organizations.map((org) => [org.id, org]));
  return data.services.filter((service) => {
    const organization = organizations.get(service.organizationId);
    return organization !== undefined && organizationServes(organization, territoryId);
  });
}

/** Filter, search and paginate services. Title matches rank above summary/organization matches. */
export function queryServices(data: CatalogData, query: ServiceQuery): Page<Service> {
  const organizations = new Map(data.organizations.map((org) => [org.id, org]));
  const { lang, q = "" } = query;

  const matches = servicesInTerritory(data, query.territoryId)
    .filter((service) => !query.situationId || service.situationId === query.situationId)
    .filter((service) => !query.categoryId || service.categoryId === query.categoryId)
    .filter((service) => !query.audience || service.audiences.includes(query.audience))
    .filter((service) => !query.organizationId || service.organizationId === query.organizationId)
    .filter((service) => !query.popular || service.popular)
    .map((service) => {
      // The code is searched together with the title, so a typed number ranks first.
      const title = `${localize(service.title, lang)} ${service.code}`;
      const other = [
        localize(service.summary, lang),
        organizations.has(service.organizationId)
          ? localize(organizations.get(service.organizationId)!.name, lang)
          : "",
      ].join(" ");
      const inTitle = matchesQuery(title, q);
      const inAnything = inTitle || matchesQuery(`${title} ${other}`, q);
      return { service, inAnything, score: q.trim() === "" ? 0 : inTitle ? 2 : 1 };
    })
    .filter((entry) => entry.inAnything);

  // Array.prototype.sort is stable, so equal scores keep the order of the data.
  matches.sort(
    (a, b) =>
      b.score - a.score ||
      (query.sort === "popular" ? Number(b.service.popular) - Number(a.service.popular) : 0),
  );

  return paginate(
    matches.map((entry) => entry.service),
    query.page ?? 1,
    query.pageSize ?? DEFAULT_PAGE_SIZE,
  );
}

export function countBySituation(
  data: CatalogData,
  territoryId?: string,
): Record<SituationId, number> {
  const counts = Object.fromEntries(situationIds.map((id) => [id, 0])) as Record<
    SituationId,
    number
  >;
  for (const service of servicesInTerritory(data, territoryId)) counts[service.situationId] += 1;
  return counts;
}

export function countByCategory(data: CatalogData, territoryId?: string): Record<Sector, number> {
  const counts = Object.fromEntries(sectors.map((id) => [id, 0])) as Record<Sector, number>;
  for (const service of servicesInTerritory(data, territoryId)) counts[service.categoryId] += 1;
  return counts;
}
