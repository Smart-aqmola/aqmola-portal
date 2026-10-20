import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getContentRepository } from "./data";
import { uniqueCredits } from "./domain/photo";
import type { ContentRepository } from "./domain/repository";
import type { Place, PhotoCredit } from "./domain/types";

export type PlaceCardData = {
  slug: string;
  name: string;
  summary: string;
  territoryId: string;
  territory: string;
  facts: Place["facts"];
  photo: { url: string; alt: string; credit: PhotoCredit };
};

export type PlaceData = PlaceCardData & { paragraphs: string[]; others: PlaceCardData[] };

type Deps = { catalog: CatalogRepository; content: ContentRepository };
const defaults = (): Deps => ({ catalog: getCatalogRepository(), content: getContentRepository() });

function toCard(place: Place, lang: Locale, names: Map<string, string>): PlaceCardData {
  return {
    slug: place.slug,
    name: localize(place.name, lang),
    summary: localize(place.summary, lang),
    territoryId: place.territoryId,
    territory: names.get(place.territoryId) ?? "",
    facts: place.facts,
    photo: {
      url: place.photo.url,
      alt: localize(place.photo.alt, lang),
      credit: place.photo.credit,
    },
  };
}

async function names(lang: Locale, catalog: CatalogRepository) {
  const territories = await catalog.listTerritories();
  return new Map(territories.map((item) => [item.id, localize(item.name, lang)]));
}

export async function loadPlaces(lang: Locale, { catalog, content }: Deps = defaults()) {
  const [byId, places] = await Promise.all([names(lang, catalog), content.listPlaces()]);
  return {
    places: places.map((place) => toCard(place, lang, byId)),
    credits: uniqueCredits(places.map((place) => place.photo)),
  };
}

export async function loadPlace(
  lang: Locale,
  slug: string,
  { catalog, content }: Deps = defaults(),
): Promise<PlaceData | null> {
  const place = await content.getPlace(slug);
  if (!place) return null;
  const [byId, places] = await Promise.all([names(lang, catalog), content.listPlaces()]);
  return {
    ...toCard(place, lang, byId),
    paragraphs: localize(place.description, lang)
      .split(/\n\s*\n/)
      .filter(Boolean),
    others: places
      .filter((other) => other.slug !== slug)
      .slice(0, 3)
      .map((other) => toCard(other, lang, byId)),
  };
}

export async function listPlaceSlugs(content: ContentRepository = getContentRepository()) {
  return (await content.listPlaces()).map((place) => place.slug);
}
