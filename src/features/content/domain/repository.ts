import type { ComingSoonItem, NewsItem, NewsPage, NewsQuery, NewsSearch, Place } from "./types";

/** News, places and announcements. Implemented by test data now and by an API later. */
export interface ContentRepository {
  /** Newest first. With a territory, returns that territory's news plus region-wide news. */
  listNews(query?: NewsQuery): Promise<NewsItem[]>;
  /** Search, topic, tab and paging for the news page. */
  searchNews(search: NewsSearch): Promise<NewsPage>;
  getNews(slug: string): Promise<NewsItem | null>;
  listPlaces(): Promise<Place[]>;
  getPlace(slug: string): Promise<Place | null>;
  listComingSoon(): Promise<ComingSoonItem[]>;
}
