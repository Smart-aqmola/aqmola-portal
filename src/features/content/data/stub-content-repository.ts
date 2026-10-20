import type { ContentRepository } from "../domain/repository";
import { queryNews } from "../domain/query-news";
import type { ComingSoonItem, NewsItem, NewsQuery, NewsSearch, Place } from "../domain/types";
import { comingSoon } from "./coming-soon";
import { news } from "./news";
import { places } from "./places";

/** Serves news, places and announcements from local test data. */
export class StubContentRepository implements ContentRepository {
  constructor(
    private readonly newsItems: readonly NewsItem[] = news,
    private readonly placeItems: readonly Place[] = places,
    private readonly announcements: readonly ComingSoonItem[] = comingSoon,
  ) {}

  async listNews({ limit, territoryId }: NewsQuery = {}) {
    const items = this.newsItems
      .filter((item) => !territoryId || !item.territoryId || item.territoryId === territoryId)
      .toSorted((a, b) => b.date.localeCompare(a.date));
    return limit === undefined ? items : items.slice(0, limit);
  }

  async searchNews(search: NewsSearch) {
    return queryNews(this.newsItems, search);
  }

  async getNews(slug: string) {
    return this.newsItems.find((item) => item.slug === slug) ?? null;
  }

  async listPlaces() {
    return [...this.placeItems];
  }

  async getPlace(slug: string) {
    return this.placeItems.find((item) => item.slug === slug) ?? null;
  }

  async listComingSoon() {
    return [...this.announcements];
  }
}
