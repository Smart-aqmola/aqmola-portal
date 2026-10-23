import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getCatalogRepository } from "./data";
import type { CatalogRepository } from "./domain/repository";
import { situationIds, type Sector, type SituationId } from "./domain/types";
import { toServiceCardData, type ServiceCardData } from "./ui/service-card-data";

export type SituationSummary = { id: SituationId; name: string; summary: string; count: number };

export type SituationDetails = {
  id: SituationId;
  name: string;
  summary: string;
  cards: ServiceCardData[];
  /** Only the categories that have services in this situation, the biggest first. */
  categories: { id: Sector; name: string; count: number }[];
  others: SituationSummary[];
};

export function isSituationId(value: string): value is SituationId {
  return (situationIds as readonly string[]).includes(value);
}

/** Every life situation with the number of its services, for the index page and the tiles. */
export async function loadSituations(
  lang: Locale,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<SituationSummary[]> {
  const [situations, counts] = await Promise.all([
    catalog.listSituations(),
    catalog.countServicesBySituation(),
  ]);
  return situations.map((item) => ({
    id: item.id,
    name: localize(item.name, lang),
    summary: localize(item.summary, lang),
    count: counts[item.id] ?? 0,
  }));
}

/** The page of one life situation (as on astana.kz): its services by category and the others. */
export async function loadSituation(
  lang: Locale,
  id: string,
  catalog: CatalogRepository = getCatalogRepository(),
): Promise<SituationDetails | null> {
  if (!isSituationId(id)) return null;
  const [all, categories, organizations, services] = await Promise.all([
    loadSituations(lang, catalog),
    catalog.listCategories(),
    catalog.listOrganizations(),
    catalog.searchServices({ lang, situationId: id, pageSize: 1000 }),
  ]);
  const current = all.find((item) => item.id === id);
  if (!current) return null;

  const organizationName = new Map(
    organizations.map((item) => [item.id, localize(item.name, lang)]),
  );
  const cards = services.items.map((service) =>
    toServiceCardData(service, organizationName.get(service.organizationId) ?? "", lang),
  );
  const counted = categories
    .map((category) => ({
      id: category.id,
      name: localize(category.name, lang),
      count: cards.filter((card) => card.categoryId === category.id).length,
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    id: current.id,
    name: current.name,
    summary: current.summary,
    cards,
    categories: counted,
    others: all.filter((item) => item.id !== id),
  };
}
