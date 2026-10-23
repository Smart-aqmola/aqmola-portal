import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getEventRepository } from "./data";
import {
  filterEvents,
  onWeekend,
  relatedEvents,
  upcoming,
  type EventFilter,
} from "./domain/events";
import type { EventRepository } from "./domain/repository";
import {
  eventGenres,
  type EventAge,
  type EventGenre,
  type EventItem,
  type Venue,
} from "./domain/types";

/** What a card of the poster shows, already in the visitor's language. */
export type EventCardData = {
  slug: string;
  genre: EventGenre;
  title: string;
  summary: string;
  startsAt: string;
  age: EventAge;
  price: number | null;
  venue: string;
  photo?: { url: string; alt: string };
};

export type VenueData = {
  id: string;
  name: string;
  address: string;
  photo?: { url: string; alt: string };
};

function venueData(venue: Venue, lang: Locale): VenueData {
  return {
    id: venue.id,
    name: localize(venue.name, lang),
    address: localize(venue.address, lang),
    ...(venue.photo
      ? { photo: { url: venue.photo.url, alt: localize(venue.photo.alt, lang) } }
      : {}),
  };
}

function cardData(event: EventItem, venues: Map<string, Venue>, lang: Locale): EventCardData {
  const venue = venues.get(event.venueId);
  const photo = event.photo ?? venue?.photo;
  return {
    slug: event.slug,
    genre: event.genre,
    title: localize(event.title, lang),
    summary: localize(event.summary, lang),
    startsAt: event.startsAt,
    age: event.age,
    price: event.price,
    venue: venue ? localize(venue.name, lang) : "",
    ...(photo ? { photo: { url: photo.url, alt: localize(photo.alt, lang) } } : {}),
  };
}

export type PosterParams = { genre?: EventGenre; venueId?: string };

export function parsePosterParams(
  raw: Record<string, string | string[] | undefined>,
  venueIds: readonly string[],
): PosterParams {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const genre = eventGenres.find((item) => item === first(raw.genre));
  const venueId = venueIds.find((item) => item === first(raw.venue));
  return { ...(genre ? { genre } : {}), ...(venueId ? { venueId } : {}) };
}

export type PosterData = {
  params: PosterParams;
  venues: VenueData[];
  /** With a genre or a venue chosen: the matching events. */
  filtered?: EventCardData[];
  popular: EventCardData[];
  weekend: EventCardData[];
  free: EventCardData[];
  all: EventCardData[];
  credits: { author: string; license: string; sourceUrl: string }[];
};

/** Everything the poster page shows; `now` decides what is upcoming and which weekend is next. */
export async function loadPoster(
  lang: Locale,
  raw: Record<string, string | string[] | undefined>,
  now: Date,
  repository: EventRepository = getEventRepository(),
): Promise<PosterData> {
  const [events, venueList] = await Promise.all([
    repository.listEvents(now),
    repository.listVenues(),
  ]);
  const venues = new Map(venueList.map((venue) => [venue.id, venue]));
  const params = parsePosterParams(
    raw,
    venueList.map((venue) => venue.id),
  );
  const next = upcoming(events, now);
  const cards = (list: EventItem[]) => list.map((event) => cardData(event, venues, lang));
  const filter: EventFilter = params;
  const credits = new Map(
    [
      ...next.map((event) => event.photo ?? venues.get(event.venueId)?.photo),
      ...venueList.map((v) => v.photo),
    ]
      .filter((photo) => photo !== undefined)
      .map((photo) => [photo.credit.sourceUrl, photo.credit]),
  );

  return {
    params,
    venues: venueList.map((venue) => venueData(venue, lang)),
    ...(params.genre || params.venueId ? { filtered: cards(filterEvents(next, filter)) } : {}),
    popular: cards(next.filter((event) => event.popular)),
    weekend: cards(onWeekend(next, now)),
    free: cards(filterEvents(next, { free: true })),
    all: cards(next),
    credits: [...credits.values()],
  };
}

export type EventDetails = {
  card: EventCardData;
  id: string;
  durationMinutes: number;
  paragraphs: string[];
  note?: string;
  venue: VenueData;
  related: EventCardData[];
  credit?: { author: string; license: string; sourceUrl: string };
};

/** The page of one event, or null when there is no such event. */
export async function loadEvent(
  lang: Locale,
  slug: string,
  now: Date,
  repository: EventRepository = getEventRepository(),
): Promise<EventDetails | null> {
  const [event, events, venueList] = await Promise.all([
    repository.getEvent(slug, now),
    repository.listEvents(now),
    repository.listVenues(),
  ]);
  if (!event) return null;
  const venues = new Map(venueList.map((venue) => [venue.id, venue]));
  const venue = venues.get(event.venueId);
  if (!venue) return null;
  const photo = event.photo ?? venue.photo;
  return {
    card: cardData(event, venues, lang),
    id: event.id,
    durationMinutes: event.durationMinutes,
    paragraphs: localize(event.description, lang).split(/\n\s*\n/),
    ...(event.note ? { note: localize(event.note, lang) } : {}),
    venue: venueData(venue, lang),
    related: relatedEvents(upcoming(events, now), event, 3).map((item) =>
      cardData(item, venues, lang),
    ),
    ...(photo ? { credit: photo.credit } : {}),
  };
}

/** Slugs of all events, for building their pages in advance. */
export async function listEventSlugs(repository: EventRepository = getEventRepository()) {
  return (await repository.listEvents(new Date(0))).map((event) => event.slug);
}
