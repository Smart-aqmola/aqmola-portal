import { getCatalogRepository } from "@/features/catalog/data";
import { getContentRepository } from "@/features/content/data";
import { loadPoster, type EventCardData } from "@/features/events/load-events";
import { loadSurveys, type SurveyCardData } from "@/features/surveys/load-surveys";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { ratesFor, weatherFor, type Currency, type WeatherKind } from "./domain/signals";

type Picture = { url: string; alt: string };
type Credit = { author: string; license: string; sourceUrl: string };

export type MyRegionData = {
  today: string;
  weather: { temperature: number; kind: WeatherKind };
  rates: Record<Currency, number>;
  photos: (Picture & { name: string })[];
  event?: EventCardData;
  events: EventCardData[];
  news: { slug: string; title: string; summary: string; date: string; photo: Picture }[];
  survey?: SurveyCardData;
  openSurveys: number;
  services: { slug: string; title: string; summary: string }[];
  credits: Credit[];
};

/** Today in Kazakhstan (UTC+5), yyyy-mm-dd. */
const todayIn = (now: Date) =>
  new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** The "My region" panel (after astana.kz/my-city): one screen of what matters today. */
export async function loadMyRegion(lang: Locale, now: Date): Promise<MyRegionData> {
  const content = getContentRepository();
  const [places, news, poster, surveys, services] = await Promise.all([
    content.listPlaces(),
    content.listNews({ limit: 3 }),
    loadPoster(lang, {}, now),
    loadSurveys(lang, {}, now),
    getCatalogRepository().searchServices({ lang, popular: true, pageSize: 2 }),
  ]);
  const today = todayIn(now);
  // A different place opens the "photo of the day" each day.
  const shift = Number(today.slice(8, 10)) % places.length;
  const ordered = [...places.slice(shift), ...places.slice(0, shift)].slice(0, 3);
  const credits = new Map<string, Credit>();
  for (const photo of [...ordered.map((place) => place.photo), ...news.map((item) => item.photo)]) {
    credits.set(photo.credit.sourceUrl, photo.credit);
  }

  return {
    today,
    weather: weatherFor(today),
    rates: ratesFor(today),
    photos: ordered.map((place) => ({
      url: place.photo.url,
      alt: localize(place.photo.alt, lang),
      name: localize(place.name, lang),
    })),
    ...(poster.popular[0] ? { event: poster.popular[0] } : {}),
    events: poster.all.slice(0, 3),
    news: news.map((item) => ({
      slug: item.slug,
      title: localize(item.title, lang),
      summary: localize(item.summary, lang),
      date: item.date,
      photo: { url: item.photo.url, alt: localize(item.photo.alt, lang) },
    })),
    ...(surveys.open[0] ? { survey: surveys.popular[0] ?? surveys.open[0] } : {}),
    openSurveys: surveys.open.length,
    services: services.items.map((service) => ({
      slug: service.slug,
      title: localize(service.title, lang),
      summary: localize(service.summary, lang),
    })),
    credits: [...credits.values()],
  };
}
