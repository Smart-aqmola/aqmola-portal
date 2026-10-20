import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import type { NewsItem, NewsPage, NewsSearch } from "./types";

/** Search, filter, order and cut one page out of the news. Pure, so the real API can mirror it. */
export function queryNews(
  items: readonly NewsItem[],
  { lang, q, topic, territoryId, sort, page, pageSize }: NewsSearch,
): NewsPage {
  const needle = q?.trim().toLowerCase();
  const matches = items
    .filter((item) => !territoryId || !item.territoryId || item.territoryId === territoryId)
    .filter((item) => !topic || item.topic === topic)
    .filter((item) => !needle || haystack(item, lang).includes(needle))
    .toSorted((a, b) =>
      sort === "popular"
        ? b.views - a.views || b.date.localeCompare(a.date)
        : b.date.localeCompare(a.date),
    );

  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: matches.slice((current - 1) * pageSize, current * pageSize),
    total: matches.length,
    page: current,
    pageCount,
  };
}

function haystack(item: NewsItem, lang: Locale): string {
  return `${localize(item.title, lang)} ${localize(item.summary, lang)}`.toLowerCase();
}
