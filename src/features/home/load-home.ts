import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { SituationId } from "@/features/catalog/domain/types";
import { toServiceCardData, type ServiceCardData } from "@/features/catalog/ui/service-card-data";
import { HOME_UTILITY_SLUGS } from "./domain/home-content";
import { getContentRepository } from "@/features/content/data";
import { photoAt, uniqueCredits } from "@/features/content/domain/photo";
import type { ContentRepository } from "@/features/content/domain/repository";
import type { Photo, PhotoCredit } from "@/features/content/domain/types";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";

const SERVICES_PER_SITUATION = 3;
const NEWS_ON_HOME = 3;

/** A photo with its texts already in the visitor's language. */
export type HomePhoto = { url: string; alt: string; credit: PhotoCredit };

export type SituationGroup = {
  id: SituationId;
  name: string;
  summary: string;
  /** All services of this situation, not only the cards shown. */
  count: number;
  services: ServiceCardData[];
};

export type HomeNews = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  territory?: string;
  photo: HomePhoto;
};

export type HomeData = {
  hero: HomePhoto;
  territories: { id: string; name: string }[];
  situations: SituationGroup[];
  /** The utility services of the specification (1.2), in the order they are shown. */
  utilityServices: ServiceCardData[];
  news: HomeNews[];
  comingSoon: { id: string; title: string; summary: string }[];
  credits: PhotoCredit[];
};

type Deps = { catalog: CatalogRepository; content: ContentRepository };

function toPhoto(photo: Photo, lang: Locale): HomePhoto {
  return { url: photo.url, alt: localize(photo.alt, lang), credit: photo.credit };
}

/** Collect and localize everything the home page shows. Runs on the server. */
export async function loadHome(
  lang: Locale,
  deps: Deps = { catalog: getCatalogRepository(), content: getContentRepository() },
): Promise<HomeData> {
  const { catalog, content } = deps;

  const [situations, territories, organizations, counts, news, comingSoon, heroPlace] =
    await Promise.all([
      catalog.listSituations(),
      catalog.listTerritories(),
      catalog.listOrganizations(),
      catalog.countServicesBySituation(),
      content.listNews({ limit: NEWS_ON_HOME }),
      content.listComingSoon(),
      content.getPlace("burabay"),
    ]);

  const organizationName = new Map(
    organizations.map((organization) => [organization.id, localize(organization.name, lang)]),
  );
  const territoryName = new Map(
    territories.map((territory) => [territory.id, localize(territory.name, lang)]),
  );

  const groups = await Promise.all(
    situations.map(async (situation): Promise<SituationGroup> => {
      const page = await catalog.searchServices({
        lang,
        situationId: situation.id,
        sort: "popular",
        pageSize: SERVICES_PER_SITUATION,
      });
      return {
        id: situation.id,
        name: localize(situation.name, lang),
        summary: localize(situation.summary, lang),
        count: counts[situation.id],
        services: page.items.map((service) =>
          toServiceCardData(service, organizationName.get(service.organizationId) ?? "", lang),
        ),
      };
    }),
  );

  const utilityServices = (
    await Promise.all(HOME_UTILITY_SLUGS.map((slug) => catalog.getService(slug)))
  ).flatMap((service) =>
    service
      ? [toServiceCardData(service, organizationName.get(service.organizationId) ?? "", lang)]
      : [],
  );

  if (!heroPlace) throw new Error("The home page needs the 'burabay' place for its hero photo");

  return {
    hero: toPhoto(photoAt(heroPlace.photo, 1920), lang),
    territories: territories.map((territory) => ({
      id: territory.id,
      name: localize(territory.name, lang),
    })),
    situations: groups,
    utilityServices,
    news: news.map((item) => ({
      slug: item.slug,
      date: item.date,
      title: localize(item.title, lang),
      summary: localize(item.summary, lang),
      territory: item.territoryId ? territoryName.get(item.territoryId) : undefined,
      photo: toPhoto(photoAt(item.photo, 330), lang),
    })),
    comingSoon: comingSoon.map((item) => ({
      id: item.id,
      title: localize(item.title, lang),
      summary: localize(item.summary, lang),
    })),
    credits: uniqueCredits([heroPlace.photo, ...news.map((item) => item.photo)]),
  };
}
