import type { Locale } from "@/shared/i18n/config";
import type { Localized } from "@/shared/i18n/localized";

/** Who made a photo and under which licence; the site must show this next to the picture. */
export type PhotoCredit = {
  author: string;
  license: string;
  sourceUrl: string;
};

export type Photo = {
  url: string;
  alt: Localized;
  credit: PhotoCredit;
};

export const newsTopics = ["utilities", "services", "city"] as const;
export type NewsTopic = (typeof newsTopics)[number];

export type NewsItem = {
  id: string;
  slug: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  /** Empty when the news concerns the whole region. */
  territoryId?: string;
  title: Localized;
  summary: Localized;
  /** Paragraphs separated by a blank line. */
  body: Localized;
  topic: NewsTopic;
  /** How many times it was read; drives the "popular" tab. */
  views: number;
  photo: Photo;
};

export type PlaceFact = "nature" | "lake" | "reserve" | "museum" | "city" | "rest";

export type Place = {
  id: string;
  slug: string;
  territoryId: string;
  name: Localized;
  summary: Localized;
  /** Paragraphs separated by a blank line. */
  description: Localized;
  facts: readonly PlaceFact[];
  photo: Photo;
};

/** A section of the portal that is announced but not built yet. */
export type ComingSoonItem = {
  id: string;
  title: Localized;
  summary: Localized;
};

export type NewsSearch = {
  lang: Locale;
  q?: string;
  topic?: NewsTopic;
  territoryId?: string;
  sort: "latest" | "popular";
  page: number;
  pageSize: number;
};

export type NewsPage = { items: NewsItem[]; total: number; page: number; pageCount: number };

export type NewsQuery = {
  limit?: number;
  territoryId?: string;
};
