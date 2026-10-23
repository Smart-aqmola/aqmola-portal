import type { Photo } from "@/features/content/domain/types";
import type { Localized } from "@/shared/i18n/localized";

export const eventGenres = [
  "concerts",
  "theatre",
  "exhibitions",
  "kids",
  "sport",
  "festivals",
  "masterclasses",
] as const;
export type EventGenre = (typeof eventGenres)[number];

export const eventAges = ["0+", "6+", "12+", "16+", "18+"] as const;
export type EventAge = (typeof eventAges)[number];

/** A place where events happen. */
export type Venue = {
  id: string;
  name: Localized;
  address: Localized;
  territoryId: string;
  photo?: Photo;
};

/** One event of the poster (as on astana.kz/events). */
export type EventItem = {
  id: string;
  slug: string;
  genre: EventGenre;
  title: Localized;
  summary: Localized;
  /** Paragraphs separated by a blank line. */
  description: Localized;
  venueId: string;
  /** Start, ISO date and time in Kazakhstan time (UTC+5), for example 2026-10-24T19:00. */
  startsAt: string;
  durationMinutes: number;
  age: EventAge;
  /** Tenge; null when the entry is free. */
  price: number | null;
  note?: Localized;
  popular: boolean;
  /** Without its own photo the card shows the venue's photo or a cover with the genre icon. */
  photo?: Photo;
};
