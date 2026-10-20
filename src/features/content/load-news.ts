import { getCatalogRepository } from "@/features/catalog/data";
import type { CatalogRepository } from "@/features/catalog/domain/repository";
import type { Locale } from "@/shared/i18n/config";
import { localize } from "@/shared/i18n/localized";
import { getContentRepository } from "./data";
import { parseNewsParams, type NewsParams } from "./domain/news-params";
import type { ContentRepository } from "./domain/repository";
import type { NewsItem, NewsTopic, PhotoCredit } from "./domain/types";

export const NEWS_PAGE_SIZE = 4;
const OTHER_NEWS = 3;

export type NewsCardData = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  topic: NewsTopic;
  views: number;
  territory?: string;
  photo: { url: string; alt: string; credit: PhotoCredit };
};

export type NewsListData = {
  params: NewsParams;
  items: NewsCardData[];
  total: number;
  page: number;
  pageCount: number;
};

export type NewsArticleData = NewsCardData & { paragraphs: string[]; other: NewsCardData[] };

type Deps = { catalog: CatalogRepository; content: ContentRepository };
const defaults = (): Deps => ({ catalog: getCatalogRepository(), content: getContentRepository() });

async function territoryNames(lang: Locale, catalog: CatalogRepository) {
  const territories = await catalog.listTerritories();
  return new Map(territories.map((item) => [item.id, localize(item.name, lang)]));
}

function toCard(item: NewsItem, lang: Locale, names: Map<string, string>): NewsCardData {
  return {
    slug: item.slug,
    date: item.date,
    title: localize(item.title, lang),
    summary: localize(item.summary, lang),
    topic: item.topic,
    views: item.views,
    territory: item.territoryId ? names.get(item.territoryId) : undefined,
    photo: {
      url: item.photo.url,
      alt: localize(item.photo.alt, lang),
      credit: item.photo.credit,
    },
  };
}

/** The news page: what the address asks for, already localized. */
export async function loadNews(
  lang: Locale,
  raw: Parameters<typeof parseNewsParams>[0],
  { catalog, content }: Deps = defaults(),
): Promise<NewsListData> {
  const params = parseNewsParams(raw);
  const [names, result] = await Promise.all([
    territoryNames(lang, catalog),
    content.searchNews({
      lang,
      q: params.q,
      topic: params.topic,
      sort: params.tab,
      page: params.page,
      pageSize: NEWS_PAGE_SIZE,
    }),
  ]);
  return {
    params: { ...params, page: result.page },
    items: result.items.map((item) => toCard(item, lang, names)),
    total: result.total,
    page: result.page,
    pageCount: result.pageCount,
  };
}

/** One article with a few other recent news, or null when there is no such news. */
export async function loadArticle(
  lang: Locale,
  slug: string,
  { catalog, content }: Deps = defaults(),
): Promise<NewsArticleData | null> {
  const item = await content.getNews(slug);
  if (!item) return null;
  const [names, recent] = await Promise.all([
    territoryNames(lang, catalog),
    content.listNews({ limit: OTHER_NEWS + 1 }),
  ]);
  return {
    ...toCard(item, lang, names),
    paragraphs: localize(item.body, lang)
      .split(/\n\s*\n/)
      .filter(Boolean),
    other: recent
      .filter((other) => other.slug !== slug)
      .slice(0, OTHER_NEWS)
      .map((other) => toCard(other, lang, names)),
  };
}

export async function listNewsSlugs(content: ContentRepository = getContentRepository()) {
  return (await content.listNews()).map((item) => item.slug);
}
