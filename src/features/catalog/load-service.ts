import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getCatalogRepository } from "./data";
import type { CatalogRepository } from "./domain/repository";
import type { Sector, SituationId } from "./domain/types";
import { documentsFor, stepsFor, type DocumentKey, type StepKey } from "./domain/service-details";
import { toServiceCardData, type ServiceCardData } from "./ui/service-card-data";

const RELATED_COUNT = 3;

export type ServiceArea = { kind: "region" } | { kind: "territories"; names: string[] };

export type ServiceDetails = {
  card: ServiceCardData;
  organizationId: string;
  code: string;
  fullTitle?: string;
  updatedAt: string;
  situation: { id: SituationId; name: string };
  category: { id: Sector; name: string };
  steps: StepKey[];
  documents: DocumentKey[];
  area: ServiceArea;
  related: ServiceCardData[];
};

/** Slugs of all services, for building every service page in advance. */
export async function listServiceSlugs(
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<string[]> {
  const page = await catalog.searchServices({ lang: "ru", pageSize: 1000 });
  return page.items.map((service) => service.slug);
}

/** Everything the page of one service shows, or null when there is no such service. */
export async function loadService(
  lang: Locale,
  slug: string,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<ServiceDetails | null> {
  const service = await catalog.getService(slug);
  if (!service) return null;

  const [organizations, territories, situations, categories, sameSituation] = await Promise.all([
    catalog.listOrganizations(),
    catalog.listTerritories(),
    catalog.listSituations(),
    catalog.listCategories(),
    catalog.searchServices({
      lang,
      situationId: service.situationId,
      audience: service.audiences[0],
      sort: "popular",
      pageSize: 100,
    }),
  ]);

  const organization = organizations.find((item) => item.id === service.organizationId);
  const organizationName = new Map(
    organizations.map((item) => [item.id, localize(item.name, lang)]),
  );
  const situation = situations.find((item) => item.id === service.situationId);
  const category = categories.find((item) => item.id === service.categoryId);
  if (!organization || !situation || !category) {
    throw new Error(`Service ${slug} points at data that does not exist`);
  }

  const area: ServiceArea =
    organization.territories === "all"
      ? { kind: "region" }
      : {
          kind: "territories",
          names: territories
            .filter((territory) => organization.territories.includes(territory.id))
            .map((territory) => localize(territory.name, lang)),
        };

  return {
    card: toServiceCardData(service, localize(organization.name, lang), lang),
    organizationId: organization.id,
    code: service.code,
    fullTitle: service.fullTitle ? localize(service.fullTitle, lang) : undefined,
    updatedAt: service.updatedAt,
    situation: { id: situation.id, name: localize(situation.name, lang) },
    category: { id: category.id, name: localize(category.name, lang) },
    steps: stepsFor(service),
    documents: documentsFor(service),
    area,
    related: sameSituation.items
      .filter((other) => other.slug !== slug)
      .slice(0, RELATED_COUNT)
      .map((other) =>
        toServiceCardData(other, organizationName.get(other.organizationId) ?? "", lang),
      ),
  };
}
